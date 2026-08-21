export {
  CONTROL_INTS,
  CTRL_FRAME,
  CTRL_GEN_HI,
  CTRL_GEN_LO,
  CTRL_POPULATION,
  CTRL_RUNNING,
  CTRL_WORDS,
  FRAME_COUNT,
  controlView,
  frameView,
  readGeneration,
  sharedBufferBytes,
  writeGeneration,
  type FrameIndex,
  type SimCommand,
  type SimEvent,
  type Topology,
} from './protocol.ts';

export { Simulation, fillRandom, type Clock, type SimulationOptions } from './simulation.ts';

export {
  attachSimulation,
  makeClock,
  type WorkerLike,
  type WorkerScopeLike,
} from './runtime.ts';

export { SimulationClient, type ClientOptions, type Frame } from './client.ts';
