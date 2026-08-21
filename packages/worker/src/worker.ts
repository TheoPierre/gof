// Point d'entrée du Web Worker. Tout le reste vit dans simulation.ts.
//
// À charger côté application par :
//   new Worker(new URL('@zp/worker/worker', import.meta.url), { type: 'module' })

import { attachSimulation, type WorkerScopeLike } from './runtime.ts';

const scope = globalThis as unknown as WorkerScopeLike;
const clock = globalThis as unknown as { performance: { now(): number } };

attachSimulation(scope, () => clock.performance.now());
