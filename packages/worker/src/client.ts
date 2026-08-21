// Côté thread principal : envoie les commandes, expose la trame à dessiner.
//
// Le rendu n'appelle pas `readFrame` à travers un événement mais à chaque
// image, dans sa propre boucle. Sur le chemin partagé, la lecture est un
// simple accès mémoire : aucun message n'est échangé pendant que ça tourne.

import {
  CTRL_FRAME,
  CTRL_POPULATION,
  CTRL_RUNNING,
  controlView,
  frameView,
  readGeneration,
  sharedBufferBytes,
  type FrameIndex,
  type SimCommand,
  type SimEvent,
} from './protocol.ts';
import type { WorkerLike } from './runtime.ts';

export interface Frame {
  /** Vue en lecture seule. Valable le temps de dessiner, pas au-delà. */
  bits: Uint32Array;
  generation: number;
  population: number;
  running: boolean;
}

export interface ClientOptions {
  width: number;
  height: number;
  topology?: 'torus' | 'bounded';
  rule?: string;
  /**
   * Tente d'allouer un SharedArrayBuffer. Nécessite l'isolation d'origine
   * (en-têtes COOP/COEP). Le repli postMessage est transparent.
   */
  shared?: boolean;
}

export class SimulationClient {
  #worker: WorkerLike;
  #control: Int32Array | null = null;
  #shared: SharedArrayBuffer | null = null;
  #wordsPerFrame = 0;

  /** Dernière trame reçue par message, sur le chemin de repli. */
  #fallback: Frame | null = null;

  #listeners = new Set<(event: SimEvent) => void>();

  width = 0;
  height = 0;
  wordsPerRow = 0;
  /** true si le chemin sans copie est actif. */
  usesSharedMemory = false;

  constructor(worker: WorkerLike) {
    this.#worker = worker;
    worker.addEventListener('message', (event) => this.#receive(event.data));
  }

  /** Initialise ou redimensionne. Résout quand le worker a répondu « ready ». */
  init(options: ClientOptions): Promise<void> {
    const wordsPerRow = (options.width + 31) >>> 5;
    const wordsPerFrame = wordsPerRow * options.height;

    let shared: SharedArrayBuffer | undefined;
    if (options.shared !== false && canShareMemory()) {
      shared = new SharedArrayBuffer(sharedBufferBytes(wordsPerFrame));
    }

    return new Promise((resolve) => {
      const off = this.on((event) => {
        if (event.type !== 'ready') return;
        off();
        resolve();
      });

      const command: SimCommand = {
        type: 'init',
        width: options.width,
        height: options.height,
        ...(options.topology ? { topology: options.topology } : {}),
        ...(options.rule ? { rule: options.rule } : {}),
        ...(shared ? { shared } : {}),
      };
      this.#worker.postMessage(command);
    });
  }

  send(command: SimCommand): void {
    this.#worker.postMessage(command);
  }

  start(generationsPerSecond: number): void {
    this.send({ type: 'start', generationsPerSecond });
  }

  stop(): void {
    this.send({ type: 'stop' });
  }

  step(count = 1): void {
    this.send({ type: 'step', count });
  }

  setCell(x: number, y: number, alive: boolean): void {
    this.send({ type: 'setCells', cells: [[x, y]], alive });
  }

  /** Lit la trame courante. Renvoie null tant que rien n'a été publié. */
  readFrame(): Frame | null {
    if (this.#control && this.#shared) {
      const index = Atomics.load(this.#control, CTRL_FRAME) as FrameIndex;
      return {
        bits: frameView(this.#shared, index, this.#wordsPerFrame),
        generation: readGeneration(this.#control),
        population: Atomics.load(this.#control, CTRL_POPULATION),
        running: Atomics.load(this.#control, CTRL_RUNNING) === 1,
      };
    }
    return this.#fallback;
  }

  on(listener: (event: SimEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  terminate(): void {
    this.#worker.terminate();
    this.#listeners.clear();
  }

  #receive(event: SimEvent): void {
    switch (event.type) {
      case 'ready':
        this.width = event.width;
        this.height = event.height;
        this.wordsPerRow = event.wordsPerRow;
        this.#wordsPerFrame = event.wordsPerFrame;
        if (event.shared) {
          this.#shared = event.shared;
          this.#control = controlView(event.shared);
          this.usesSharedMemory = true;
        } else {
          this.#shared = null;
          this.#control = null;
          this.usesSharedMemory = false;
        }
        break;

      case 'frame':
        this.#fallback = {
          bits: event.bits,
          generation: event.generation,
          population: event.population,
          running: this.#fallback?.running ?? false,
        };
        break;

      case 'stats':
        if (this.#fallback) this.#fallback.running = event.running;
        break;
    }

    for (const listener of this.#listeners) listener(event);
  }
}

function canShareMemory(): boolean {
  const g = globalThis as { SharedArrayBuffer?: unknown; crossOriginIsolated?: boolean };
  if (typeof g.SharedArrayBuffer !== 'function') return false;
  // Hors isolation d'origine, le constructeur existe parfois mais l'objet
  // n'est pas partageable entre threads : on préfère le repli explicite.
  return g.crossOriginIsolated !== false;
}
