// Vecteurs de référence du moteur.
//
// Chaque assertion de ce fichier est un fait publié sur le Jeu de la Vie
// depuis des décennies. Si l'un d'eux tombe, le moteur est faux — et tout
// classement calculé avec lui l'est aussi.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, Life, LIFE, parseRule } from '../src/index.ts';
import { ACORN, BLINKER, BLOCK, DIEHARD, GLIDER, R_PENTOMINO } from './patterns.ts';

/** Place un motif ASCII au centre d'une grille vierge. */
function centred(pattern: readonly string[], size: number, topology: 'torus' | 'bounded'): Life {
  const src = Board.fromAscii(pattern);
  const board = new Board(size, size, topology);
  const ox = (size - src.width) >> 1;
  const oy = (size - src.height) >> 1;
  board.stamp(src.toCoords(), ox, oy);
  return new Life(board, LIFE);
}

// ───────────────────────── Règles ─────────────────────────

test('parseRule accepte les deux notations en usage', () => {
  assert.equal(parseRule('B3/S23').name, 'B3/S23');
  assert.equal(parseRule('b3/s23').name, 'B3/S23');
  assert.equal(parseRule('B3S23').name, 'B3/S23');
  // Notation historique : survie d'abord, naissance ensuite.
  assert.equal(parseRule('23/3').name, 'B3/S23');
  assert.equal(parseRule('B36/S23').name, 'B36/S23');
  assert.equal(parseRule('B2/S').name, 'B2/S');
});

test('parseRule refuse ce qu\'elle ne comprend pas', () => {
  assert.throws(() => parseRule('B9/S23'));
  assert.throws(() => parseRule('boum'));
  assert.throws(() => parseRule(''));
});

// ───────────────────── Empaquetage des bits ─────────────────────

test('la grille survit à une largeur qui n\'est pas un multiple de 32', () => {
  for (const width of [1, 5, 31, 32, 33, 63, 64, 65, 100]) {
    const b = new Board(width, 3, 'bounded');
    b.set(0, 0, 1);
    b.set(width - 1, 2, 1);
    assert.equal(b.get(0, 0), 1, `width=${width}`);
    assert.equal(b.get(width - 1, 2), 1, `width=${width}`);
    assert.equal(b.population(), width === 1 ? 2 : 2, `width=${width}`);
    // Aucun bit parasite au-delà de la dernière colonne.
    b.maskRows();
    assert.equal(b.population(), 2, `width=${width}`);
  }
});

test('une nature morte ne bouge pas', () => {
  const life = centred(BLOCK, 16, 'torus');
  const before = life.board.toAscii();
  life.run(20);
  assert.equal(life.board.toAscii(), before);
  assert.equal(life.population(), 4);
});

// ─────────────────────── Vecteurs canoniques ───────────────────────

test('Blinker : période 2, position inchangée', () => {
  const life = centred(BLINKER, 16, 'torus');
  const gen0 = life.board.toAscii();

  life.step();
  assert.notEqual(life.board.toAscii(), gen0, 'la génération 1 doit différer');
  assert.equal(life.population(), 3);

  life.step();
  assert.equal(life.board.toAscii(), gen0, 'la génération 2 doit revenir à l\'état initial');

  life.run(98);
  assert.equal(life.board.toAscii(), gen0, 'après 100 générations, pareil');
});

test('Planeur : translation de (1,1) toutes les 4 générations', () => {
  const size = 40;
  const life = centred(GLIDER, size, 'bounded');
  const start = life.board.toCoords();

  for (let cycle = 1; cycle <= 6; cycle++) {
    life.run(4);
    const expected = start.map(([x, y]) => [x + cycle, y + cycle]);
    assert.deepEqual(life.board.toCoords(), expected, `après ${cycle * 4} générations`);
  }
});

test('Planeur sur un tore : retour au point de départ après 4N générations', () => {
  // Le recollement des bords est la propriété que le prototype n'avait pas.
  // On l'éprouve sur une largeur multiple de 32 et sur une qui ne l'est pas.
  for (const n of [16, 20, 32, 33]) {
    const life = centred(GLIDER, n, 'torus');
    const start = life.board.toAscii();
    life.run(4 * n);
    assert.equal(life.board.toAscii(), start, `tore ${n}×${n}`);
  }
});

test('Diehard : population nulle exactement à la génération 130', () => {
  const life = centred(DIEHARD, 64, 'bounded');

  life.run(129);
  assert.equal(life.generation, 129);
  assert.ok(life.population() > 0, 'encore vivant à la génération 129');

  life.step();
  assert.equal(life.generation, 130);
  assert.equal(life.population(), 0, 'éteint à la génération 130');
});

test('R-pentomino : se stabilise à la génération 1103, population 116', () => {
  // 640×640 borné : les six planeurs éjectés parcourent au plus ~290 cellules
  // en 1150 générations, donc ils n'atteignent jamais le bord.
  const life = centred(R_PENTOMINO, 640, 'bounded');

  life.run(1102);
  const before = life.population();

  life.step();
  assert.equal(life.generation, 1103);
  assert.equal(life.population(), 116, 'population finale du R-pentomino');
  assert.notEqual(before, 116, 'la population doit encore bouger à la génération 1102');

  // À partir de là, seuls les planeurs se déplacent : la population ne change plus.
  life.run(47);
  assert.equal(life.population(), 116, 'toujours 116 à la génération 1150');
});

test('Acorn : la population est encore instable à mi-parcours', () => {
  // Le vecteur complet (5206 générations, 633 cellules) demande une grille de
  // ~2800² et plusieurs minutes : il vit dans acorn.slow.ts. Ici on vérifie
  // seulement que le motif est bien parti pour une longue vie.
  const life = centred(ACORN, 400, 'bounded');
  life.run(500);
  assert.ok(life.population() > 100, `population à la génération 500 : ${life.population()}`);
});
