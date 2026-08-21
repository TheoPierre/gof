// Grille de cellules empaquetée en bits.
//
// Une cellule = un bit. La colonne x de la ligne y vit dans le mot
// bits[y * wordsPerRow + (x >>> 5)], au bit (x & 31), le bit 0 étant la
// colonne la plus à gauche du mot. Les bits au-delà de `width` dans le
// dernier mot d'une ligne sont toujours à zéro : c'est l'invariant que
// maskRow maintient, et dont dépend toute la logique de décalage.

export type Topology = 'torus' | 'bounded';

export type Coord = readonly [x: number, y: number];

export class Board {
  readonly width: number;
  readonly height: number;
  readonly topology: Topology;
  readonly wordsPerRow: number;
  /** Masque du dernier mot d'une ligne. 0xFFFFFFFF si width est multiple de 32. */
  readonly tailMask: number;
  /** Non readonly : le pas de simulation permute deux tampons. */
  bits: Uint32Array;

  constructor(width: number, height: number, topology: Topology = 'torus') {
    if (!Number.isInteger(width) || width < 1) throw new Error(`width invalide : ${width}`);
    if (!Number.isInteger(height) || height < 1) throw new Error(`height invalide : ${height}`);

    this.width = width;
    this.height = height;
    this.topology = topology;
    this.wordsPerRow = (width + 31) >>> 5;

    const tail = width & 31;
    this.tailMask = tail === 0 ? -1 : (((1 << tail) >>> 0) - 1) | 0;

    this.bits = new Uint32Array(this.wordsPerRow * height);
  }

  get(x: number, y: number): 0 | 1 {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    const w = this.bits[y * this.wordsPerRow + (x >>> 5)]!;
    return ((w >>> (x & 31)) & 1) as 0 | 1;
  }

  set(x: number, y: number, alive: boolean | 0 | 1): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = y * this.wordsPerRow + (x >>> 5);
    const mask = (1 << (x & 31)) >>> 0;
    if (alive) this.bits[i] = (this.bits[i]! | mask) >>> 0;
    else this.bits[i] = (this.bits[i]! & ~mask) >>> 0;
  }

  toggle(x: number, y: number): void {
    this.set(x, y, !this.get(x, y));
  }

  clear(): void {
    this.bits.fill(0);
  }

  /** Remet à zéro les bits parasites au-delà de `width`. */
  maskRows(): void {
    if (this.tailMask === -1) return;
    const last = this.wordsPerRow - 1;
    for (let y = 0; y < this.height; y++) {
      const i = y * this.wordsPerRow + last;
      this.bits[i] = (this.bits[i]! & this.tailMask) >>> 0;
    }
  }

  population(): number {
    let total = 0;
    const bits = this.bits;
    for (let i = 0; i < bits.length; i++) {
      // popcount 32 bits, algorithme de Hacker's Delight
      let v = bits[i]!;
      v = v - ((v >>> 1) & 0x55555555);
      v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
      v = (v + (v >>> 4)) & 0x0f0f0f0f;
      total += (Math.imul(v, 0x01010101) >>> 24);
    }
    return total;
  }

  clone(): Board {
    const copy = new Board(this.width, this.height, this.topology);
    copy.bits.set(this.bits);
    return copy;
  }

  equals(other: Board): boolean {
    if (other.width !== this.width || other.height !== this.height) return false;
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i] !== other.bits[i]) return false;
    }
    return true;
  }

  /** Coordonnées des cellules vivantes, triées (y puis x). Ordre stable, donc comparable. */
  toCoords(): Coord[] {
    const out: Coord[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y)) out.push([x, y]);
      }
    }
    return out;
  }

  /** Boîte englobante des cellules vivantes, ou null si la grille est vide. */
  bbox(): { x: number; y: number; width: number; height: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.get(x, y)) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX === -Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  /** Écrit un motif, son coin haut-gauche placé en (ox, oy). */
  stamp(coords: Iterable<Coord>, ox = 0, oy = 0): void {
    for (const [x, y] of coords) this.set(x + ox, y + oy, 1);
  }

  /**
   * Construit une grille depuis un dessin ASCII : « O » ou « * » = vivante,
   * tout le reste = morte. Pratique pour écrire des tests lisibles.
   */
  static fromAscii(rows: readonly string[], topology: Topology = 'torus'): Board {
    const height = rows.length;
    const width = Math.max(...rows.map((r) => r.length));
    const board = new Board(width, height, topology);
    for (let y = 0; y < height; y++) {
      const row = rows[y]!;
      for (let x = 0; x < row.length; x++) {
        const c = row[x]!;
        if (c === 'O' || c === 'o' || c === '*' || c === '1') board.set(x, y, 1);
      }
    }
    return board;
  }

  toAscii(alive = 'O', dead = '.'): string {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) {
      let line = '';
      for (let x = 0; x < this.width; x++) line += this.get(x, y) ? alive : dead;
      lines.push(line);
    }
    return lines.join('\n');
  }
}
