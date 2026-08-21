// Le cœur de la simulation hors thread principal.
//
// Cette classe ne connaît ni Worker, ni self, ni postMessage : elle reçoit des
// commandes, émet des événements, et lit l'heure à travers une horloge
// injectée. C'est ce qui la rend testable sous Node sans navigateur — et la
// raison pour laquelle toute la logique délicate (cadence, rattrapage,
// publication des trames) vit ici plutôt que dans l'adaptateur.

import { Board, Life, LIFE, parseRule, type Rule } from '@zp/engine';
import { decodeRle, encodeRle } from '@zp/codecs';

import {
  CTRL_FRAME,
  CTRL_POPULATION,
  CTRL_RUNNING,
  CTRL_WORDS,
  FRAME_COUNT,
  controlView,
  frameView,
  sharedBufferBytes,
  writeGeneration,
  type FrameIndex,
  type SimCommand,
  type SimEvent,
} from './protocol.ts';

interface HistoryEntry {
  bits: Uint32Array;
  generation: number;
}

/**
 * L'historique ne retient que les *modifications* — trait, motif déposé,
 * vidage, soupe. Faire tourner la simulation n'est pas annulable : on ne
 * remonte pas le temps d'un automate, et l'état est de toute façon
 * reproductible depuis le dernier point d'histoire. « Annuler » revient donc
 * sur la dernière chose que l'utilisateur a *faite*, ce qui est ce qu'il
 * attend.
 */
const MAX_HISTORY_ENTRIES = 40;
const MAX_HISTORY_BYTES = 64 * 1024 * 1024;

/** Horloge injectable — `performance.now` + `setTimeout` dans le worker. */
export interface Clock {
  now(): number;
  setTimer(callback: () => void, ms: number): number;
  clearTimer(handle: number): void;
}

export interface SimulationOptions {
  clock: Clock;
  emit(event: SimEvent, transfer?: ArrayBufferLike[]): void;
  /**
   * Temps maximal passé à simuler par réveil. Au-delà, on rend la main pour
   * que le worker traite ses messages : mieux vaut une simulation qui prend du
   * retard qu'un worker qui ne répond plus au bouton « stop ».
   */
  budgetMs?: number;
  /** Cadence maximale de publication des trames. */
  maxFramesPerSecond?: number;
}

export class Simulation {
  #clock: Clock;
  #emit: (event: SimEvent, transfer?: ArrayBufferLike[]) => void;
  #budgetMs: number;
  #minPublishIntervalMs: number;

  #life: Life | null = null;
  #rule: Rule = LIFE;

  #shared: SharedArrayBuffer | null = null;
  #control: Int32Array | null = null;
  #wordsPerFrame = 0;
  /** Trame dans laquelle on écrira la prochaine publication. */
  #backFrame: FrameIndex = 0;

  #undoStack: HistoryEntry[] = [];
  #redoStack: HistoryEntry[] = [];
  #historyBytes = 0;

  #running = false;
  #gps = 10;
  #timer: number | null = null;
  #lastTick = 0;
  #pendingGenerations = 0;
  #lastPublish = 0;

  constructor(options: SimulationOptions) {
    this.#clock = options.clock;
    this.#emit = options.emit;
    this.#budgetMs = options.budgetMs ?? 12;
    this.#minPublishIntervalMs = 1000 / (options.maxFramesPerSecond ?? 60);
  }

  get running(): boolean {
    return this.#running;
  }

  get generation(): number {
    return this.#life?.generation ?? 0;
  }

  get board(): Board | null {
    return this.#life?.board ?? null;
  }

