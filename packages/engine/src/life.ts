// Le pas de simulation.
//
// Toutes les cellules d'un mot de 32 bits avancent d'une génération en une
// seule passe d'opérations bit à bit : on additionne les huit bitmaps de
// voisinage dans un compteur binaire parallèle (s3 s2 s1 s0 = 0..8), puis on
// sélectionne les cellules dont le compte figure dans la règle.
//
// Aucun flottant n'intervient. Le résultat est donc identique au bit près sur
// tout moteur JavaScript, ce qui permet au serveur de rejouer une partie du
// client pour la vérifier. C'est l'invariant dont dépendent les classements.

import { Board } from './board.ts';
import { LIFE, type Rule } from './rule.ts';

function getBit(arr: Uint32Array, rowOffset: number, x: number): number {
  return (arr[rowOffset + (x >>> 5)]! >>> (x & 31)) & 1;
}

function setBit(arr: Uint32Array, rowOffset: number, x: number, value: number): void {
  const i = rowOffset + (x >>> 5);
  const mask = (1 << (x & 31)) >>> 0;
  arr[i] = value ? (arr[i]! | mask) >>> 0 : (arr[i]! & ~mask) >>> 0;
}

export class Life {
  readonly rule: Rule;
  board: Board;
  generation = 0;

  /** Tampon de destination, permuté avec board.bits à chaque pas. */
  #scratch: Uint32Array;
  /** leftNb[x] contient la valeur de la cellule x-1. */
  #leftNb: Uint32Array;
  /** rightNb[x] contient la valeur de la cellule x+1. */
  #rightNb: Uint32Array;
  #neighbours = new Uint32Array(8);
  /** Les seuls comptes de voisines que la règle mentionne. */
  #counts: number[];

  constructor(board: Board, rule: Rule = LIFE) {
    this.board = board;
    this.rule = rule;
    const size = board.bits.length;
    this.#scratch = new Uint32Array(size);
    this.#leftNb = new Uint32Array(size);
    this.#rightNb = new Uint32Array(size);

    const counts: number[] = [];
    for (let n = 0; n <= 8; n++) {
      if (rule.birth[n] || rule.survive[n]) counts.push(n);
    }
    this.#counts = counts;
  }

  step(): void {
    const b = this.board;
    const W = b.wordsPerRow;
    const H = b.height;
    const width = b.width;
    const torus = b.topology === 'torus';
    const tailMask = b.tailMask;
    const src = b.bits;
    const dst = this.#scratch;
    const left = this.#leftNb;
    const right = this.#rightNb;
    const nb = this.#neighbours;
    const counts = this.#counts;
    const birth = this.rule.birth;
    const survive = this.rule.survive;

    // ─── Passe 1 : décalages horizontaux ───
    for (let y = 0; y < H; y++) {
      const o = y * W;

      // left[x] = src[x-1] : on décale les bits vers le haut, en récupérant
      // le bit de poids fort du mot précédent.
      for (let w = W - 1; w >= 0; w--) {
        const prev = w > 0 ? src[o + w - 1]! : 0;
        left[o + w] = (((src[o + w]! << 1) >>> 0) | (prev >>> 31)) >>> 0;
      }

      // right[x] = src[x+1]
      for (let w = 0; w < W; w++) {
        const next = w + 1 < W ? src[o + w + 1]! : 0;
        right[o + w] = ((src[o + w]! >>> 1) | ((next << 31) >>> 0)) >>> 0;
      }

      // Recollement horizontal : colonne 0 et colonne width-1 sont voisines.
      if (torus) {
        setBit(left, o, 0, getBit(src, o, width - 1));
        setBit(right, o, width - 1, getBit(src, o, 0));
      }

      if (tailMask !== -1) {
        const last = o + W - 1;
        left[last] = (left[last]! & tailMask) >>> 0;
        right[last] = (right[last]! & tailMask) >>> 0;
      }
    }

    // ─── Passe 2 : comptage et application de la règle ───
    for (let y = 0; y < H; y++) {
      const o = y * W;

      let oU = -1;
      if (y > 0) oU = (y - 1) * W;
      else if (torus) oU = (H - 1) * W;

      let oD = -1;
      if (y < H - 1) oD = (y + 1) * W;
      else if (torus) oD = 0;

      for (let w = 0; w < W; w++) {
        nb[0] = oU >= 0 ? left[oU + w]! : 0;
        nb[1] = oU >= 0 ? src[oU + w]! : 0;
        nb[2] = oU >= 0 ? right[oU + w]! : 0;
        nb[3] = left[o + w]!;
        nb[4] = right[o + w]!;
        nb[5] = oD >= 0 ? left[oD + w]! : 0;
        nb[6] = oD >= 0 ? src[oD + w]! : 0;
        nb[7] = oD >= 0 ? right[oD + w]! : 0;

        // Additionneur binaire parallèle sur 4 bits (le compte plafonne à 8).
        let s0 = 0;
        let s1 = 0;
        let s2 = 0;
        let s3 = 0;
        for (let i = 0; i < 8; i++) {
          const v = nb[i]!;
          const c0 = s0 & v;
          s0 ^= v;
          const c1 = s1 & c0;
          s1 ^= c0;
          const c2 = s2 & c1;
          s2 ^= c1;
          s3 ^= c2;
        }

        // Pour chaque compte utile, le masque des cellules qui l'atteignent.
        let born = 0;
        let kept = 0;
        for (let k = 0; k < counts.length; k++) {
          const n = counts[k]!;
          let m = (n & 1) !== 0 ? s0 : ~s0;
          m &= (n & 2) !== 0 ? s1 : ~s1;
          m &= (n & 4) !== 0 ? s2 : ~s2;
          m &= (n & 8) !== 0 ? s3 : ~s3;
          if (birth[n]) born |= m;
          if (survive[n]) kept |= m;
        }

        const cur = src[o + w]!;
        dst[o + w] = ((~cur & born) | (cur & kept)) >>> 0;
      }

      if (tailMask !== -1) {
        const last = o + W - 1;
        dst[last] = (dst[last]! & tailMask) >>> 0;
      }
    }

    b.bits = dst;
    this.#scratch = src;
    this.generation++;
  }

  /** Avance de n générations. */
  run(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  population(): number {
    return this.board.population();
  }

  /**
   * Avance jusqu'à ce que la population soit stable pendant `window` générations
   * consécutives, ou jusqu'à `maxGenerations`. Renvoie la génération à laquelle
   * la population s'est figée pour la dernière fois, ou null si rien ne s'est
   * stabilisé.
   *
   * C'est volontairement grossier : une population constante ne prouve pas la
   * stabilité (un vaisseau qui se déplace garde sa population). Suffisant pour
   * les tests de référence, à remplacer par une vraie détection de période
   * quand le Codex arrivera.
   */
  runUntilPopulationStable(maxGenerations: number, window = 8): number | null {
    let last = this.population();
    let stableSince = this.generation;
    while (this.generation < maxGenerations) {
      this.step();
      const pop = this.population();
      if (pop !== last) {
        last = pop;
        stableSince = this.generation;
      } else if (this.generation - stableSince >= window) {
        return stableSince;
      }
    }
    return null;
  }
}
