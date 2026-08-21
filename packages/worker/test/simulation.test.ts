import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, Life, LIFE } from '@zp/engine';

import {
  CTRL_FRAME,
  FRAME_COUNT,
  Simulation,
  SimulationClient,
  attachSimulation,
  controlView,
  frameView,
  sharedBufferBytes,
  type Clock,
  type SimCommand,
  type SimEvent,
  type WorkerLike,
  type WorkerScopeLike,
} from '../src/index.ts';

/** Horloge pilotée à la main : aucun test ne dépend du temps réel. */
class FakeClock implements Clock {
  time = 0;
  #timers = new Map<number, { at: number; callback: () => void }>();
  #nextHandle = 1;

  now(): number {
    return this.time;
  }

  setTimer(callback: () => void, ms: number): number {
    const handle = this.#nextHandle++;
    this.#timers.set(handle, { at: this.time + ms, callback });
    return handle;
  }

  clearTimer(handle: number): void {
    this.#timers.delete(handle);
  }

  advance(ms: number): void {
    const target = this.time + ms;
    for (let guard = 0; guard < 100_000; guard++) {
      let dueHandle = -1;
      let dueAt = Infinity;
      for (const [handle, timer] of this.#timers) {
        if (timer.at <= target && timer.at < dueAt) {
          dueAt = timer.at;
          dueHandle = handle;
        }
      }
      if (dueHandle === -1) break;
      const timer = this.#timers.get(dueHandle)!;
      this.#timers.delete(dueHandle);
      // Jamais en arrière : un timer en retard se déclenche à l'heure qu'il
      // est, pas à l'heure à laquelle il aurait dû partir. C'est ce que fait
      // un vrai navigateur au réveil d'un onglet.
      this.time = Math.max(this.time, timer.at);
      timer.callback();
    }
    this.time = target;
  }
}

function makeSimulation(clock = new FakeClock()): {
  simulation: Simulation;
  clock: FakeClock;
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const simulation = new Simulation({ clock, emit: (event) => events.push(event) });
  return { simulation, clock, events };
}

/** Paire worker / thread principal en mémoire, livraison synchrone. */
function makePair(clock: FakeClock): { client: SimulationClient; simulation: Simulation } {
  const toWorker: Array<(event: { data: SimCommand }) => void> = [];
  const toMain: Array<(event: { data: SimEvent }) => void> = [];

  const scope: WorkerScopeLike = {
    postMessage: (message) => {
      for (const listener of [...toMain]) listener({ data: message });
    },
    addEventListener: (_type, handler) => void toWorker.push(handler),
    setTimeout: (callback, ms) => clock.setTimer(callback, ms),
    clearTimeout: (handle) => clock.clearTimer(handle),
  };

  const worker: WorkerLike = {
    postMessage: (message) => {
      for (const listener of [...toWorker]) listener({ data: message });
    },
    addEventListener: (_type, handler) => void toMain.push(handler),
    terminate: () => {},
  };

  const simulation = attachSimulation(scope, () => clock.now());
  return { client: new SimulationClient(worker), simulation };
}

const GLIDER_RLE = 'x = 3, y = 3, rule = B3/S23\nbo$2bo$3o!';

// ───────────────────────── Cycle de vie ─────────────────────────

test('une commande avant « init » remonte une erreur au lieu de planter', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'step' });
  assert.equal(events.length, 1);
  assert.equal(events[0]!.type, 'error');
});

test('« init » annonce la géométrie de la grille', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 100, height: 40 });

  const ready = events.find((e) => e.type === 'ready');
  assert.ok(ready && ready.type === 'ready');
  assert.equal(ready.width, 100);
  assert.equal(ready.height, 40);
  assert.equal(ready.wordsPerRow, 4, '100 colonnes tiennent dans 4 mots');
  assert.equal(ready.wordsPerFrame, 160);
  assert.equal(ready.rule, 'B3/S23');
});

test('« init » avec preserve recentre le contenu existant', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 16, height: 16 });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 0, y: 0 });
  const before = simulation.board!.population();

  simulation.handle({ type: 'init', width: 64, height: 64, preserve: true });
  assert.equal(simulation.board!.width, 64);
  assert.equal(simulation.board!.population(), before, 'les cellules survivent');
});

// ───────────────────────── Commandes ─────────────────────────

test('« stamp » place un motif RLE, « step » le fait avancer', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 40, height: 40, topology: 'bounded' });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 5, y: 5 });

  const start = simulation.board!.toCoords();
  assert.equal(start.length, 5);

  simulation.handle({ type: 'step', count: 4 });
  assert.equal(simulation.generation, 4);
  assert.deepEqual(
    simulation.board!.toCoords(),
    start.map(([x, y]) => [x + 1, y + 1]),
    'le planeur a glissé de (1,1)',
  );
});

