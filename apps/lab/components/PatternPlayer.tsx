'use client';

import { useEffect, useRef, useState } from 'react';

import { decodeRle } from '@zp/codecs';
import { Board, Life, LIFE } from '@zp/engine';
import { GridRenderer, Viewport, type RenderStyle } from '@zp/render';

import { getDict, type Locale } from '../lib/i18n';

/**
 * Lecteur autonome d'un motif, pour les pages de contenu.
 *
 * Pas de worker ici, contrairement au Labo : ces motifs tiennent dans
 * quelques dizaines de cellules de côté, et la simulation coûte moins cher
 * que le message qui la déclencherait. Une page de contenu doit être légère.
 */
export default function PatternPlayer({
  rle,
  label,
  locale,
  generationsPerSecond = 10,
}: {
  rle: string;
  label: string;
  locale: Locale;
  generationsPerSecond?: number;
}) {
  const dict = getDict(locale);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const [generation, setGeneration] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const runningRef = useRef(true);
  runningRef.current = running;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let pattern;
    try {
      pattern = decodeRle(rle);
    } catch {
      return;
    }

    // Assez de place autour pour que le motif respire et qu'un vaisseau
    // traverse. Le tore le fait revenir plutôt que mourir au bord.
    const span = Math.max(pattern.width, pattern.height);
    const size = Math.max(24, Math.min(96, span * 3 + 8));
    const board = new Board(size, size, 'torus');
    board.stamp(pattern.cells, (size - pattern.width) >> 1, (size - pattern.height) >> 1);
    const life = new Life(board, LIFE);

    const css = getComputedStyle(document.documentElement);
    const token = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const style: RenderStyle = {
      surface: token('--zp-field', '#0a0a0e'),
      field: token('--zp-field', '#0a0a0e'),
      cell: token('--zp-amber', '#ff9b3d'),
      grid: '#1a140c',
      edge: 'rgba(255,155,61,0.10)',
      cursor: '#ffd9a8',
    };
    const renderer = new GridRenderer(ctx, style);
    const viewport = new Viewport();

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      viewport.resize(rect.width, rect.height);
      viewport.fit(size, size, 8);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    let raf = 0;
    let last = 0;
    let disposed = false;
    const interval = 1000 / generationsPerSecond;

    const loop = (now: number) => {
      if (disposed) return;
      if (runningRef.current && now - last >= interval) {
        last = now;
        life.step();
        if (life.generation % 5 === 0) setGeneration(life.generation);
      }
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      renderer.render(
        {
          bits: life.board.bits,
          wordsPerRow: life.board.wordsPerRow,
          width: life.board.width,
          height: life.board.height,
        },
        viewport,
        dpr,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [rle, generationsPerSecond, resetKey]);

  return (
    <figure className="player">
      <div className="player-stage" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label={dict.player.label(label)} role="img" />
      </div>
      <figcaption className="player-bar">
        <button className="btn" onClick={() => setRunning((r) => !r)}>
          {running ? dict.lab.pause : dict.lab.run}
        </button>
        <button
          className="btn"
          onClick={() => {
            setGeneration(0);
            setResetKey((k) => k + 1);
          }}
        >
          {dict.player.restart}
        </button>
        <span className="player-gen">
          {dict.lab.generation} <b>{generation.toLocaleString(dict.locale)}</b>
        </span>
      </figcaption>
    </figure>
  );
}
