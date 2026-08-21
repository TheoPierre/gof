// Le catalogue tient-il ses promesses ?
//
// Le prototype rangeait sous « puffer » et « spacefiller » des motifs qui
// n'en étaient pas. Un visiteur qui connaît le sujet le repère en dix
// secondes, et la crédibilité ne se répare pas. Ces tests font tourner chaque
// motif du catalogue et vérifient qu'il se comporte comme sa catégorie
// l'annonce — une erreur d'étiquetage devient une suite rouge, pas un
// commentaire sur un forum.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, Life, LIFE } from '@zp/engine';
import { decodeRle } from '@zp/codecs';

import { CATALOGUE, CATEGORY_ORDER, type CataloguePattern } from '../src/index.ts';

/** Forme normalisée sur son coin haut-gauche : compare des formes, pas des positions. */
function shape(board: Board): string {
  const cells = board.toCoords();
  if (cells.length === 0) return '';
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => `${x - minX},${y - minY}`).join(' ');
}

function origin(board: Board): [number, number] {
  const cells = board.toCoords();
  return [Math.min(...cells.map(([x]) => x)), Math.min(...cells.map(([, y]) => y))];
}

/** Pose le motif au centre d'une grille bornée assez large pour qu'il respire. */
function place(pattern: CataloguePattern, size = 96): Life {
  const decoded = decodeRle(pattern.rle);
  const board = new Board(size, size, 'bounded');
  board.stamp(decoded.cells, size >> 2, size >> 2);
  return new Life(board, LIFE);
}

test('chaque motif se décode et contient des cellules', () => {
  for (const pattern of CATALOGUE) {
    const decoded = decodeRle(pattern.rle);
    assert.ok(decoded.cells.length > 0, `${pattern.name} est vide`);
    assert.ok(decoded.width > 0 && decoded.height > 0, `${pattern.name} n'a pas de taille`);
  }
});

test('les identifiants sont uniques et les catégories connues', () => {
  const ids = new Set<string>();
  for (const pattern of CATALOGUE) {
    assert.ok(!ids.has(pattern.id), `identifiant en double : ${pattern.id}`);
    ids.add(pattern.id);
    assert.ok(
      CATEGORY_ORDER.includes(pattern.category),
      `${pattern.name} : catégorie inconnue ${pattern.category}`,
    );
    assert.ok(pattern.note.length > 20, `${pattern.name} mérite une vraie description`);
  }
});

test('les natures mortes ne bougent pas', () => {
  for (const pattern of CATALOGUE.filter((p) => p.category === 'nature-morte')) {
    const life = place(pattern);
    const before = life.board.toAscii();
    life.run(8);
    assert.equal(life.board.toAscii(), before, `${pattern.name} n'est pas stable`);
  }
});

test('les oscillateurs reviennent à leur état de départ, sans avoir bougé', () => {
  for (const pattern of CATALOGUE.filter((p) => p.category === 'oscillateur')) {
    const life = place(pattern);
    const start = life.board.toAscii();

    let period = 0;
    for (let generation = 1; generation <= 40; generation++) {
      life.step();
      if (life.board.toAscii() === start) {
        period = generation;
        break;
      }
    }

    assert.ok(period > 0, `${pattern.name} ne se referme pas en 40 générations`);
    assert.ok(period > 1, `${pattern.name} est une nature morte, pas un oscillateur`);
  }
});

test('les vaisseaux se translatent', () => {
  for (const pattern of CATALOGUE.filter((p) => p.category === 'vaisseau')) {
    const life = place(pattern);
    const startShape = shape(life.board);
    const startOrigin = origin(life.board);

    let period = 0;
    for (let generation = 1; generation <= 20; generation++) {
      life.step();
      if (shape(life.board) === startShape) {
        period = generation;
        break;
      }
    }

    assert.ok(period > 0, `${pattern.name} ne retrouve jamais sa forme`);
    const moved = origin(life.board);
    const distance = Math.abs(moved[0] - startOrigin[0]) + Math.abs(moved[1] - startOrigin[1]);
    assert.ok(distance > 0, `${pattern.name} retrouve sa forme mais n'a pas avancé`);
  }
});

test('les mathusalems durent longtemps puis se figent', () => {
  const expected: Record<string, { generations: number; population: number; size: number }> = {
    'r-pentomino': { generations: 1103, population: 116, size: 640 },
    diehard: { generations: 130, population: 0, size: 96 },
  };

  for (const [id, target] of Object.entries(expected)) {
    const pattern = CATALOGUE.find((p) => p.id === id)!;
    const decoded = decodeRle(pattern.rle);
    const board = new Board(target.size, target.size, 'bounded');
    board.stamp(decoded.cells, target.size >> 1, target.size >> 1);
    const life = new Life(board, LIFE);

    life.run(target.generations);
    assert.equal(
      life.board.population(),
      target.population,
      `${pattern.name} à la génération ${target.generations}`,
    );
  }
});

test('la croissance infinie croît vraiment', () => {
  for (const pattern of CATALOGUE.filter((p) => p.category === 'croissance')) {
    const decoded = decodeRle(pattern.rle);
    const board = new Board(400, 400, 'bounded');
    board.stamp(decoded.cells, 40, 40);
    const life = new Life(board, LIFE);

    const start = life.board.population();
    life.run(300);
    const after = life.board.population();
    assert.ok(
      after > start,
      `${pattern.name} : ${start} cellules au départ, ${after} après 300 générations`,
    );
  }
});

test('le canon de Gosper lâche un planeur toutes les 30 générations', () => {
  const pattern = CATALOGUE.find((p) => p.id === 'gosper-gun')!;
  const decoded = decodeRle(pattern.rle);
  const board = new Board(300, 300, 'bounded');
  board.stamp(decoded.cells, 5, 5);
  const life = new Life(board, LIFE);

  assert.equal(life.board.population(), 36);
  for (let period = 1; period <= 5; period++) {
    life.run(30);
    assert.equal(life.board.population(), 36 + 5 * period, `après ${period * 30} générations`);
  }
});