test('« setCells » bascule des cellules une à une', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });
  simulation.handle({ type: 'setCells', cells: [[3, 3], [4, 3], [5, 3]], alive: true });
  assert.equal(simulation.board!.population(), 3);

  simulation.handle({ type: 'setCells', cells: [[4, 3]], alive: false });
  assert.equal(simulation.board!.population(), 2);
});

test('« clear » vide la grille et remet la génération à zéro', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });
  simulation.handle({ type: 'randomise', density: 0.4, seed: 7 });
  simulation.handle({ type: 'step', count: 10 });
  assert.ok(simulation.board!.population() > 0);

  simulation.handle({ type: 'clear' });
  assert.equal(simulation.board!.population(), 0);
  assert.equal(simulation.generation, 0);
});

test('« randomise » est reproductible : la graine fait partie du protocole', () => {
  // C'est cette graine que le serveur rejouera pour valider une découverte du
  // Codex. Le générateur doit rester figé pour toujours.
  const run = (seed: number): string => {
    const { simulation } = makeSimulation();
    simulation.handle({ type: 'init', width: 64, height: 32, topology: 'bounded' });
    simulation.handle({ type: 'randomise', density: 0.35, seed });
    simulation.handle({ type: 'step', count: 25 });
    return `${simulation.board!.population()}:${simulation.board!.toAscii().length}`;
  };

  assert.equal(run(12345), run(12345), 'même graine, même résultat');
  assert.notEqual(run(12345), run(12346), 'graines différentes, résultats différents');
});

test('« setRule » change la règle sans perdre la grille ni la génération', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });
  simulation.handle({ type: 'randomise', density: 0.3, seed: 99 });
  simulation.handle({ type: 'step', count: 5 });

  const population = simulation.board!.population();
  simulation.handle({ type: 'setRule', rule: 'B36/S23' });

  assert.equal(simulation.generation, 5, 'la génération est conservée');
  assert.equal(simulation.board!.population(), population, 'la grille est conservée');
});

test('une règle invalide remonte une erreur sans casser la simulation', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 16, height: 16 });
  simulation.handle({ type: 'setRule', rule: 'nawak' });

  assert.equal(events.at(-1)!.type, 'error');
  simulation.handle({ type: 'step' });
  assert.equal(simulation.generation, 1, 'la simulation répond toujours');
});

test('« snapshot » rend un RLE relisable', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 40, height: 40, topology: 'bounded' });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 10, y: 10 });
  simulation.handle({ type: 'snapshot' });

  const snapshot = events.findLast((e) => e.type === 'snapshot');
  assert.ok(snapshot && snapshot.type === 'snapshot');
  assert.ok(snapshot.rle.includes('bo$2bo$3o!'), snapshot.rle);
});

// ───────────────────────── Cadence ─────────────────────────

test('« start » avance à la cadence demandée, « stop » l\'arrête', () => {
  const clock = new FakeClock();
  const { simulation } = makeSimulation(clock);
  simulation.handle({ type: 'init', width: 64, height: 64 });
  simulation.handle({ type: 'randomise', density: 0.3, seed: 1 });

  simulation.handle({ type: 'start', generationsPerSecond: 20 });
  clock.advance(1000);
  assert.ok(simulation.running);
  // 20 gén./s pendant une seconde, à une génération près selon l'arrondi.
  assert.ok(
    Math.abs(simulation.generation - 20) <= 1,
    `génération ${simulation.generation}, ~20 attendues`,
  );

  simulation.handle({ type: 'stop' });
  const frozen = simulation.generation;
  clock.advance(5000);
  assert.equal(simulation.generation, frozen, 'plus rien ne bouge après stop');
  assert.equal(simulation.running, false);
});

test('le retard accumulé hors écran n\'est pas rattrapé indéfiniment', () => {
  // Un onglet en arrière-plan ne doit pas revenir en simulant dix minutes
  // d'un coup et bloquer le worker.
  const clock = new FakeClock();
  const { simulation } = makeSimulation(clock);
  simulation.handle({ type: 'init', width: 64, height: 64 });
  simulation.handle({ type: 'start', generationsPerSecond: 30 });

  clock.advance(16);
  const afterFirstTick = simulation.generation;

  // Aucun timer ne se déclenche pendant que l'onglet dort : on saute l'horloge.
  clock.time += 600_000;
  clock.advance(50);

  assert.ok(
    simulation.generation - afterFirstTick < 200,
    `rattrapage plafonné, ${simulation.generation - afterFirstTick} générations`,
  );
});