  handle(command: SimCommand): void {
    try {
      this.#dispatch(command);
    } catch (error) {
      this.#emit({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  #dispatch(command: SimCommand): void {
    switch (command.type) {
      case 'init':
        this.#init(command);
        return;

      case 'start':
        this.#requireLife();
        this.#gps = clampSpeed(command.generationsPerSecond);
        if (!this.#running) {
          this.#running = true;
          this.#lastTick = this.#clock.now();
          this.#pendingGenerations = 0;
          this.#setRunningFlag(true);
          this.#scheduleTick();
        }
        this.#emitStats();
        return;

      case 'stop':
        this.#halt();
        this.#publish(true);
        this.#emitStats();
        return;

      case 'setSpeed':
        this.#gps = clampSpeed(command.generationsPerSecond);
        return;

      case 'step': {
        const life = this.#requireLife();
        const count = Math.max(1, Math.min(command.count ?? 1, 100_000));
        this.#halt();
        life.run(count);
        this.#publish(true);
        this.#emitStats();
        return;
      }

      case 'setRule': {
        const life = this.#requireLife();
        this.#rule = parseRule(command.rule);
        // Life fige la règle à la construction : on reconstruit autour de la
        // même grille, sans perdre l'état ni la génération courante.
        const rebuilt = new Life(life.board, this.#rule);
        rebuilt.generation = life.generation;
        this.#life = rebuilt;
        this.#publish(true);
        this.#emitStats();
        return;
      }

      case 'setCells': {
        const life = this.#requireLife();
        for (const [x, y] of command.cells) life.board.set(x, y, command.alive);
        this.#publish(true);
        this.#emitStats();
        return;
      }

      case 'stamp': {
        const life = this.#requireLife();
        // Le motif est décodé avant le point d'histoire : un RLE invalide ne
        // doit pas laisser une entrée d'annulation derrière lui.
        const pattern = decodeRle(command.rle);
        this.#pushHistory();
        life.board.stamp(pattern.cells, command.x, command.y);
        this.#publish(true);
        this.#emitStats();
        this.#emitHistory();
        return;
      }

      case 'clear': {
        const life = this.#requireLife();
        this.#pushHistory();
        life.board.clear();
        life.generation = 0;
        this.#publish(true);
        this.#emitStats();
        this.#emitHistory();
        return;
      }

      case 'randomise': {
        const life = this.#requireLife();
        this.#pushHistory();
        fillRandom(life.board, command.density, command.seed);
        life.generation = 0;
        this.#publish(true);
        this.#emitStats();
        this.#emitHistory();
        return;
      }

      case 'checkpoint': {
        this.#requireLife();
        this.#pushHistory();
        this.#emitHistory();
        return;
      }

      case 'undo':
        this.#travel(this.#undoStack, this.#redoStack);
        return;

      case 'redo':
        this.#travel(this.#redoStack, this.#undoStack);
        return;

      case 'snapshot': {
        const life = this.#requireLife();
        this.#emit({
          type: 'snapshot',
          rle: encodeRle(life.board.toCoords(), { rule: this.#rule.name }),
          generation: life.generation,
        });
        return;
      }
    }
  }

  #init(command: Extract<SimCommand, { type: 'init' }>): void {
    const previous = this.#life?.board ?? null;
    this.#halt();

    this.#rule = command.rule ? parseRule(command.rule) : LIFE;
    const board = new Board(command.width, command.height, command.topology ?? 'torus');

    if (command.preserve && previous) {
      // On recentre l'ancien contenu. Ce qui déborde est perdu — c'est le
      // comportement attendu, mais l'interface devra prévenir avant de rogner.
      const ox = (board.width - previous.width) >> 1;
      const oy = (board.height - previous.height) >> 1;
      board.stamp(previous.toCoords(), ox, oy);
    }

    this.#life = new Life(board, this.#rule);
    this.#wordsPerFrame = board.bits.length;
    this.#backFrame = 0;
    this.#clearHistory();

    if (command.shared) {
      const needed = sharedBufferBytes(this.#wordsPerFrame);
      if (command.shared.byteLength < needed) {
        throw new Error(
          `Tampon partagé trop petit : ${command.shared.byteLength} octets, ${needed} attendus.`,
        );
      }
      this.#shared = command.shared;
      this.#control = controlView(command.shared);
      Atomics.store(this.#control, CTRL_WORDS, this.#wordsPerFrame);
    } else {
      this.#shared = null;
      this.#control = null;
    }

    this.#emit({
      type: 'ready',
      width: board.width,
      height: board.height,
      wordsPerRow: board.wordsPerRow,
      wordsPerFrame: this.#wordsPerFrame,
      rule: this.#rule.name,
      ...(this.#shared ? { shared: this.#shared } : {}),
    });

    this.#publish(true);
    this.#emitStats();
    this.#emitHistory();
  }

  // ─────────────────────────── Historique ───────────────────────────

  /** Enregistre l'état courant comme point de retour, et périme le refaire. */
  #pushHistory(): void {
    const life = this.#life;
    if (!life) return;
    const entry: HistoryEntry = {
      bits: new Uint32Array(life.board.bits),
      generation: life.generation,
    };
    this.#undoStack.push(entry);
    this.#historyBytes += entry.bits.byteLength;
    this.#clearRedo();
    this.#trimHistory();
  }

  #clearRedo(): void {
    for (const entry of this.#redoStack) this.#historyBytes -= entry.bits.byteLength;
    this.#redoStack.length = 0;
  }

  #clearHistory(): void {
    // Après un « init », les instantanés n'ont plus la bonne taille.
    this.#undoStack.length = 0;
    this.#redoStack.length = 0;
    this.#historyBytes = 0;
  }

  #trimHistory(): void {
    while (
      this.#undoStack.length > MAX_HISTORY_ENTRIES ||
      (this.#historyBytes > MAX_HISTORY_BYTES && this.#undoStack.length > 1)
    ) {
      const dropped = this.#undoStack.shift();
      if (!dropped) break;
      this.#historyBytes -= dropped.bits.byteLength;
    }
  }

  /** Déplace un état d'une pile à l'autre : c'est annuler *et* refaire. */
  #travel(from: HistoryEntry[], to: HistoryEntry[]): void {
    const life = this.#requireLife();
    const target = from.pop();
    if (!target) {
      this.#emitHistory();
      return;
    }
    this.#historyBytes -= target.bits.byteLength;

