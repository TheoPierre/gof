// Adaptateurs entre la simulation et son environnement.
//
// Aucun global ambiant n'est référencé ici : on décrit les capacités dont on a
// besoin par des interfaces minimales, et l'appelant fournit l'objet. Résultat,
// tout ce fichier se vérifie et se teste sous Node, sans lib DOM ni WebWorker.

import { Simulation, type Clock } from './simulation.ts';
import type { SimCommand, SimEvent } from './protocol.ts';

/** Le peu qu'on attend du contexte d'un worker. */
export interface WorkerScopeLike {
  postMessage(message: SimEvent, transfer?: ArrayBufferLike[]): void;
  addEventListener(type: 'message', handler: (event: { data: SimCommand }) => void): void;
  setTimeout(handler: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

/**
 * Le peu qu'on attend d'un Worker vu du thread principal.
 *
 * Pas de paramètre `transfer` : les commandes ne transfèrent jamais rien, et
 * un paramètre optionnel ici rendrait un `Worker` réel non assignable — ses
 * surcharges déclarent `transfer` obligatoire.
 */
export interface WorkerLike {
  postMessage(message: SimCommand): void;
  addEventListener(type: 'message', handler: (event: { data: SimEvent }) => void): void;
  terminate(): void;
}

export function makeClock(scope: WorkerScopeLike, now: () => number): Clock {
  return {
    now,
    setTimer: (callback, ms) => scope.setTimeout(callback, ms),
    clearTimer: (handle) => scope.clearTimeout(handle),
  };
}

/** Branche une simulation sur un contexte de worker. Appelé par worker.ts. */
export function attachSimulation(scope: WorkerScopeLike, now: () => number): Simulation {
  const simulation = new Simulation({
    clock: makeClock(scope, now),
    emit: (event, transfer) => {
      if (transfer && transfer.length > 0) scope.postMessage(event, transfer);
      else scope.postMessage(event);
    },
  });

  scope.addEventListener('message', (event) => simulation.handle(event.data));
  return simulation;
}
