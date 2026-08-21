import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, Life, LIFE } from '../../engine/src/index.ts';
import { decodeRle, encodeRle, RleParseError } from '../src/index.ts';

/** Le canon à planeurs de Gosper, tel que publié sur le LifeWiki. */
const GOSPER_GUN = `#N Gosper glider gun
#O Bill Gosper, 1970
#C Le premier motif à croissance infinie découvert.
x = 36, y = 9, rule = B3/S23
24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
obo$10bo5bo7bo$11bo3bo$12b2o!`;

const GLIDER_CELLS = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
] as const;

test('décodage de l\'en-tête et des métadonnées', () => {
  const p = decodeRle(GOSPER_GUN);
  assert.equal(p.name, 'Gosper glider gun');
  assert.equal(p.author, 'Bill Gosper, 1970');
  assert.equal(p.rule, 'B3/S23');
  assert.equal(p.width, 36);
  assert.equal(p.height, 9);
  assert.equal(p.cells.length, 36);
  assert.ok(p.comment?.includes('croissance infinie'));
});

test('le corps replié sur plusieurs lignes est recollé', () => {
  // La 6e ligne du motif est coupée en plein milieu d'un jeton ("4b" / "obo").
  const p = decodeRle(GOSPER_GUN);
  const oneLine = decodeRle(
    'x = 36, y = 9, rule = B3/S23\n' +
      '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',
  );
  assert.deepEqual(p.cells, oneLine.cells);
});

test('encodage : le planeur produit sa forme canonique', () => {
  const rle = encodeRle(GLIDER_CELLS, { name: 'Glider' });
  assert.equal(rle, '#N Glider\nx = 3, y = 3, rule = B3/S23\nbo$2bo$3o!\n');
});

test('aller-retour encodage / décodage sur un motif réel', () => {
  const p = decodeRle(GOSPER_GUN);
  const round = decodeRle(encodeRle(p.cells, { rule: 'B3/S23' }));
  assert.deepEqual(round.cells, p.cells);
  assert.equal(round.width, 36);
  assert.equal(round.height, 9);
});

test('un motif décodé se comporte comme annoncé dans le moteur', () => {
  // Le canon de Gosper a une période de 30 et lâche exactement un planeur
  // par période. La population doit donc croître de 5 toutes les 30
  // générations. C'est le codec et le moteur qui se valident l'un l'autre.
  const p = decodeRle(GOSPER_GUN);
  const board = new Board(200, 200, 'bounded');
  board.stamp(p.cells, 5, 5);
  const life = new Life(board, LIFE);

  assert.equal(life.population(), 36);
  for (let period = 1; period <= 6; period++) {
    life.run(30);
    assert.equal(
      life.population(),
      36 + 5 * period,
      `après ${period} période(s) de 30 générations`,
    );
  }
});

test('encodage d\'un motif vide', () => {
  assert.equal(encodeRle([]), 'x = 0, y = 0, rule = B3/S23\n!\n');
});

test('les coordonnées sont normalisées sur l\'origine', () => {
  const shifted = GLIDER_CELLS.map(([x, y]) => [x + 500, y + 300] as const);
  assert.equal(encodeRle(shifted), 'x = 3, y = 3, rule = B3/S23\nbo$2bo$3o!\n');
});

test('les lignes vides intermédiaires sont préservées', () => {
  // Deux blocs séparés par deux lignes vides.
  const cells = [
    [0, 0],
    [1, 0],
    [0, 3],
    [1, 3],
  ] as const;
  const rle = encodeRle(cells);
  assert.ok(rle.includes('2o3$2o!'), `obtenu : ${rle}`);
  assert.deepEqual(decodeRle(rle).cells, [...cells]);
});

test('un caractère inconnu est refusé plutôt que deviné', () => {
  assert.throws(
    () => decodeRle('x = 3, y = 3, rule = B3/S23\nbo$2zo$3o!'),
    RleParseError,
  );
});

test('le corps sans en-tête reste lisible', () => {
  const p = decodeRle('bo$2bo$3o!');
  assert.deepEqual(p.cells, [...GLIDER_CELLS]);
  assert.equal(p.rule, null);
  assert.equal(p.width, 3);
  assert.equal(p.height, 3);
});