// ───────────────────── Publication des trames ─────────────────────

test('sans mémoire partagée, chaque trame arrive par message', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 8, topology: 'bounded' });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 2, y: 2 });

  const frame = events.findLast((e) => e.type === 'frame');
  assert.ok(frame && frame.type === 'frame');
  assert.equal(frame.population, 5);
  assert.equal(frame.bits.length, 2 * 8, '64 colonnes = 2 mots, 8 lignes');
});

test('avec mémoire partagée, les trames tournent sur trois tampons', () => {
  const clock = new FakeClock();
  const { simulation, events } = makeSimulation(clock);

  const width = 64;
  const height = 16;
  const wordsPerFrame = 2 * height;
  const shared = new SharedArrayBuffer(sharedBufferBytes(wordsPerFrame));

  simulation.handle({ type: 'init', width, height, topology: 'bounded', shared });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 2, y: 2 });

  const control = controlView(shared);
  const seen: number[] = [];
  for (let i = 0; i < 6; i++) {
    simulation.handle({ type: 'step' });
    seen.push(Atomics.load(control, CTRL_FRAME));
  }

  assert.equal(FRAME_COUNT, 3);
  assert.deepEqual(new Set(seen).size, 3, `les trois trames servent : ${seen.join(',')}`);

  // Aucune trame n'est envoyée par message sur ce chemin : c'est tout l'intérêt.
  assert.equal(events.filter((e) => e.type === 'frame').length, 0);

  // La trame publiée reflète exactement la grille du moteur.
  const published = Atomics.load(control, CTRL_FRAME) as 0 | 1 | 2;
  assert.deepEqual(
    [...frameView(shared, published, wordsPerFrame)],
    [...simulation.board!.bits],
  );
});

// ───────────────── Aller-retour client / worker ─────────────────

test('le client pilote la simulation et lit ses trames', async () => {
  const clock = new FakeClock();
  const { client, simulation } = makePair(clock);

  await client.init({ width: 128, height: 64, topology: 'bounded' });
  assert.equal(client.width, 128);
  assert.equal(client.usesSharedMemory, true, 'SharedArrayBuffer disponible sous Node');

  client.send({ type: 'stamp', rle: GLIDER_RLE, x: 10, y: 10 });

  const first = client.readFrame();
  assert.ok(first);
  assert.equal(first.population, 5);
  assert.equal(first.generation, 0);
  assert.equal(first.running, false);

  client.start(50);
  clock.advance(1000);
  assert.ok(client.readFrame()!.running);

  client.stop();
  const frame = client.readFrame()!;
  assert.ok(Math.abs(frame.generation - 50) <= 1, `génération ${frame.generation}`);
  assert.equal(frame.running, false);

  // La trame lue par le client doit correspondre à la grille du moteur.
  const reference = new Board(128, 64, 'bounded');
  reference.bits.set(frame.bits);
  assert.equal(reference.population(), simulation.board!.population());
});

test('le client relaie les erreurs du worker', async () => {
  const clock = new FakeClock();
  const { client } = makePair(clock);
  await client.init({ width: 32, height: 32 });

  const errors: string[] = [];
  client.on((event) => {
    if (event.type === 'error') errors.push(event.message);
  });

  client.send({ type: 'stamp', rle: 'ceci n\'est pas du RLE', x: 0, y: 0 });
  assert.equal(errors.length, 1);
});

// ───────────────────────── Historique ─────────────────────────

test('un trait entier ne fait qu\'une seule entrée d\'historique', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 64 });

  // Ce que fait l'interface au début d'un geste, puis pendant.
  simulation.handle({ type: 'checkpoint' });
  for (let x = 10; x < 30; x++) {
    simulation.handle({ type: 'setCells', cells: [[x, 20]], alive: true });
  }
  assert.equal(simulation.board!.population(), 20);

  simulation.handle({ type: 'undo' });
  assert.equal(simulation.board!.population(), 0, 'un seul « annuler » efface tout le trait');

  simulation.handle({ type: 'redo' });
  assert.equal(simulation.board!.population(), 20, 'et « refaire » le remet en entier');
});

test('vider, semer et déposer posent leur propre point de retour', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 64, topology: 'bounded' });

  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 5, y: 5 });
  assert.equal(simulation.board!.population(), 5);

  simulation.handle({ type: 'randomise', density: 0.4, seed: 3 });
  const soupe = simulation.board!.population();
  assert.ok(soupe > 100);

  simulation.handle({ type: 'clear' });
  assert.equal(simulation.board!.population(), 0);

  simulation.handle({ type: 'undo' });
  assert.equal(simulation.board!.population(), soupe, 'retour à la soupe');
  simulation.handle({ type: 'undo' });
  assert.equal(simulation.board!.population(), 5, 'retour au planeur');
  simulation.handle({ type: 'undo' });
  assert.equal(simulation.board!.population(), 0, 'retour à la grille vierge');
});

