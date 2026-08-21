// La caméra : conversion entre coordonnées cellules et pixels écran.
//
// Aucun canvas ici, que de l'arithmétique. C'est ce qui permet de vérifier
// sous Node la seule propriété du zoom qui compte vraiment : le point du monde
// sous le curseur ne doit pas bouger quand on zoome.

export interface ViewportLimits {
  /** Échelle minimale, en pixels CSS par cellule. */
  minScale: number;
  maxScale: number;
}

export const DEFAULT_LIMITS: ViewportLimits = { minScale: 0.05, maxScale: 48 };

export interface CellRange {
  /** Bornes incluses, déjà rognées sur la grille. Vide si x1 < x0. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class Viewport {
  /** Taille de la zone de dessin, en pixels CSS. */
  width = 1;
  height = 1;

  /** Cellule au centre de l'écran. Fractionnaire : le pan est continu. */
  centerX = 0;
  centerY = 0;

  /** Pixels CSS par cellule. */
  scale = 8;

  limits: ViewportLimits;

  constructor(limits: ViewportLimits = DEFAULT_LIMITS) {
    this.limits = limits;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  worldToScreen(x: number, y: number): [number, number] {
    return [
      (x - this.centerX) * this.scale + this.width / 2,
      (y - this.centerY) * this.scale + this.height / 2,
    ];
  }

  screenToWorld(px: number, py: number): [number, number] {
    return [
      (px - this.width / 2) / this.scale + this.centerX,
      (py - this.height / 2) / this.scale + this.centerY,
    ];
  }

  /** Cellule entière sous un point écran. */
  cellAt(px: number, py: number): { x: number; y: number } {
    const [wx, wy] = this.screenToWorld(px, py);
    return { x: Math.floor(wx), y: Math.floor(wy) };
  }

  panByPixels(dx: number, dy: number): void {
    this.centerX -= dx / this.scale;
    this.centerY -= dy / this.scale;
  }

  /**
   * Zoome autour d'un point écran. La cellule sous ce point reste exactement
   * sous ce point — c'est ce qui fait qu'un zoom à la molette paraît naturel
   * plutôt que de faire dériver la grille.
   */
  zoomAt(px: number, py: number, factor: number): void {
    const [wx, wy] = this.screenToWorld(px, py);
    const next = clamp(this.scale * factor, this.limits.minScale, this.limits.maxScale);
    if (next === this.scale) return;
    this.scale = next;
    this.centerX = wx - (px - this.width / 2) / next;
    this.centerY = wy - (py - this.height / 2) / next;
  }

  /** Cadre la grille entière, avec une marge en pixels. */
  fit(worldWidth: number, worldHeight: number, padding = 16): void {
    const usableW = Math.max(1, this.width - padding * 2);
    const usableH = Math.max(1, this.height - padding * 2);
    this.scale = clamp(
      Math.min(usableW / worldWidth, usableH / worldHeight),
      this.limits.minScale,
      this.limits.maxScale,
    );
    this.centerX = worldWidth / 2;
    this.centerY = worldHeight / 2;
  }

  /**
   * Cellules visibles, bornes incluses, rognées sur la grille. Le rendu ne
   * parcourt jamais plus que ça — c'est ce qui rend le coût indépendant de la
   * taille de la grille quand on est zoomé.
   */
  visibleCells(worldWidth: number, worldHeight: number): CellRange {
    const [left, top] = this.screenToWorld(0, 0);
    const [right, bottom] = this.screenToWorld(this.width, this.height);
    return {
      x0: Math.max(0, Math.floor(left)),
      y0: Math.max(0, Math.floor(top)),
      x1: Math.min(worldWidth - 1, Math.ceil(right)),
      y1: Math.min(worldHeight - 1, Math.ceil(bottom)),
    };
  }

  /** Empêche la grille de sortir complètement de l'écran. */
  clampToWorld(worldWidth: number, worldHeight: number): void {
    const marginX = this.width / 2 / this.scale;
    const marginY = this.height / 2 / this.scale;
    this.centerX = clamp(this.centerX, -marginX / 2, worldWidth + marginX / 2);
    this.centerY = clamp(this.centerY, -marginY / 2, worldHeight + marginY / 2);
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
