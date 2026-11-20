// Rendu d'une grille empaquetée en bits sur un canvas 2D.
//
// Le principe qui gouverne tout : **on itère sur les mots, pas sur les
// cellules**, et on saute les mots nuls. Le coût devient proportionnel à la
// population plutôt qu'à la surface — une grille de 4096² presque vide se
// dessine aussi vite qu'une grille de 64². Le prototype d'origine repeignait
// toute la surface et chaque ligne de grille à chaque image, d'où son plafond
// vers 150×80 cellules.
//
// Deux régimes, selon la taille d'une cellule à l'écran :
//   ≥ 3 px : un rectangle par cellule, avec un jour entre les cellules.
//   < 3 px : écriture directe des pixels, car il y aurait trop de rectangles.

import type { Viewport } from './viewport.ts';

// Interfaces minimales : rien n'oblige à charger la lib DOM pour vérifier ce
// fichier, et un canvas hors écran fait aussi bien l'affaire.

export interface ImageDataLike {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * On n'écrit jamais que des couleurs, mais un CanvasRenderingContext2D réel
 * type ces propriétés `string | CanvasGradient | CanvasPattern`. L'interface
 * doit rester au moins aussi large pour qu'un contexte réel lui soit
 * assignable sans conversion.
 */
export type PaintStyle = string | object;

export interface Ctx2DLike {
  fillStyle: PaintStyle;
  strokeStyle: PaintStyle;
  lineWidth: number;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  createImageData(w: number, h: number): ImageDataLike;
  putImageData(image: ImageDataLike, dx: number, dy: number): void;
}

export interface Frame {
  bits: Uint32Array;
  wordsPerRow: number;
  width: number;
  height: number;
  /**
   * Nécessaire à la rémanence : le rendu tourne à 60 images par seconde, la
   * simulation à 30 générations. Sans ce repère, l'historique se décalerait à
   * chaque image et les traînées clignoteraient.
   */
  generation?: number | undefined;
}

export interface RenderStyle {
  /** Fond hors grille. */
  surface: string;
  /** Fond de la grille elle-même. */
  field: string;
  cell: string;
  grid: string;
  /** Bordure de la grille, pour voir où le monde s'arrête. */
  edge: string;
  /** Curseur de navigation clavier. */
  cursor: string;
  /**
   * Rémanence phosphore. Absent : rendu binaire, une cellule s'éteint d'un
   * coup. Présent : elle s'éteint en deux trames et les naissances ont un
   * éclat plus vif — c'est ce qui sépare une grille qui clignote d'un
   * organisme qui respire.
   */
  trail?: { born: string; fade1: string; fade2: string } | undefined;
}

export interface Overlay {
  /**
   * Cellule désignée au clavier. Sans elle, la grille est inutilisable sans
   * souris — et une grille de cellules est justement ce qu'il y a de plus
   * difficile à parcourir au clavier.
   */
  cursor?: { x: number; y: number } | null;
}

export interface RenderStats {
  /** Cellules effectivement dessinées. Utile pour vérifier qu'on n'en fait pas trop. */
  drawn: number;
  /** Mots parcourus, nuls compris. */
  wordsScanned: number;
  mode: 'rects' | 'pixels';
  milliseconds: number;
}

/**
 * Une couche de rendu : une couleur, et le masque de bits qui la reçoit.
 * `cur` est la trame courante, `p1` la génération précédente, `p2` celle
 * d'avant. Les quatre masques sont disjoints par construction.
 */
interface Layer {
  colour: string;
  mask: (cur: number, p1: number, p2: number) => number;
}

/** En dessous, une cellule est trop petite pour un rectangle : on passe aux pixels. */
const PIXEL_MODE_BELOW = 3;
/** Au-dessus, on trace le quadrillage. */
const GRID_LINES_ABOVE = 8;

export class GridRenderer {
  #ctx: Ctx2DLike;
  #image: ImageDataLike | null = null;
  #imageWords: Uint32Array | null = null;

