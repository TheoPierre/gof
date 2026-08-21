// Classification d'un motif par observation.
//
// On fait tourner le motif et on regarde s'il retrouve sa forme. S'il la
// retrouve au même endroit, c'est un oscillateur — ou une nature morte si
// c'est immédiat. S'il la retrouve ailleurs, c'est un vaisseau, et le
// déplacement donne sa vitesse.
//
// L'intérêt est d'écrire des faits *mesurés* plutôt que recopiés : une page
// qui annonce « période 3 » l'annonce parce que le moteur vient de le
// vérifier. C'est aussi la brique dont le Codex aura besoin pour identifier
// les objets qu'une soupe laisse derrière elle.

import { Board } from './board.ts';
import { Life } from './life.ts';
import { LIFE, type Rule } from './rule.ts';
import type { Coord } from './board.ts';

export type PatternKind =
  | 'still-life'
  | 'oscillator'
  | 'spaceship'
  /** Vivant, mais sans forme récurrente dans la fenêtre observée. */
  | 'unstable'
  | 'extinct';

export interface Analysis {
  kind: PatternKind;
  /** Population de départ. */
  population: number;
  width: number;
  height: number;
  /** Nombre de générations avant retour à la même forme. */
  period?: number;
  /** Déplacement sur une période, en cellules. */
  displacement?: readonly [number, number];
  /** Vitesse en notation usuelle, p. ex. « c/4 en diagonale ». */
  speed?: string;
  /** Génération à laquelle la population est tombée à zéro. */
  extinctAt?: number;
}

export interface AnalyseOptions {
  rule?: Rule;
  /** Fenêtre d'observation. Au-delà, le motif est déclaré instable. */
  maxGenerations?: number;
  /** Marge autour du motif. Trop petite, un vaisseau atteint le bord. */
  margin?: number;
}

/** Forme normalisée sur son coin haut-gauche, plus la position de ce coin. */
function fingerprint(board: Board): { shape: string; x: number; y: number } | null {
  const cells = board.toCoords();
  if (cells.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of cells) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  let shape = '';
  for (const [x, y] of cells) shape += `${x - minX},${y - minY};`;
  return { shape, x: minX, y: minY };
}

export function analyse(cells: Iterable<Coord>, options: AnalyseOptions = {}): Analysis {
  const { rule = LIFE, maxGenerations = 200, margin = 60 } = options;

  const list = [...cells];
  if (list.length === 0) {
    return { kind: 'extinct', population: 0, width: 0, height: 0, extinctAt: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of list) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Grille bornée avec de la marge : un vaisseau qui touche le bord ne se
  // classe plus, donc on préfère abandonner que se tromper.
  const board = new Board(width + margin * 2, height + margin * 2, 'bounded');
  for (const [x, y] of list) board.set(x - minX + margin, y - minY + margin, 1);
  const life = new Life(board, rule);

  const start = fingerprint(board);
  if (!start) {
    return { kind: 'extinct', population: 0, width, height, extinctAt: 0 };
  }

  for (let generation = 1; generation <= maxGenerations; generation++) {
    life.step();

    if (life.board.population() === 0) {
      return {
        kind: 'extinct',
        population: list.length,
        width,
        height,
        extinctAt: generation,
      };
    }

    const now = fingerprint(life.board);
    if (!now) break;

    // Le motif est sorti de la zone sûre : on ne peut plus rien affirmer.
    const box = life.board.bbox();
    if (
      box &&
      (box.x === 0 ||
        box.y === 0 ||
        box.x + box.width >= life.board.width ||
        box.y + box.height >= life.board.height)
    ) {
      break;
    }

    if (now.shape !== start.shape) continue;

    const dx = now.x - start.x;
    const dy = now.y - start.y;

    if (dx === 0 && dy === 0) {
      return {
        kind: generation === 1 ? 'still-life' : 'oscillator',
        population: list.length,
        width,
        height,
        period: generation,
        displacement: [0, 0],
      };
    }

    return {
      kind: 'spaceship',
      population: list.length,
      width,
      height,
      period: generation,
      displacement: [dx, dy],
      speed: describeSpeed(dx, dy, generation),
    };
  }

  return { kind: 'unstable', population: list.length, width, height };
}

/**
 * Vitesse en notation usuelle. Un déplacement de d cellules en p générations
 * s'écrit « c/n » après réduction — le planeur fait (1,1) en 4, soit c/4 en
 * diagonale ; un vaisseau léger fait (2,0) en 4, soit c/2.
 */
export function describeSpeed(dx: number, dy: number, period: number): string {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const diagonal = ax === ay;
  const distance = diagonal ? ax : Math.max(ax, ay);
  const divisor = gcd(distance, period);
  const numerator = distance / divisor;
  const denominator = period / divisor;

  const magnitude =
    numerator === 1 ? `c/${denominator}` : `${numerator}c/${denominator}`;

  if (diagonal) return `${magnitude} en diagonale`;
  if (ax === 0 || ay === 0) return `${magnitude} à l'orthogonale`;
  return `${magnitude} en oblique (${ax},${ay})`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}
