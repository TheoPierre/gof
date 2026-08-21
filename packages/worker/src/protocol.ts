// Protocole entre le thread principal et la simulation.
//
// Deux chemins de publication des trames, décidés à l'initialisation :
//
//   1. SharedArrayBuffer — la simulation écrit dans un tampon partagé, le
//      rendu y lit directement. Aucun message, aucune copie entre threads.
//      Demande l'isolation d'origine (en-têtes COOP/COEP).
//   2. postMessage — repli quand le partage n'est pas disponible. Une copie
//      transférée par trame, à cadence réduite.
//
// Dans les deux cas la simulation publie une *copie figée* plutôt que ses
// tampons de travail : le moteur permute ses deux tampons à chaque génération,
// et à 900 générations par seconde pour 60 images, le rendu lirait une grille
// en cours de réécriture. Le coût de la copie (128 Ko pour un million de
// cellules) est négligeable devant celui de la simulation.

// ─────────────────── Disposition du tampon partagé ───────────────────
//
//   [ contrôle : Int32Array(8) ][ trame 0 ][ trame 1 ]

export const CONTROL_INTS = 8;

/**
 * Trois trames, pas deux. Avec deux, le rédacteur réécrit la trame que le
 * lecteur tient encore dès la publication suivante ; avec trois, le lecteur
 * dispose de deux cycles complets pour dessiner. Le coût est un tampon de plus.
 */
export const FRAME_COUNT = 3;

export type FrameIndex = 0 | 1 | 2;

/** Index de la trame publiée, 0 à 2. Le rédacteur n'écrit jamais dedans. */
export const CTRL_FRAME = 0;
/** Génération, en deux moitiés de 32 bits : elle dépasse 2³¹ en temps profond. */
export const CTRL_GEN_LO = 1;
export const CTRL_GEN_HI = 2;
export const CTRL_POPULATION = 3;
/** 1 si la simulation tourne, 0 sinon. */
export const CTRL_RUNNING = 4;
/** Nombre de mots de 32 bits par trame. */
export const CTRL_WORDS = 5;

export function sharedBufferBytes(wordsPerFrame: number): number {
  return CONTROL_INTS * 4 + wordsPerFrame * 4 * FRAME_COUNT;
}

export function controlView(buffer: ArrayBufferLike): Int32Array {
  return new Int32Array(buffer, 0, CONTROL_INTS);
}

export function frameView(
  buffer: ArrayBufferLike,
  index: FrameIndex,
  wordsPerFrame: number,
): Uint32Array {
  return new Uint32Array(buffer, CONTROL_INTS * 4 + index * wordsPerFrame * 4, wordsPerFrame);
}

/** Recompose la génération depuis ses deux moitiés. Lecture atomique. */
export function readGeneration(control: Int32Array): number {
  const lo = Atomics.load(control, CTRL_GEN_LO) >>> 0;
  const hi = Atomics.load(control, CTRL_GEN_HI) >>> 0;
  return hi * 0x1_0000_0000 + lo;
}

export function writeGeneration(control: Int32Array, generation: number): void {
  Atomics.store(control, CTRL_GEN_LO, generation >>> 0);
  Atomics.store(control, CTRL_GEN_HI, Math.floor(generation / 0x1_0000_0000));
}

// ─────────────────────────── Commandes ───────────────────────────

export type Topology = 'torus' | 'bounded';

export type SimCommand =
  | {
      type: 'init';
      width: number;
      height: number;
      topology?: Topology;
      rule?: string;
      /** Fourni si l'hôte a pu allouer un tampon partagé. */
      shared?: SharedArrayBuffer;
      /** Recentre le contenu existant dans la nouvelle grille. */
      preserve?: boolean;
    }
  | { type: 'start'; generationsPerSecond: number }
  | { type: 'stop' }
  | { type: 'step'; count?: number }
  | { type: 'setSpeed'; generationsPerSecond: number }
  | { type: 'setRule'; rule: string }
  | { type: 'setCells'; cells: ReadonlyArray<readonly [number, number]>; alive: boolean }
  | { type: 'stamp'; rle: string; x: number; y: number }
  | { type: 'clear' }
  /** Soupe aléatoire reproductible : même graine, même grille, partout. */
  | { type: 'randomise'; density: number; seed: number }
  | { type: 'snapshot' }
  /**
   * Marque le début d'une modification composée — un trait à la souris émet
   * des dizaines de « setCells », et on ne veut qu'une seule entrée
   * d'historique pour l'ensemble. L'appelant l'envoie au début du geste.
   */
  | { type: 'checkpoint' }
  | { type: 'undo' }
  | { type: 'redo' };

// Il n'y a pas de commande « resize » : redimensionner change la taille du
// tampon partagé, que seul l'hôte peut allouer. On réémet donc « init » avec
// les nouvelles dimensions et `preserve: true`.

// ───────────────────────────── Événements ─────────────────────────────

export type SimEvent =
  | {
      type: 'ready';
      width: number;
      height: number;
      wordsPerRow: number;
      wordsPerFrame: number;
      rule: string;
      /** Absent si le repli postMessage est utilisé. */
      shared?: SharedArrayBuffer;
    }
  /** Émis seulement sur le chemin de repli : `bits` est transféré. */
  | { type: 'frame'; generation: number; population: number; bits: Uint32Array }
  /** Émis dans les deux cas, pour les compteurs de l'interface. */
  | { type: 'stats'; generation: number; population: number; running: boolean }
  | { type: 'snapshot'; rle: string; generation: number }
  | { type: 'history'; canUndo: boolean; canRedo: boolean }
  | { type: 'error'; message: string };