  /**
   * Trois tampons, pas deux.
   *
   * `#gen1` et `#gen2` sont les deux générations précédentes, figées pendant
   * toute la durée d'affichage de la génération courante. `#saved` accumule la
   * trame en cours pour devenir `#gen1` au prochain changement de génération.
   *
   * Sans ce troisième tampon, la rotation se ferait à la fin de la première
   * image d'une génération et les images suivantes de la *même* génération
   * afficheraient une rémanence différente — un scintillement à 60 Hz.
   */
  #gen1: Uint32Array | null = null;
  #gen2: Uint32Array | null = null;
  #saved: Uint32Array | null = null;
  #lastGeneration = Number.NaN;

  style: RenderStyle;

  constructor(ctx: Ctx2DLike, style: RenderStyle) {
    this.#ctx = ctx;
    this.style = style;
  }

  render(frame: Frame, viewport: Viewport, dpr: number, overlay?: Overlay): RenderStats {
    const started = performanceNow();
    const ctx = this.#ctx;
    const deviceWidth = Math.max(1, Math.round(viewport.width * dpr));
    const deviceHeight = Math.max(1, Math.round(viewport.height * dpr));

    // Tout se calcule en pixels physiques : la transformation du canvas reste
    // l'identité, ce qui évite d'avoir à raisonner en deux unités à la fois.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    const scale = viewport.scale * dpr;
    const originX = (viewport.width / 2 - viewport.centerX * viewport.scale) * dpr;
    const originY = (viewport.height / 2 - viewport.centerY * viewport.scale) * dpr;

    ctx.fillStyle = this.style.surface;
    ctx.fillRect(0, 0, deviceWidth, deviceHeight);

    const fieldX = originX;
    const fieldY = originY;
    const fieldW = frame.width * scale;
    const fieldH = frame.height * scale;
    ctx.fillStyle = this.style.field;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    const range = viewport.visibleCells(frame.width, frame.height);
    this.#advanceHistory(frame);
    const layers = this.#layers();

    let stats: RenderStats;
    if (range.x1 < range.x0 || range.y1 < range.y0) {
      stats = { drawn: 0, wordsScanned: 0, mode: 'rects', milliseconds: 0 };
    } else if (scale >= PIXEL_MODE_BELOW) {
      stats = this.#drawRects(frame, range, scale, originX, originY, layers);
      if (scale >= GRID_LINES_ABOVE) {
        this.#drawGrid(range, scale, originX, originY, deviceWidth, deviceHeight);
      }
    } else {
      stats = this.#drawPixels(
        frame,
        range,
        scale,
        originX,
        originY,
        deviceWidth,
        deviceHeight,
        layers,
      );
    }

    if (this.#saved) this.#saved.set(frame.bits);

    ctx.strokeStyle = this.style.edge;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    strokeRect(ctx, fieldX, fieldY, fieldW, fieldH);
    ctx.stroke();

    const cursor = overlay?.cursor;
    if (cursor) {
      // Toujours au moins trois pixels de côté : à fort dézoom, une cellule
      // fait moins d'un pixel et le curseur deviendrait invisible.
      const side = Math.max(3 * dpr, scale);
      const cx = cursor.x * scale + originX;
      const cy = cursor.y * scale + originY;
      ctx.strokeStyle = this.style.cursor;
      ctx.lineWidth = Math.max(1, Math.round(dpr));
      ctx.beginPath();
      strokeRect(
        ctx,
        Math.round(cx) - dpr,
        Math.round(cy) - dpr,
        Math.round(side) + dpr * 2,
        Math.round(side) + dpr * 2,
      );
      ctx.stroke();
    }

    stats.milliseconds = performanceNow() - started;
    return stats;
  }