    const current: HistoryEntry = {
      bits: new Uint32Array(life.board.bits),
      generation: life.generation,
    };
    to.push(current);
    this.#historyBytes += current.bits.byteLength;

    this.#halt();
    // On écrit *dans* le tampon courant plutôt que de remplacer la référence :
    // le moteur permute board.bits avec son scratch, les deux doivent rester
    // de la même taille et lui appartenir.
    life.board.bits.set(target.bits);
    life.generation = target.generation;

    this.#publish(true);
    this.#emitStats();
    this.#emitHistory();
  }

  #emitHistory(): void {
    this.#emit({
      type: 'history',
      canUndo: this.#undoStack.length > 0,
      canRedo: this.#redoStack.length > 0,
    });
  }

  #requireLife(): Life {
    if (!this.#life) throw new Error('Simulation non initialisée : envoyer « init » d\'abord.');
    return this.#life;
  }

  #halt(): void {
    this.#running = false;
    if (this.#timer !== null) {
      this.#clock.clearTimer(this.#timer);
      this.#timer = null;
    }
    this.#setRunningFlag(false);
  }

  #setRunningFlag(running: boolean): void {
    if (this.#control) Atomics.store(this.#control, CTRL_RUNNING, running ? 1 : 0);
  }

  #scheduleTick(): void {
    if (!this.#running) return;
    // On se réveille au rythme des images, sauf si la simulation est plus
    // lente que ça : inutile de se réveiller 60 fois par seconde pour 2
    // générations.
    const interval = Math.max(0, Math.min(this.#minPublishIntervalMs, 1000 / this.#gps));
    this.#timer = this.#clock.setTimer(() => {
      this.#timer = null;
      this.#tick();
    }, interval);
  }

  #tick(): void {
    if (!this.#running || !this.#life) return;

    const life = this.#life;
    const now = this.#clock.now();
    const elapsed = Math.max(0, now - this.#lastTick);
    this.#lastTick = now;

    this.#pendingGenerations += (elapsed / 1000) * this.#gps;

    // Le retard se plafonne à une seconde de simulation, et il se plafonne
    // *avant* d'être consommé : un onglet laissé en arrière-plan une heure
    // reviendrait sinon avec des millions de générations à rattraper. Le
    // budget de temps ci-dessous ne suffit pas — il étale le rattrapage sur
    // des milliers de réveils au lieu de l'annuler.
    const maxBacklog = Math.max(1, this.#gps);
    if (this.#pendingGenerations > maxBacklog) this.#pendingGenerations = maxBacklog;

    const deadline = now + this.#budgetMs;
    let done = 0;
    while (this.#pendingGenerations >= 1) {
      life.step();
      done++;
      this.#pendingGenerations -= 1;
      // On ne consulte l'horloge que périodiquement : l'appel coûte plus cher
      // qu'une génération sur une petite grille.
      if ((done & 15) === 0 && this.#clock.now() >= deadline) break;
    }

    this.#publish(false);
    this.#scheduleTick();
  }

  /**
   * Publie une copie figée de la grille. Le moteur permute ses deux tampons à
   * chaque génération : exposer ses tampons de travail ferait lire au rendu
   * une grille en cours de réécriture.
   */
  #publish(force: boolean): void {
    const life = this.#life;
    if (!life) return;

    const now = this.#clock.now();
    if (!force && now - this.#lastPublish < this.#minPublishIntervalMs) return;
    this.#lastPublish = now;

    const bits = life.board.bits;
    const population = life.board.population();

    if (this.#control && this.#shared) {
      const back = this.#backFrame;
      frameView(this.#shared, back, this.#wordsPerFrame).set(bits);
      writeGeneration(this.#control, life.generation);
      Atomics.store(this.#control, CTRL_POPULATION, population);
      // Publication en dernier : le lecteur ne voit la trame que complète.
      Atomics.store(this.#control, CTRL_FRAME, back);
      this.#backFrame = ((back + 1) % FRAME_COUNT) as FrameIndex;
      return;
    }

    const copy = new Uint32Array(bits);
    this.#emit(
      { type: 'frame', generation: life.generation, population, bits: copy },
      [copy.buffer],
    );
  }

  #emitStats(): void {
    const life = this.#life;
    if (!life) return;
    this.#emit({
      type: 'stats',
      generation: life.generation,
      population: life.board.population(),
      running: this.#running,
    });
  }
}

function clampSpeed(gps: number): number {
  if (!Number.isFinite(gps) || gps <= 0) return 1;
  return Math.min(gps, 100_000);
}

/**
 * Soupe aléatoire reproductible. La graine fait partie du protocole : c'est
 * elle que le serveur rejouera pour valider une découverte du Codex, donc le
 * générateur doit rester figé pour toujours.
 */
export function fillRandom(board: Board, density: number, seed: number): void {
  const threshold = Math.max(0, Math.min(1, density)) * 0xffffffff;
  let state = (seed >>> 0) || 0x2545f491;
  board.clear();
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      if (state < threshold) board.set(x, y, 1);
    }
  }
}
