// Mesure du débit du moteur. `npm run bench`.
//
// Le critère de sortie de la phase 1 est : un million de cellules à au moins
// 30 générations par seconde. C'est le seuil au-delà duquel la simulation
// cesse d'être le facteur limitant de l'interface.

import { Board, Life, LIFE } from '../src/index.ts';

function benchmark(size: number, generations: number): void {
  const board = new Board(size, size, 'torus');

  // Soupe déterministe : un générateur congruentiel linéaire, pour que deux
  // exécutions du banc mesurent exactement le même travail.
  let seed = 0x2545f491;
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (next() % 100 < 35) board.set(x, y, 1);
    }
  }

  const life = new Life(board, LIFE);
  const cells = size * size;

  life.run(5); // chauffe du JIT

  const start = performance.now();
  life.run(generations);
  const elapsed = (performance.now() - start) / 1000;

  const gps = generations / elapsed;
  console.log(
    `${String(size).padStart(5)}²  ${(cells / 1e6).toFixed(2).padStart(6)} M cellules  ` +
      `${gps.toFixed(0).padStart(6)} gén./s  ` +
      `${((cells * gps) / 1e9).toFixed(2).padStart(6)} G cellules/s`,
  );
}

console.log('Moteur @zp/engine — règle B3/S23, tore, densité 35 %\n');
benchmark(256, 400);
benchmark(512, 200);
benchmark(1024, 60);
benchmark(2048, 20);
console.log('\nSeuil de sortie phase 1 : ≥ 30 gén./s à 1 M cellules (1024²).');