  /**
   * Découpe la trame en couches de rémanence. Sans `style.trail`, une seule
   * couche : le rendu binaire d'avant.
   */
  #layers(): Layer[] {
    const trail = this.style.trail;
    if (!trail || !this.#gen1 || !this.#gen2) {
      return [{ colour: this.style.cell, mask: (cur) => cur }];
    }
    // Du plus éteint au plus vif : les couches se peignent dans cet ordre.
    return [
      { colour: trail.fade2, mask: (cur, p1, p2) => p2 & ~p1 & ~cur },
      { colour: trail.fade1, mask: (cur, p1) => p1 & ~cur },
      { colour: this.style.cell, mask: (cur, p1) => cur & p1 },
      { colour: trail.born, mask: (cur, p1) => cur & ~p1 },
    ];
  }

  /**
   * Fait tourner l'historique, une seule fois par génération et *avant* le
   * dessin : toutes les images d'une même génération montrent la même chose.
   */
  #advanceHistory(frame: Frame): void {
    if (!this.style.trail) return;

    const size = frame.bits.length;
    if (!this.#gen1 || this.#gen1.length !== size) {
      this.#gen1 = new Uint32Array(size);
      this.#gen2 = new Uint32Array(size);
      this.#saved = new Uint32Array(size);
      this.#lastGeneration = Number.NaN;
    }

    const generation = frame.generation ?? 0;
    if (generation === this.#lastGeneration) return;
    this.#lastGeneration = generation;
    this.#gen2!.set(this.#gen1);
    this.#gen1.set(this.#saved!);
  }

  // ─────────────────────── Régime « rectangles » ───────────────────────

