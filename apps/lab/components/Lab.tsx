'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { patternById } from '@zp/content';
import { GridRenderer, Viewport, type RenderStyle } from '@zp/render';
import { SimulationClient, type SimCommand } from '@zp/worker';

import { startVisit, track, trackOnce } from '../lib/analytics';
import { getDict, type Locale } from '../lib/i18n';
import PatternPanel from './PatternPanel';
import RlePanel from './RlePanel';

const SPEEDS = [5, 15, 30, 60, 120];
/** 30 générations par seconde : assez vif pour donner du mouvement, assez lent
 *  pour qu'on suive ce qui se passe. */
const DEFAULT_SPEED = 2;
const SIZES = [256, 512, 1024, 2048];

type Tool = 'draw' | 'erase' | 'pan';
type Panel = 'patterns' | 'rle' | null;
type Armed = { id: string; rle: string; name: string } | null;

export default function Lab({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const d = dict.lab;
  const a = d.announce;

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
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED);
  const [shared, setShared] = useState(false);
  const [stats, setStats] = useState({ generation: 0, population: 0, scale: 4 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Sur un écran étroit le panneau recouvre la grille : il part fermé, sinon
  // le premier écran ne montre rien de jouable. Le composant n'est jamais
  // rendu côté serveur (voir LabClient), `matchMedia` est donc sûr ici.
  // Fermé au premier écran, sur toutes les tailles. Ce qu'un visiteur doit
  // voir en arrivant, c'est la simulation qui tourne — pas un catalogue.
  const [panel, setPanel] = useState<Panel>(null);
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
        announce(a.error(event.message));
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
            generation: frame.generation,
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
      // Les pages de motifs renvoient ici avec « ?motif=<id> ». On ouvre alors
      // sur le motif demandé plutôt que sur une soupe : arriver depuis la page
      // du canon de Gosper pour tomber sur du bruit serait absurde.
      const demande = new URLSearchParams(globalThis.location.search).get('motif');
      const motif = demande ? patternById(demande) : undefined;
      if (motif) {
        client.send({ type: 'stamp', rle: motif.rle, x: 256, y: 256 });
        viewport.scale = 8;
        announce(a.loadedFromPage(motif.name));
      } else {
        client.send({ type: 'randomise', density: 0.3, seed: (Math.random() * 2 ** 31) | 0 });
      }
      setReady(true);
      raf = requestAnimationFrame(loop);

      // La simulation part toute seule. Ce produit se vend en bougeant : un
      // visiteur qui tombe sur un champ de bruit statique et doit deviner
      // qu'il faut appuyer quelque part est un visiteur perdu.
      //
      // Sauf si le système demande à ce que ça ne bouge pas — c'est une
      // animation permanente, exactement ce que prefers-reduced-motion vise.
      // Et on ne compte pas ce démarrage comme un « simulation_started » :
      // l'événement ne mesure que les lancements voulus.
      const calme = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!calme) client.start(SPEEDS[DEFAULT_SPEED]!);

      // C'est aussi ainsi qu'on saura si les en-têtes COOP/COEP tiennent en
      // production, sur de vrais navigateurs, plutôt qu'en regardant un badge.
      track({ name: 'lab_loaded', shared: client.usesSharedMemory, worldSize: 512 });
    });

    const endVisit = startVisit();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      endVisit();
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
        setAnnouncement(a.dropped(armedPattern.name));
        track({ name: 'pattern_placed', pattern: armedPattern.id });
        return;
      }

      trackOnce({ name: 'drawing_started' });

      // Un point d'histoire au début du geste : tout le trait s'annulera d'un
      // seul coup, pas cellule par cellule.
      clientRef.current?.send({ type: 'checkpoint' });
      // Maj inverse l'outil courant : on efface en dessin, on dessine en gomme.
      const erasing = toolRef.current === 'erase' ? !event.shiftKey : event.shiftKey;
      dragging = erasing ? 'erase' : 'paint';
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
      setAnnouncement(a.droppedGeneric);
      track({ name: 'pattern_placed', pattern: 'glisser-déposer' });
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
    if (running) {
      client.stop();
    } else {
      client.start(SPEEDS[speedIndex]!);
      trackOnce({ name: 'simulation_started' });
    }
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
          announce(a.resized(nextSize, nextTopology === 'torus'));
          track({ name: 'grid_resized', worldSize: nextSize, topology: nextTopology });
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
      announce(a.imported);
      track({ name: 'rle_imported' });
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
          announce(a.redone);
        } else {
          client.send({ type: 'undo' });
          announce(a.undone);
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
        announce(a.cellOn(at.x, at.y));
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
        case 'd':
          setTool('draw');
          break;
        case 'e':
          setTool('erase');
          break;
        case 'h':
          setTool('pan');
          break;
        case 'f':
          fit();
          break;
        case 'c':
          client.send({ type: 'clear' });
          announce(a.cleared);
          break;
        case 'r':
          client.send({
            type: 'randomise',
            density: 0.3,
            seed: (Math.random() * 2 ** 31) | 0,
          });
          announce(a.newSoup);
          break;
        case 'Escape':
          setArmed(null);
          break;
      }
    };

    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [toggleRun, fit, announce]);

  const cursorLabel = cursor ? d.cursorAt(cursor.x, cursor.y) : d.canvasLabel;

  return (
    <div className="lab" ref={stageRef} data-tool={armed ? 'place' : tool}>
      <canvas
        className="field"
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label={cursorLabel}
      />

      {/* Plaque signalétique. Ce n'est pas un tableau de bord : trois choses,
          et la place de la simulation reste entière. */}
      <header className="chrome topbar">
        <a className="brand" href={`/${locale}`}>
          ZERO&nbsp;<em>PLAYER</em>
        </a>
        <span className="topbar-meta">B3/S23</span>
        <span className="topbar-grow" />

        <label className="sr-only" htmlFor="grid-size">
          {d.gridSize}
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
          {d.edges}
        </label>
        <select
          id="grid-topology"
          className="select"
          value={topology}
          disabled={!ready}
          onChange={(event) => reshape(size, event.target.value as 'torus' | 'bounded')}
        >
          <option value="torus">{d.edgesWrap}</option>
          <option value="bounded">{d.edgesDead}</option>
        </select>

        <button
          className="btn btn-quiet"
          aria-pressed={panel === 'patterns'}
          onClick={() => setPanel(panel === 'patterns' ? null : 'patterns')}
        >
          {d.patterns}
        </button>
        <button
          className="btn btn-quiet"
          aria-pressed={panel === 'rle'}
          onClick={() => setPanel(panel === 'rle' ? null : 'rle')}
        >
          {d.rle}
        </button>

        <span className="badge" data-on={shared} title={d.sharedTitle}>
          {shared ? 'SAB' : 'postMessage'}
        </span>
      </header>

      {/* Rail d'outils : la grammaire d'un éditeur graphique. */}
      <div
        className="chrome toolrail"
        role="toolbar"
        aria-orientation="vertical"
        aria-label={d.toolbar}
      >
        <button
          className="btn btn-icon"
          aria-pressed={tool === 'draw'}
          onClick={() => setTool('draw')}
          disabled={!ready}
          title={d.toolDraw}
        >
          ✎
        </button>
        <button
          className="btn btn-icon"
          aria-pressed={tool === 'erase'}
          onClick={() => setTool('erase')}
          disabled={!ready}
          title={d.toolErase}
        >
          ⌫
        </button>
        <button
          className="btn btn-icon"
          aria-pressed={tool === 'pan'}
          onClick={() => setTool('pan')}
          disabled={!ready}
          title={d.toolPan}
        >
          ✋
        </button>

        <div className="dock-sep" style={{ height: 1, width: 'auto', margin: '4px 2px' }} />

        <button
          className="btn btn-icon"
          onClick={() => {
            send({ type: 'undo' });
            announce(a.undone);
          }}
          disabled={!canUndo}
          title={d.undoTitle}
        >
          ↶
        </button>
        <button
          className="btn btn-icon"
          onClick={() => {
            send({ type: 'redo' });
            announce(a.redone);
          }}
          disabled={!canRedo}
          title={d.redoTitle}
        >
          ↷
        </button>
        <button className="btn btn-icon" onClick={fit} disabled={!ready} title={d.fit}>
          ⤢
        </button>
      </div>

      {/* Dock de transport : la grammaire d'un lecteur. Une seule action
          primaire sur toute la page, et c'est celle-ci. */}
      <div className="chrome dock">
        <button className="btn btn-primary" onClick={toggleRun} disabled={!ready}>
          {running ? d.pause : d.run}
        </button>
        <button
          className="btn btn-icon"
          onClick={() => clientRef.current?.step(1)}
          disabled={!ready}
          title={d.step}
        >
          ⇥
        </button>
        <button className="btn btn-quiet" onClick={cycleSpeed} disabled={!ready}>
          {SPEEDS[speedIndex]} {d.perSecond}
        </button>

        <div className="dock-sep" />

        <button
          className="btn btn-quiet"
          onClick={() => {
            send({ type: 'clear' });
            announce(a.cleared);
          }}
          disabled={!ready}
        >
          {d.clear}
        </button>
        <button
          className="btn btn-quiet"
          disabled={!ready}
          onClick={() => {
            send({ type: 'randomise', density: 0.3, seed: (Math.random() * 2 ** 31) | 0 });
            announce(a.newSoup);
          }}
        >
          {d.soup}
        </button>
      </div>

      {/* Le monospace est à sa place ici, et nulle part ailleurs. */}
      <div className="readout" aria-live="off">
        <span>
          {d.generation} <b>{stats.generation.toLocaleString(locale)}</b>
        </span>
        <span>
          {d.alive} <b>{stats.population.toLocaleString(locale)}</b>
        </span>
        <span>
          {d.zoom} <b>{stats.scale.toFixed(2)}×</b>
        </span>
      </div>

      <div className="hint">{armed ? d.hintArmed(armed.name) : d.hint}</div>

      <div className="stage-links">
        <a href="https://conwaylife.com/wiki/" rel="noreferrer noopener" target="_blank">
          {d.attribution}
        </a>
        <a href={`/${locale}/patterns`}>{d.allPatterns}</a>
        <a href={`/${locale}/about`}>{d.about}</a>
      </div>

      {panel === 'patterns' ? (
        <PatternPanel
          locale={locale}
          armedId={armed?.id ?? null}
          onArm={(id, rle, name) => {
            setArmed({ id, rle, name });
            announce(a.armed(name));
          }}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === 'rle' ? (
        <RlePanel
          locale={locale}
          exported={exported}
          onRequestExport={() => {
            send({ type: 'snapshot' });
            track({ name: 'rle_exported' });
          }}
          onImport={importRle}
          onClose={() => setPanel(null)}
        />
      ) : null}

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

  // La rémanence est une animation permanente en fond : c'est exactement ce
  // que prefers-reduced-motion vise. Sans elle, on retombe sur le rendu
  // binaire, qui reste parfaitement lisible.
  const calme = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const amber = token('--zp-amber', '#ffb454');

  return {
    surface: token('--zp-void', '#0a0c10'),
    field: token('--zp-field', '#06070a'),
    cell: amber,
    grid: 'rgba(255, 180, 84, 0.055)',
    edge: token('--zp-edge', 'rgba(255, 180, 84, 0.26)'),
    // Le curseur clavier appartient à l'interface, donc à la plaque cyan.
    cursor: token('--zp-cyan', '#5fd3f3'),
    trail: calme
      ? undefined
      : {
          // Une cellule qui naît part en blanc chaud puis retombe sur l'ambre.
          born: '#fff0d8',
          fade1: 'rgba(255, 180, 84, 0.42)',
          fade2: 'rgba(255, 180, 84, 0.15)',
        },
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
