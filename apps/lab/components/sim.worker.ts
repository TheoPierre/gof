// Point d'entrée du Web Worker de l'application.
//
// Il ne fait que brancher la simulation sur le contexte du worker : toute la
// logique vit dans @zp/worker, et se teste sous Node sans navigateur.

import { attachSimulation, type WorkerScopeLike } from '@zp/worker';

const scope = globalThis as unknown as WorkerScopeLike;

attachSimulation(scope, () => performance.now());