  #drawRects(
    frame: Frame,
    range: { x0: number; y0: number; x1: number; y1: number },
    scale: number,
    originX: number,
    originY: number,
    layers: Layer[],
  ): RenderStats {
    const ctx = this.#ctx;

    // Un jour d'un pixel entre les cellules dès qu'elles sont assez grandes :
    // c'est ce qui donne l'aspect « grille » sans tracer une seule ligne.
    const gap = scale >= 6 ? 1 : 0;
    const size = Math.max(1, Math.round(scale) - gap);

    const wordStart = range.x0 >>> 5;
    const wordEnd = range.x1 >>> 5;
    const g1 = this.#gen1;
    const g2 = this.#gen2;
    let drawn = 0;
    let wordsScanned = 0;

    // Une passe par couche : la couleur ne change qu'une fois par couche au
    // lieu d'une fois par cellule, et les mots nuls se sautent aussi vite.
    for (const layer of layers) {
      ctx.fillStyle = layer.colour;

      for (let y = range.y0; y <= range.y1; y++) {
        const rowOffset = y * frame.wordsPerRow;
        const py = Math.round(y * scale + originY);

        for (let w = wordStart; w <= wordEnd; w++) {
          const i = rowOffset + w;
          let word = layer.mask(frame.bits[i]!, g1 ? g1[i]! : 0, g2 ? g2[i]! : 0);
          wordsScanned++;
          if (word === 0) continue;

          const baseX = w << 5;
          while (word !== 0) {
            // Bit de poids le plus faible encore allumé.
            const lowest = word & -word;
            const bit = 31 - Math.clz32(lowest);
            const x = baseX + bit;
            if (x >= range.x0 && x <= range.x1) {
              ctx.fillRect(Math.round(x * scale + originX), py, size, size);
              drawn++;
            }
            word ^= lowest;
          }
        }
      }
    }

    return { drawn, wordsScanned, mode: 'rects', milliseconds: 0 };
  }

  // ───────────────────────── Régime « pixels » ─────────────────────────

  #drawPixels(
    frame: Frame,
    range: { x0: number; y0: number; x1: number; y1: number },
    scale: number,
    originX: number,
    originY: number,
    deviceWidth: number,
    deviceHeight: number,
    layers: Layer[],
  ): RenderStats {
    const ctx = this.#ctx;

    if (
      !this.#image ||
      this.#image.width !== deviceWidth ||
      this.#image.height !== deviceHeight
    ) {
      this.#image = ctx.createImageData(deviceWidth, deviceHeight);
      this.#imageWords = new Uint32Array(this.#image.data.buffer);
    }
    const pixels = this.#imageWords!;

    // Le fond est peint dans le tampon lui-même : putImageData remplace les
    // pixels au lieu de composer, un fond transparent effacerait le canvas.
    pixels.fill(packColour(this.style.field));

    const wordStart = range.x0 >>> 5;
    const wordEnd = range.x1 >>> 5;
    const g1 = this.#gen1;
    const g2 = this.#gen2;
    let drawn = 0;
    let wordsScanned = 0;

    for (const layer of layers) {
      const colour = packColour(layer.colour);

      for (let y = range.y0; y <= range.y1; y++) {
        const rowOffset = y * frame.wordsPerRow;
        const py = (y * scale + originY) | 0;
        if (py < 0 || py >= deviceHeight) continue;
        const rowBase = py * deviceWidth;

        for (let w = wordStart; w <= wordEnd; w++) {
          const i = rowOffset + w;
          let word = layer.mask(frame.bits[i]!, g1 ? g1[i]! : 0, g2 ? g2[i]! : 0);
          wordsScanned++;
          if (word === 0) continue;

          const baseX = w << 5;
          while (word !== 0) {
            const lowest = word & -word;
            const bit = 31 - Math.clz32(lowest);
            const x = baseX + bit;
            word ^= lowest;
            if (x < range.x0 || x > range.x1) continue;
            const px = (x * scale + originX) | 0;
            if (px < 0 || px >= deviceWidth) continue;
            pixels[rowBase + px] = colour;
            drawn++;
          }
        }
      }
    }

    ctx.putImageData(this.#image, 0, 0);
    return { drawn, wordsScanned, mode: 'pixels', milliseconds: 0 };
  }

  #drawGrid(
    range: { x0: number; y0: number; x1: number; y1: number },
    scale: number,
    originX: number,
    originY: number,
    deviceWidth: number,
    deviceHeight: number,
  ): void {
    const ctx = this.#ctx;
    ctx.strokeStyle = this.style.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = range.x0; x <= range.x1 + 1; x++) {
      const px = Math.round(x * scale + originX) + 0.5;
      if (px < 0 || px > deviceWidth) continue;
      ctx.moveTo(px, Math.max(0, range.y0 * scale + originY));
      ctx.lineTo(px, Math.min(deviceHeight, (range.y1 + 1) * scale + originY));
    }
    for (let y = range.y0; y <= range.y1 + 1; y++) {
      const py = Math.round(y * scale + originY) + 0.5;
      if (py < 0 || py > deviceHeight) continue;
      ctx.moveTo(Math.max(0, range.x0 * scale + originX), py);
      ctx.lineTo(Math.min(deviceWidth, (range.x1 + 1) * scale + originX), py);
    }
    ctx.stroke();
  }
}

function strokeRect(ctx: Ctx2DLike, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y);
}

/**
 * « #rrggbb » vers un entier 32 bits dans l'ordre d'octets de la machine, pour
 * écrire un pixel RGBA en une seule affectation.
 */
export function packColour(hex: string): number {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean[0]! + clean[0]! + clean[1]! + clean[1]! + clean[2]! + clean[2]!
      : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return 0xff000000;
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  // Non signé : la valeur va dans un Uint32Array, et une comparaison avec un
  // int32 négatif porteur des mêmes bits échouerait.
  return (
    (isLittleEndian()
      ? (0xff << 24) | (b << 16) | (g << 8) | r
      : (r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0
  );
}

let littleEndian: boolean | null = null;
function isLittleEndian(): boolean {
  if (littleEndian === null) {
    const probe = new Uint32Array([0x11223344]);
    littleEndian = new Uint8Array(probe.buffer)[0] === 0x44;
  }
  return littleEndian;
}

function performanceNow(): number {
  const g = globalThis as { performance?: { now(): number } };
  return g.performance ? g.performance.now() : 0;
}
