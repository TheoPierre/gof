import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board } from '@zp/engine';

import {
  GridRenderer,
  Viewport,
  packColour,
  type Ctx2DLike,
  type Frame,
  type ImageDataLike,
  type RenderStyle,
} from '../src/index.ts';

const STYLE: RenderStyle = {
  surface: '#0a0a0a',
  field: '#050505',
  cell: '#ff9b3d',
  grid: '#221a10',
  edge: '#3a2a18',
  cursor: '#ffd9a8',
};

/** Canvas d'essai : enregistre au lieu de dessiner. */
class FakeCtx implements Ctx2DLike {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  globalAlpha = 1;

  rects: Array<{ x: number; y: number; w: number; h: number; style: string }> = [];
  strokes = 0;
  images: ImageDataLike[] = [];

  fillRect(x: number, y: number, w: number, h: number): void {
    this.rects.push({ x, y, w, h, style: this.fillStyle });
  }
  setTransform(): void {}
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  stroke(): void {
    this.strokes++;
  }
  createImageData(w: number, h: number): ImageDataLike {
    return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
  }
  putImageData(image: ImageDataLike): void {
    this.images.push(image);
  }

  /** Rectangles de cellules, hors fonds. */
  cellRects(): typeof this.rects {
    return this.rects.filter((r) => r.style === STYLE.cell);
  }
}

function frameOf(board: Board): Frame {
  return {
    bits: board.bits,
    wordsPerRow: board.wordsPerRow,
    width: board.width,
    height: board.height,
  };
}

// ───────────────────────── Caméra ─────────────────────────

test('monde et écran font l\'aller-retour', () => {
  const vp = new Viewport();
  vp.resize(800, 600);
  vp.centerX = 42.5;
  vp.centerY = 17.25;
  vp.scale = 6.5;

  for (const [x, y] of [
    [0, 0],
    [42.5, 17.25],
    [-13, 900],
  ] as const) {
    const [px, py] = vp.worldToScreen(x, y);
    const [bx, by] = vp.screenToWorld(px, py);
    assert.ok(Math.abs(bx - x) < 1e-9, `x ${bx} ≠ ${x}`);
    assert.ok(Math.abs(by - y) < 1e-9, `y ${by} ≠ ${y}`);
  }
});

test('zoomer laisse la cellule sous le curseur exactement sous le curseur', () => {
  // C'est la seule propriété du zoom qui compte : sans elle, la grille dérive
  // sous la souris et le zoom paraît cassé.
  const vp = new Viewport();
  vp.resize(1024, 768);
  vp.centerX = 100;
  vp.centerY = 100;
  vp.scale = 4;

  const anchor: [number, number] = [317, 259];
  const before = vp.screenToWorld(...anchor);

  for (const factor of [1.2, 1.2, 1.2, 0.5, 0.8, 3]) {
    vp.zoomAt(anchor[0], anchor[1], factor);
    const after = vp.screenToWorld(...anchor);
    assert.ok(Math.abs(after[0] - before[0]) < 1e-9, `dérive en x : ${after[0]} ≠ ${before[0]}`);
    assert.ok(Math.abs(after[1] - before[1]) < 1e-9, `dérive en y : ${after[1]} ≠ ${before[1]}`);
  }
});

test('le zoom reste dans ses bornes', () => {
  const vp = new Viewport();
  vp.resize(800, 600);
  for (let i = 0; i < 200; i++) vp.zoomAt(400, 300, 1.5);
  assert.equal(vp.scale, vp.limits.maxScale);
  for (let i = 0; i < 400; i++) vp.zoomAt(400, 300, 0.7);
  assert.equal(vp.scale, vp.limits.minScale);
});

test('« fit » cadre la grille entière', () => {
  const vp = new Viewport();
  vp.resize(800, 600);
  vp.fit(200, 100, 20);

  assert.equal(vp.centerX, 100);
  assert.equal(vp.centerY, 50);

  const [left, top] = vp.worldToScreen(0, 0);
  const [right, bottom] = vp.worldToScreen(200, 100);
  assert.ok(left >= 0 && top >= 0, `coin haut-gauche visible : ${left},${top}`);
  assert.ok(right <= 800 && bottom <= 600, `coin bas-droit visible : ${right},${bottom}`);
});