test('une nouvelle modification périme le refaire', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 64 });

  simulation.handle({ type: 'checkpoint' });
  simulation.handle({ type: 'setCells', cells: [[1, 1]], alive: true });
  simulation.handle({ type: 'undo' });

  let history = events.findLast((e) => e.type === 'history');
  assert.ok(history && history.type === 'history' && history.canRedo, 'refaire disponible');

  simulation.handle({ type: 'checkpoint' });
  simulation.handle({ type: 'setCells', cells: [[9, 9]], alive: true });

  history = events.findLast((e) => e.type === 'history');
  assert.ok(history && history.type === 'history');
  assert.equal(history.canRedo, false, 'la branche abandonnée est jetée');
});

test('annuler sans rien à annuler ne casse rien', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });

  simulation.handle({ type: 'undo' });
  simulation.handle({ type: 'redo' });

  assert.equal(events.filter((e) => e.type === 'error').length, 0);
  const history = events.findLast((e) => e.type === 'history');
  assert.ok(history && history.type === 'history');
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('annuler restaure aussi la génération, pas seulement la grille', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 64, topology: 'bounded' });
  simulation.handle({ type: 'stamp', rle: GLIDER_RLE, x: 5, y: 5 });
  simulation.handle({ type: 'step', count: 12 });
  assert.equal(simulation.generation, 12);

  // Faire tourner la simulation n'est pas annulable : on revient au moment de
  // la dernière modification, génération comprise.
  simulation.handle({ type: 'undo' });
  assert.equal(simulation.generation, 0);
  assert.equal(simulation.board!.population(), 0);
});

test('l\'historique est plafonné', () => {
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 64, height: 64 });

  for (let i = 0; i < 60; i++) {
    simulation.handle({ type: 'checkpoint' });
    simulation.handle({ type: 'setCells', cells: [[i % 60, 1]], alive: true });
  }

  let undone = 0;
  for (let i = 0; i < 100; i++) {
    const before = simulation.board!.population();
    simulation.handle({ type: 'undo' });
    if (simulation.board!.population() === before) break;
    undone++;
  }
  assert.ok(undone <= 40, `au plus 40 retours en arrière, ${undone} observés`);
  assert.ok(undone >= 30, `mais un historique utile, ${undone} observés`);
});

test('un RLE invalide ne laisse pas d\'entrée d\'historique', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });
  simulation.handle({ type: 'stamp', rle: 'pas du RLE', x: 0, y: 0 });

  assert.equal(events.at(-1)!.type, 'error');
  const history = events.findLast((e) => e.type === 'history');
  assert.ok(history && history.type === 'history');
  assert.equal(history.canUndo, false, 'rien à annuler après un échec');
});

test('« init » repart d\'un historique vierge', () => {
  const { simulation, events } = makeSimulation();
  simulation.handle({ type: 'init', width: 32, height: 32 });
  simulation.handle({ type: 'checkpoint' });
  simulation.handle({ type: 'setCells', cells: [[1, 1]], alive: true });

  // Les instantanés de l'ancienne grille n'ont plus la bonne taille.
  simulation.handle({ type: 'init', width: 128, height: 128 });
  const history = events.findLast((e) => e.type === 'history');
  assert.ok(history && history.type === 'history');
  assert.equal(history.canUndo, false);
});

// ───────────────── Cohérence avec le moteur nu ─────────────────

test('la simulation produit exactement le même résultat que le moteur direct', () => {
  // L'invariant du projet : client et serveur rejouent la même chose. Ici on
  // vérifie que passer par le worker ne change rien au résultat.
  const { simulation } = makeSimulation();
  simulation.handle({ type: 'init', width: 96, height: 96, topology: 'torus' });
  simulation.handle({ type: 'randomise', density: 0.35, seed: 424242 });
  simulation.handle({ type: 'step', count: 300 });

  const direct = new Board(96, 96, 'torus');
  fillRandomReference(direct, 0.35, 424242);
  const life = new Life(direct, LIFE);
  life.run(300);

  assert.equal(simulation.board!.toAscii(), life.board.toAscii());
});

/** Copie littérale du générateur de simulation.ts, pour l'éprouver. */
function fillRandomReference(board: Board, density: number, seed: number): void {
  const threshold = Math.max(0, Math.min(1, density)) * 0xffffffff;
  let state = (seed >>> 0) || 0x2545f491;
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      if (state < threshold) board.set(x, y, 1);
    }
  }
}
