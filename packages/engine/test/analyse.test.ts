// La classification par observation.
//
// Chaque assertion ici est un fait publié. Si le classement d'un motif change,
// c'est le moteur qui a bougé — et ces mêmes valeurs sont affichées sur les
// pages publiques, donc une erreur serait visible de tout le monde.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Board, analyse, describeSpeed } from '../src/index.ts';
import { ACORN, BLINKER, BLOCK, DIEHARD, GLIDER, R_PENTOMINO } from './patterns.ts';

const coords = (rows: readonly string[]) => Board.fromAscii(rows).toCoords();

test('une nature morte est reconnue comme telle', () => {
  const result = analyse(coords(BLOCK));
  assert.equal(result.kind, 'still-life');
  assert.equal(result.period, 1);
  assert.equal(result.population, 4);
  assert.equal(result.width, 2);
  assert.equal(result.height, 2);
});

test('un oscillateur donne sa période', () => {
  const blinker = analyse(coords(BLINKER));
  assert.equal(blinker.kind, 'oscillator');
  assert.equal(blinker.period, 2);

  const pulsar = analyse(
    coords([
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..',
    ]),
  );
  assert.equal(pulsar.kind, 'oscillator');
  assert.equal(pulsar.period, 3);
  assert.equal(pulsar.population, 48);

  const pentadecathlon = analyse(coords(['..O....O..', 'OO.OOOO.OO', '..O....O..']));
  assert.equal(pentadecathlon.kind, 'oscillator');
  assert.equal(pentadecathlon.period, 15);
});

test('un vaisseau donne sa vitesse', () => {
  const glider = analyse(coords(GLIDER));
  assert.equal(glider.kind, 'spaceship');
  assert.equal(glider.period, 4);
  assert.deepEqual(glider.displacement, [1, 1]);
  assert.equal(glider.speed, 'c/4 en diagonale');

  // Ce LWSS-là part vers la gauche : le déplacement est signé, la vitesse non.
  const lwss = analyse(coords(['.O..O', 'O....', 'O...O', 'OOOO.']));
  assert.equal(lwss.kind, 'spaceship');
  assert.equal(lwss.period, 4);
  assert.deepEqual(lwss.displacement, [-2, 0]);
  assert.equal(lwss.speed, "c/2 à l'orthogonale");
});

test('un motif qui s\'éteint est daté', () => {
  const result = analyse(coords(DIEHARD), { maxGenerations: 200 });
  assert.equal(result.kind, 'extinct');
  assert.equal(result.extinctAt, 130);
});

test('un mathusalem est déclaré instable plutôt que mal classé', () => {
  // Mieux vaut « je ne sais pas » qu'une période inventée.
  for (const pattern of [R_PENTOMINO, ACORN]) {
    const result = analyse(coords(pattern), { maxGenerations: 120 });
    assert.equal(result.kind, 'unstable');
    assert.equal(result.period, undefined);
  }
});

test('la notation de vitesse suit l\'usage', () => {
  assert.equal(describeSpeed(1, 1, 4), 'c/4 en diagonale');
  assert.equal(describeSpeed(2, 0, 4), "c/2 à l'orthogonale");
  assert.equal(describeSpeed(0, 1, 2), "c/2 à l'orthogonale");
  assert.equal(describeSpeed(1, 0, 3), "c/3 à l'orthogonale");
  // Un déplacement de 2 en 3 générations ne se réduit pas.
  assert.equal(describeSpeed(2, 0, 3), "2c/3 à l'orthogonale");
});

test('une grille vide est éteinte, pas instable', () => {
  const result = analyse([]);
  assert.equal(result.kind, 'extinct');
  assert.equal(result.population, 0);
});
