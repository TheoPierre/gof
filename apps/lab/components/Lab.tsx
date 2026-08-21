'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { GridRenderer, Viewport, type RenderStyle } from '@zp/render';
import { SimulationClient, type SimCommand } from '@zp/worker';

import PatternPanel from './PatternPanel';
import RlePanel from './RlePanel';

const SPEEDS = [5, 15, 30, 60, 120];
const SIZES = [256, 512, 1024, 2048];

type Tool = 'draw' | 'pan';
type Panel = 'patterns' | 'rle' | null;
type Armed = { id: string; rle: string; name: string } | null;

export default function Lab() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clientRef = useRef<SimulationClient | null>(null);
  const viewportRef = useRef(new Viewport());
  const rendererRef = useRef<GridRenderer | null>(null);

  // Miroirs des états lus dans la boucle de rendu et les gestionnaires
  // d'événements, qui ne doivent pas être recréés à chaque frappe.
  const toolRef = useRef<Tool>('draw');
  const armedRef = useRef<Armed>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [tool, setTool] = useState<Tool>('draw');
  const [speedIndex, setSpeedIndex] = useState(2);
  const [shared, setShared] = useState(false);
  const [stats, setStats] = useState({ generation: 0, population: 0, scale: 4 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [panel, setPanel] = useState<Panel>('patterns');
  const [armed, setArmed] = useState<Armed>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [size, setSize] = useState(512);
  const [topology, setTopology] = useState<'torus' | 'bounded'>('torus');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  toolRef.current = tool;
  armedRef.current = armed;
  cursorRef.current = cursor;

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  const send = useCallback((command: SimCommand) => clientRef.current?.send(command), []);

  // ─────────────────── Démarrage : worker, rendu, boucle ───────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const renderer = new GridRenderer(ctx, readStyle());
    rendererRef.current = renderer;

    const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
    const client = new SimulationClient(worker);
    clientRef.current = client;

    const viewport = viewportRef.current;
    let raf = 0;
    let disposed = false;
    let lastStats = 0;

    const off = client.on((event) => {
      if (event.type === 'history') {
        setCanUndo(event.canUndo);
        setCanRedo(event.canRedo);
      } else if (event.type === 'snapshot') {
        setExported(event.rle);
      } else if (event.type === 'error') {
        announce(`Erreur : ${event.message}`);
      }
    });

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      viewport.resize(rect.width, rect.height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    const loop = (now: number) => {
      if (disposed) return;
      const frame = client.readFrame();
      if (frame) {
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        renderer.render(
          {
            bits: frame.bits,
            wordsPerRow: client.wordsPerRow,
            width: client.width,
            height: client.height,
          },
          viewport,
          dpr,
          { cursor: cursorRef.current },
        );

        // Les compteurs ne suivent pas la cadence du rendu : soixante rendus
        // React par seconde pour trois nombres serait absurde.
        if (now - lastStats > 100) {
          lastStats = now;
          setStats({
            generation: frame.generation,
            population: frame.population,
            scale: viewport.scale,
          });
          setRunning(frame.running);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    void client.init({ width: 512, height: 512, topology: 'torus' }).then(() => {
      if (disposed) return;
      setShared(client.usesSharedMemory);
      viewport.centerX = 256;
      viewport.centerY = 256;
      viewport.scale = 4;
      client.send({ type: 'randomise', density: 0.3, seed: (Math.random() * 2 ** 31) | 0 });
      setReady(true);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      off();
      client.terminate();
      clientRef.current = null;
    };
  }, [announce]);

  // ─────────────────────── Souris et tactile ───────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const viewport = viewportRef.current;
    let dragging: 'paint' | 'erase' | 'pan' | null = null;
    let lastCell: { x: number; y: number } | null = null;
    let lastPoint: { x: number; y: number } | null = null;

    const localPoint = (event: PointerEvent | DragEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const inside = (x: number, y: number) => {
      const client = clientRef.current;
      return !!client && x >= 0 && y >= 0 && x < client.width && y < client.height;
    };

    /** Dépose un motif centré sur la cellule visée. */
    const stampAt = (point: { x: number; y: number }, rle: string) => {
      const cell = viewport.cellAt(point.x, point.y);
      clientRef.current?.send({ type: 'stamp', rle, x: cell.x, y: cell.y });
    };

    const paintTo = (point: { x: number; y: number }, alive: boolean) => {
      const client = clientRef.current;
      if (!client) return;
      const cell = viewport.cellAt(point.x, point.y);
      // On relie la cellule précédente à la nouvelle : sans ça, un geste rapide
      // laisse des trous dans le trait.
      const cells = lastCell ? line(lastCell, cell) : [[cell.x, cell.y] as const];
      lastCell = cell;
      const kept = cells.filter(([x, y]) => inside(x, y));
      if (kept.length > 0) client.send({ type: 'setCells', cells: kept, alive });
    };

    const onPointerDown = (event: PointerEvent) => {
      // La capture échoue si le pointeur n'est pas actif (événement synthétique,
      // pointeur déjà relâché). Ce n'est pas une raison de ne pas dessiner.
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* sans capture, le glissement s'arrêtera au bord du canvas */
      }
      const point = localPoint(event);
      lastPoint = point;
      lastCell = null;

      const wantsPan = toolRef.current === 'pan' || event.button === 1 || event.button === 2;
      if (wantsPan) {
        dragging = 'pan';
        stage.dataset.dragging = 'true';
        return;
      }

      const armedPattern = armedRef.current;
      if (armedPattern) {
        stampAt(point, armedPattern.rle);
        setArmed(null);
        setAnnouncement(`${armedPattern.name} déposé.`);
        return;
      }

      // Un point d'histoire au début du geste : tout le trait s'annulera d'un
      // seul coup, pas cellule par cellule.
      clientRef.current?.send({ type: 'checkpoint' });
      dragging = event.shiftKey ? 'erase' : 'paint';
      paintTo(point, dragging === 'paint');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const point = localPoint(event);

      if (dragging === 'pan') {
        if (lastPoint) viewport.panByPixels(point.x - lastPoint.x, point.y - lastPoint.y);
        lastPoint = point;
        return;
      }

      paintTo(point, dragging === 'paint');
      lastPoint = point;
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = null;
      lastCell = null;
      lastPoint = null;
      delete stage.dataset.dragging;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      viewport.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
    };

    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const rle = event.dataTransfer?.getData('text/plain');
      if (!rle) return;
      stampAt(localPoint(event), rle);
      setAnnouncement('Motif déposé.');
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dragover', onDragOver);
    canvas.addEventListener('drop', onDrop);
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dragover', onDragOver);
      canvas.removeEventListener('drop', onDrop);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // ─────────────────────────── Commandes ───────────────────────────

  const toggleRun = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    if (running) client.stop();
    else client.start(SPEEDS[speedIndex]!);
  }, [running, speedIndex]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    send({ type: 'setSpeed', generationsPerSecond: SPEEDS[next]! });
  }, [speedIndex, send]);

  const fit = useCallback(() => {
    const client = clientRef.current;
    if (client) viewportRef.current.fit(client.width, client.height, 24);
  }, []);

  const reshape = useCallback(
    (nextSize: number, nextTopology: 'torus' | 'bounded') => {
      const client = clientRef.current;
      if (!client) return;
      setSize(nextSize);
      setTopology(nextTopology);
      void client
        .init({ width: nextSize, height: nextSize, topology: nextTopology })
        .then(() => {
          viewportRef.current.fit(nextSize, nextSize, 24);
          setCursor(null);
          announce(
            `Grille ${nextSize} sur ${nextSize}, bords ${
              nextTopology === 'torus' ? 'recollés' : 'morts'
            }.`,
          );
        });
    },
    [announce],
  );

  const importRle = useCallback(
    (rle: string) => {
      const viewport = viewportRef.current;
      send({
        type: 'stamp',
        rle,
        x: Math.round(viewport.centerX),
        y: Math.round(viewport.centerY),
      });
      announce('Motif importé au centre de la vue.');
    },
    [send, announce],
  );

  // ─────────────────────── Clavier ───────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Le prototype randomisait la grille quand on tapait « r » dans un
      // champ de saisie. On ne recommence pas.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      const client = clientRef.current;
      if (!client) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          client.send({ type: 'redo' });
          announce('Rétabli.');
        } else {
          client.send({ type: 'undo' });
          announce('Annulé.');
        }
        return;
      }

      // Flèches : elles déplacent le curseur quand la grille a le focus, et
      // servent de raccourcis sinon.
      const onCanvas = target === canvas;
      if (onCanvas && event.key.startsWith('Arrow')) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        setCursor((previous) => {
          const base = previous ?? {
            x: Math.round(viewportRef.current.centerX),
            y: Math.round(viewportRef.current.centerY),
          };
          const next = { ...base };
          if (event.key === 'ArrowLeft') next.x -= step;
          if (event.key === 'ArrowRight') next.x += step;
          if (event.key === 'ArrowUp') next.y -= step;
          if (event.key === 'ArrowDown') next.y += step;
          next.x = Math.max(0, Math.min(client.width - 1, next.x));
          next.y = Math.max(0, Math.min(client.height - 1, next.y));
          return next;
        });
        return;
      }

      if (onCanvas && event.key === 'Enter') {
        event.preventDefault();
        const at = cursorRef.current;
        if (!at) return;
        client.send({ type: 'checkpoint' });
        client.send({ type: 'setCells', cells: [[at.x, at.y]], alive: true });
        announce(`Cellule ${at.x}, ${at.y} allumée.`);
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          toggleRun();
          break;
        case 'ArrowRight':
          event.preventDefault();
          client.step(1);
          break;
        case 'f':
          fit();
          break;
        case 'c':
          client.send({ type: 'clear' });
          announce('Grille vidée.');
          break;
        case 'r':
          client.send({
            type: 'randomise',
            density: 0.3,
            seed: (Math.random() * 2 ** 31) | 0,
          });
          announce('Nouvelle soupe.');
          break;
        case 'Escape':
          setArmed(null);
          break;
      }
    };

    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [toggleRun, fit, announce]);

  const cursorLabel = cursor
    ? `Curseur en colonne ${cursor.x}, ligne ${cursor.y}.`
    : 'Grille du Jeu de la Vie. Utilise les flèches pour déplacer le curseur, Entrée pour allumer une cellule.';

  return (
    <div className="lab">
      <div className="toolbar" role="toolbar" aria-label="Contrôles de la simulation">
        <button className="btn" onClick={toggleRun} disabled={!ready}>
          {running ? '⏸ Pause' : '▶ Lancer'}
        </button>
        <button className="btn" onClick={() => clientRef.current?.step(1)} disabled={!ready}>
          ⇥ Pas
        </button>
        <button className="btn" onClick={cycleSpeed} disabled={!ready}>
          {SPEEDS[speedIndex]} gén./s
        </button>

        <span style={{ width: 6 }} />

        <button
          className="btn"
          onClick={() => {
            send({ type: 'undo' });
            announce('Annulé.');
          }}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className="btn"
          onClick={() => {
            send({ type: 'redo' });
            announce('Rétabli.');
          }}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Maj+Z)"
        >
          ↷
        </button>

        <span style={{ width: 6 }} />

        <button
          className="btn"
          onClick={() => {
            send({ type: 'clear' });
            announce('Grille vidée.');
          }}
          disabled={!ready}
        >
          Vider
        </button>
        <button
          className="btn"
          disabled={!ready}
          onClick={() => {
            send({ type: 'randomise', density: 0.3, seed: (Math.random() * 2 ** 31) | 0 });
            announce('Nouvelle soupe.');
          }}
        >
          Soupe
        </button>

        <span style={{ width: 6 }} />

        <button
          className="btn"
          aria-pressed={tool === 'pan'}
          onClick={() => setTool(tool === 'pan' ? 'draw' : 'pan')}
          disabled={!ready}
        >
          ✋
        </button>
        <button className="btn" onClick={fit} disabled={!ready}>
          ⤢ Cadrer
        </button>

        <span style={{ width: 6 }} />

        <label className="sr-only" htmlFor="grid-size">
          Taille de la grille
        </label>
        <select
          id="grid-size"
          className="select"
          value={size}
          disabled={!ready}
          onChange={(event) => reshape(Number(event.target.value), topology)}
        >
          {SIZES.map((value) => (
            <option key={value} value={value}>
              {value}²
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="grid-topology">
          Bords de la grille
        </label>
        <select
          id="grid-topology"
          className="select"
          value={topology}
          disabled={!ready}
          onChange={(event) => reshape(size, event.target.value as 'torus' | 'bounded')}
        >
          <option value="torus">Bords recollés</option>
          <option value="bounded">Bords morts</option>
        </select>

        <div className="spacer" />

        <button
          className="btn"
          aria-pressed={panel === 'patterns'}
          onClick={() => setPanel(panel === 'patterns' ? null : 'patterns')}
        >
          Motifs
        </button>
        <button
          className="btn"
          aria-pressed={panel === 'rle'}
          onClick={() => setPanel(panel === 'rle' ? null : 'rle')}
        >
          RLE
        </button>

        <div className="readout" aria-live="off">
          <span>
            Génération <b>{stats.generation.toLocaleString('fr-FR')}</b>
          </span>
          <span>
            Vivantes <b>{stats.population.toLocaleString('fr-FR')}</b>
          </span>
          <span>
            Zoom <b>{stats.scale.toFixed(2)}×</b>
          </span>
        </div>
        <span
          className="badge"
          data-on={shared}
          title="Mémoire partagée entre le worker et le rendu"
        >
          {shared ? 'SAB' : 'postMessage'}
        </span>
      </div>

      <div className="workspace">
        <div className="stage" ref={stageRef} data-tool={armed ? 'place' : tool}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label={cursorLabel}
          />
          <div className="hint">
            {armed
              ? `${armed.name} — clique la grille pour le déposer, Échap pour annuler`
              : 'Glisser pour dessiner · Maj pour effacer · Molette pour zoomer · Clic droit pour déplacer · Espace, →, F, C, R'}
          </div>
        </div>

        {panel === 'patterns' ? (
          <PatternPanel
            armedId={armed?.id ?? null}
            onArm={(id, rle, name) => {
              setArmed({ id, rle, name });
              announce(`${name} sélectionné. Clique la grille pour le déposer.`);
            }}
            onClose={() => setPanel(null)}
          />
        ) : null}

        {panel === 'rle' ? (
          <RlePanel
            exported={exported}
            onRequestExport={() => send({ type: 'snapshot' })}
            onImport={importRle}
            onClose={() => setPanel(null)}
          />
        ) : null}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/** Style de rendu lu depuis les jetons CSS, pour qu'il n'existe qu'un endroit. */
function readStyle(): RenderStyle {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    surface: token('--zp-void', '#06060a'),
    field: token('--zp-field', '#0a0a0e'),
    cell: token('--zp-amber', '#ff9b3d'),
    grid: '#1a140c',
    edge: '#4a3418',
    cursor: '#ffd9a8',
  };
}

/** Bresenham : relie deux cellules pour qu'un geste rapide ne laisse pas de trous. */
function line(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Array<readonly [number, number]> {
  const cells: Array<readonly [number, number]> = [];
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const stepX = x < to.x ? 1 : -1;
  const stepY = y < to.y ? 1 : -1;
  let error = dx + dy;

  for (let guard = 0; guard < 4096; guard++) {
    cells.push([x, y]);
    if (x === to.x && y === to.y) break;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y += stepY;
    }
  }
  return cells;
}