test('les cellules visibles sont rognées sur la grille', () => {
  const vp = new Viewport();
  vp.resize(400, 300);
  vp.scale = 10;
  vp.centerX = 0;
  vp.centerY = 0;

  const range = vp.visibleCells(1000, 1000);
  assert.equal(range.x0, 0, 'jamais de colonne négative');
  assert.equal(range.y0, 0);
  assert.ok(range.x1 < 1000 && range.y1 < 1000);

  vp.centerX = 5000;
  const far = vp.visibleCells(1000, 1000);
  assert.ok(far.x1 < far.x0, 'hors de la grille : intervalle vide');
});

test('le panoramique est l\'inverse du déplacement souris', () => {
  const vp = new Viewport();
  vp.resize(800, 600);
  vp.scale = 10;
  const before = vp.screenToWorld(400, 300);
  vp.panByPixels(100, 0);
  const after = vp.screenToWorld(400, 300);
  assert.ok(Math.abs(after[0] - (before[0] - 10)) < 1e-9, 'tirer à droite montre la gauche');
});

// ───────────────────────── Rendu ─────────────────────────

test('un rectangle par cellule vivante, et rien pour les mots nuls', () => {
  const board = new Board(256, 64, 'bounded');
  board.set(0, 0, 1);
  board.set(255, 63, 1);
  board.set(130, 20, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  // Assez large pour montrer les 256 colonnes à 4 px/cellule : régime rectangles.
  vp.resize(1200, 400);
  vp.scale = 4;
  vp.centerX = 128;
  vp.centerY = 32;

  const stats = new GridRenderer(ctx, STYLE).render(frameOf(board), vp, 1);

  assert.equal(stats.mode, 'rects');
  assert.equal(stats.drawn, 3, 'exactement les trois cellules vivantes');
  assert.equal(ctx.cellRects().length, 3);
  // 8 mots par ligne, 64 lignes visibles : le balayage reste borné.
  assert.ok(stats.wordsScanned <= 8 * 64, `mots parcourus : ${stats.wordsScanned}`);
});

test('le coût suit la population, pas la surface', () => {
  // Une grille immense presque vide doit coûter le prix de ses trois cellules.
  const board = new Board(4096, 4096, 'bounded');
  board.set(2048, 2048, 1);
  board.set(2049, 2048, 1);
  board.set(2050, 2048, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(800, 600);
  vp.centerX = 2049;
  vp.centerY = 2048;
  vp.scale = 8;

  const stats = new GridRenderer(ctx, STYLE).render(frameOf(board), vp, 1);
  assert.equal(stats.drawn, 3);
  assert.ok(stats.wordsScanned < 400, `mots parcourus : ${stats.wordsScanned}`);
});

test('les cellules hors champ ne sont pas dessinées', () => {
  const board = new Board(512, 512, 'bounded');
  for (let x = 0; x < 512; x++) board.set(x, 256, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(320, 240);
  vp.scale = 8; // 40 colonnes visibles environ
  vp.centerX = 256;
  vp.centerY = 256;

  const stats = new GridRenderer(ctx, STYLE).render(frameOf(board), vp, 1);
  assert.ok(stats.drawn > 30 && stats.drawn < 60, `dessinées : ${stats.drawn} sur 512`);
});

test('en dessous de 3 pixels par cellule, on bascule sur les pixels', () => {
  const board = new Board(1024, 512, 'bounded');
  for (let i = 0; i < 500; i++) board.set(i * 2, i % 512, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(600, 400);
  vp.fit(1024, 512);

  const stats = new GridRenderer(ctx, STYLE).render(frameOf(board), vp, 1);
  assert.equal(stats.mode, 'pixels');
  assert.equal(ctx.images.length, 1, 'une seule remise de tampon');
  assert.ok(stats.drawn > 0);
  assert.equal(ctx.cellRects().length, 0, 'aucun rectangle dans ce régime');
});

test('le fond est peint dans le tampon de pixels', () => {
  // putImageData remplace les pixels sans composer : un tampon transparent
  // effacerait le canvas au lieu de laisser voir le fond.
  const board = new Board(512, 256, 'bounded');
  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(400, 300);
  vp.fit(512, 256);

  new GridRenderer(ctx, STYLE).render(frameOf(board), vp, 1);
  const image = ctx.images[0]!;
  const words = new Uint32Array(image.data.buffer);
  assert.equal(words[0], packColour(STYLE.field), 'le premier pixel porte la couleur du fond');
  assert.notEqual(words[0], 0, 'et surtout, il n\'est pas transparent');
});

test('le quadrillage n\'apparaît qu\'une fois les cellules assez grandes', () => {
  const board = new Board(64, 64, 'bounded');
  const vp = new Viewport();
  vp.resize(400, 400);
  vp.centerX = 32;
  vp.centerY = 32;

  const small = new FakeCtx();
  vp.scale = 5;
  new GridRenderer(small, STYLE).render(frameOf(board), vp, 1);

  const large = new FakeCtx();
  vp.scale = 12;
  new GridRenderer(large, STYLE).render(frameOf(board), vp, 1);

  assert.equal(small.strokes, 1, 'seulement le contour de la grille');
  assert.equal(large.strokes, 2, 'contour + quadrillage');
});

test('le curseur clavier est tracé, et reste visible à fort dézoom', () => {
  const board = new Board(1024, 1024, 'bounded');
  const vp = new Viewport();
  vp.resize(400, 300);
  vp.centerX = 512;
  vp.centerY = 512;

  const sans = new FakeCtx();
  vp.scale = 10;
  new GridRenderer(sans, STYLE).render(frameOf(board), vp, 1);

  const avec = new FakeCtx();
  new GridRenderer(avec, STYLE).render(frameOf(board), vp, 1, { cursor: { x: 512, y: 512 } });
  assert.equal(avec.strokes, sans.strokes + 1, 'un tracé de plus que sans curseur');

  // À 0,2 px par cellule, un curseur à l'échelle serait invisible.
  const minuscule = new FakeCtx();
  vp.scale = 0.2;
  const renderer = new GridRenderer(minuscule, STYLE);
  renderer.render(frameOf(board), vp, 1, { cursor: { x: 512, y: 512 } });
  assert.ok(minuscule.strokes >= 2, 'le curseur est tout de même tracé');
});

test('packColour rend un pixel opaque', () => {
  const orange = packColour('#ff9b3d');
  const bytes = new Uint8Array(new Uint32Array([orange]).buffer);
  assert.deepEqual([...bytes].sort((a, b) => a - b), [0x3d, 0x9b, 0xff, 0xff].sort((a, b) => a - b));
  assert.equal(packColour('#f93'), packColour('#ff9933'));
});

// ───────────────────── Rémanence phosphore ─────────────────────

const TRAIL: RenderStyle = {
  ...STYLE,
  trail: { born: '#fff0d8', fade1: '#7f5a2a', fade2: '#2f2211' },
};

test('sans trail, le rendu reste binaire', () => {
  const board = new Board(64, 8, 'bounded');
  board.set(10, 4, 1);
  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(600, 200);
  vp.scale = 6;
  vp.centerX = 32;
  vp.centerY = 4;

  const r = new GridRenderer(ctx, STYLE);
  r.render({ ...frameOf(board), generation: 0 }, vp, 1);
  board.set(10, 4, 0);
  board.set(11, 4, 1);
  const stats = r.render({ ...frameOf(board), generation: 1 }, vp, 1);

  assert.equal(stats.drawn, 1, 'une seule cellule, aucune traînée');
});

test('avec trail, une cellule qui meurt laisse deux trames de rémanence', () => {
  const board = new Board(64, 8, 'bounded');
  board.set(10, 4, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(600, 200);
  vp.scale = 6;
  vp.centerX = 32;
  vp.centerY = 4;
  const r = new GridRenderer(ctx, TRAIL);

  // Génération 0 : la cellule naît (aucun historique encore).
  r.render({ ...frameOf(board), generation: 0 }, vp, 1);

  // Génération 1 : elle est toujours là — couche « vivante ».
  let s = r.render({ ...frameOf(board), generation: 1 }, vp, 1);
  assert.equal(s.drawn, 1);

  // Génération 2 : elle meurt. Il doit rester sa trace la plus vive.
  board.set(10, 4, 0);
  s = r.render({ ...frameOf(board), generation: 2 }, vp, 1);
  assert.equal(s.drawn, 1, 'première trame de rémanence');
  assert.equal(ctx.rects.at(-1)?.style, TRAIL.trail!.fade1);

  // Génération 3 : la trace faiblit d'un cran.
  s = r.render({ ...frameOf(board), generation: 3 }, vp, 1);
  assert.equal(s.drawn, 1, 'seconde trame de rémanence');
  assert.equal(ctx.rects.at(-1)?.style, TRAIL.trail!.fade2);

  // Génération 4 : plus rien.
  s = r.render({ ...frameOf(board), generation: 4 }, vp, 1);
  assert.equal(s.drawn, 0, 'la trace est éteinte');
});

test('une naissance se distingue d\'une cellule déjà vivante', () => {
  const board = new Board(64, 8, 'bounded');
  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(600, 200);
  vp.scale = 6;
  vp.centerX = 32;
  vp.centerY = 4;
  const r = new GridRenderer(ctx, TRAIL);

  board.set(10, 4, 1);
  r.render({ ...frameOf(board), generation: 0 }, vp, 1);
  r.render({ ...frameOf(board), generation: 1 }, vp, 1);

  board.set(11, 4, 1); // voisine nouvelle
  ctx.rects.length = 0;
  r.render({ ...frameOf(board), generation: 2 }, vp, 1);

  const styles = ctx.rects.filter((x) => x.style !== STYLE.surface && x.style !== STYLE.field);
  assert.equal(styles.length, 2);
  assert.equal(styles[0]?.style, STYLE.cell, 'la cellule déjà vivante garde l\'ambre');
  assert.equal(styles[1]?.style, TRAIL.trail!.born, 'la nouvelle a l\'éclat de naissance');
});

test('l\'historique ne tourne pas entre deux images de la même génération', () => {
  // Le rendu tourne à 60 images/s pour 30 générations : sans ce garde-fou,
  // les traînées clignoteraient une image sur deux.
  const board = new Board(64, 8, 'bounded');
  board.set(10, 4, 1);

  const ctx = new FakeCtx();
  const vp = new Viewport();
  vp.resize(600, 200);
  vp.scale = 6;
  vp.centerX = 32;
  vp.centerY = 4;
  const r = new GridRenderer(ctx, TRAIL);

  r.render({ ...frameOf(board), generation: 0 }, vp, 1);
  r.render({ ...frameOf(board), generation: 1 }, vp, 1);
  board.set(10, 4, 0);

  // Trois images consécutives sur la même génération : résultat identique.
  const a = r.render({ ...frameOf(board), generation: 2 }, vp, 1);
  const styleA = ctx.rects.at(-1)?.style;
  const b = r.render({ ...frameOf(board), generation: 2 }, vp, 1);
  const styleB = ctx.rects.at(-1)?.style;
  const c = r.render({ ...frameOf(board), generation: 2 }, vp, 1);
  const styleC = ctx.rects.at(-1)?.style;

  assert.equal(a.drawn, 1);
  assert.equal(b.drawn, 1);
  assert.equal(c.drawn, 1);
  assert.equal(styleA, TRAIL.trail!.fade1);
  assert.equal(styleB, styleA, 'image 2 identique');
  assert.equal(styleC, styleA, 'image 3 identique');
});
