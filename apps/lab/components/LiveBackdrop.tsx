'use client';

import { useEffect, useRef } from 'react';

import { Board, Life, LIFE } from '@zp/engine';

// Le fond de la page d'accueil est le moteur lui-même.
//
// Pas une vidéo, pas une capture : la vraie simulation, sur un tore, semée de
// planeurs qui dérivent. Un visiteur comprend le produit avant d'avoir lu une
// ligne — et il n'y a rien à télécharger pour ça, le moteur pèse zéro octet de
// dépendance.
//
// Des planeurs plutôt qu'une soupe : une soupe est du bruit, et on veut du
// dépouillement. Un planeur se lit, se suit du regard, et c'est la forme
// emblématique du sujet.

/** Le planeur, dans ses quatre orientations. */
const GLIDER: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

function rotate(cells: ReadonlyArray<readonly [number, number]>, quarters: number) {
  let out = cells.map(([x, y]) => [x, y] as [number, number]);
  for (let i = 0; i < quarters; i++) out = out.map(([x, y]) => [2 - y, x] as [number, number]);
  return out;
}

const ORIENTATIONS = [0, 1, 2, 3].map((q) => rotate(GLIDER, q));

/** Générateur reproductible : le fond est le même à chaque chargement. */
function lcg(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export default function LiveBackdrop({ cell = 11 }: { cell?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const calme = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let life: Life;
    let cols = 0;
    let rows = 0;
    let colour = '#ff9b3d';

    const seed = () => {
      const board = new Board(cols, rows, 'torus');
      const random = lcg(0x5eed);
      // Assez pour habiter la page, assez peu pour que les collisions restent
      // rares — deux planeurs qui se percutent laissent un débris immobile.
      const count = Math.max(6, Math.round((cols * rows) / 1400));
      for (let i = 0; i < count; i++) {
        const shape = ORIENTATIONS[Math.floor(random() * 4)]!;
        const ox = Math.floor(random() * (cols - 3));
        const oy = Math.floor(random() * (rows - 3));
        board.stamp(shape, ox, oy);
      }
      life = new Life(board, LIFE);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      cols = Math.max(12, Math.floor(rect.width / cell));
      rows = Math.max(8, Math.floor(rect.height / cell));
      colour =
        getComputedStyle(document.documentElement).getPropertyValue('--zp-amber').trim() ||
        '#ff9b3d';
      seed();
      draw();
    };

    const draw = () => {
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const size = cell * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = colour;

      const bits = life.board.bits;
      const words = life.board.wordsPerRow;
      for (let y = 0; y < rows; y++) {
        const row = y * words;
        for (let w = 0; w < words; w++) {
          let word = bits[row + w]!;
          if (word === 0) continue;
          const base = w << 5;
          while (word !== 0) {
            const lowest = word & -word;
            const x = base + (31 - Math.clz32(lowest));
            word ^= lowest;
            ctx.fillRect(x * size, y * size, size - dpr, size - dpr);
          }
        }
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (calme) return () => observer.disconnect();

    let raf = 0;
    let last = 0;
    let disposed = false;
    const initial = life!.board.population();

    const loop = (now: number) => {
      if (disposed) return;
      if (now - last >= 110) {
        last = now;
        life.step();
        // Les collisions laissent des débris immobiles qui s'accumulent. On
        // repart d'une page propre plutôt que de laisser le fond s'encrasser.
        if (life.generation > 1800 || life.board.population() > initial * 1.8) seed();
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [cell]);

  return <canvas className="backdrop" ref={canvasRef} aria-hidden="true" />;
}
