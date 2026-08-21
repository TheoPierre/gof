'use client';

import { useEffect, useRef } from 'react';

import { decodeRle } from '@zp/codecs';

/** Vignette d'un motif RLE, cadrée dans la boîte disponible. */
export default function PatternPreview({ rle }: { rle: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue('--zp-field').trim() || '#0a0a0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let pattern;
    try {
      pattern = decodeRle(rle);
    } catch {
      return;
    }
    if (pattern.cells.length === 0) return;

    const padding = 4 * dpr;
    const cell = Math.max(
      1,
      Math.min(
        (canvas.width - padding * 2) / pattern.width,
        (canvas.height - padding * 2) / pattern.height,
      ),
    );
    const offsetX = (canvas.width - cell * pattern.width) / 2;
    const offsetY = (canvas.height - cell * pattern.height) / 2;

    ctx.fillStyle = css.getPropertyValue('--zp-amber').trim() || '#ff9b3d';
    const size = Math.max(1, cell - (cell > 3 ? 1 : 0));
    for (const [x, y] of pattern.cells) {
      ctx.fillRect(offsetX + x * cell, offsetY + y * cell, size, size);
    }
  }, [rle]);

  // Décoratif : le bouton qui l'entoure porte déjà le nom du motif.
  return <canvas ref={ref} aria-hidden="true" />;
}
