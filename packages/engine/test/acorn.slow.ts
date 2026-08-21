// Vecteur de référence long. `npm run test:slow`.
//
// L'Acorn met 5 206 générations à se stabiliser et éjecte treize planeurs qui
// s'éloignent indéfiniment. Sur une grille finie il faut donc de la place :
// 2 816² pour que le plus lointain n'atteigne jamais le bord. Compter
// plusieurs minutes — c'est précisément le genre de calcul que HashLife rendra
// instantané, et qui justifie de le vendre comme fonctionnalité « temps
// profond » plutôt que de l'imposer à tout le monde.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, Life, LIFE } from '../src/index.ts';
import { ACORN } from './patterns.ts';

test('Acorn : se stabilise à la génération 5206, population 633', { timeout: 900_000 }, () => {
  const size = 2816;
  const src = Board.fromAscii(ACORN);
  const board = new Board(size, size, 'bounded');
  board.stamp(src.toCoords(), (size - src.width) >> 1, (size - src.height) >> 1);
  const life = new Life(board, LIFE);

  life.run(5205);
  assert.notEqual(life.population(), 633, 'encore instable à la génération 5205');

  life.step();
  assert.equal(life.generation, 5206);
  assert.equal(life.population(), 633);

  life.run(50);
  assert.equal(life.population(), 633, 'stable ensuite : seuls les planeurs bougent');
});
