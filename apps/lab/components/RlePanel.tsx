'use client';

import { useEffect, useState } from 'react';

import { decodeRle } from '@zp/codecs';

interface Props {
  /** RLE de la grille courante, renvoyé par le worker après « Exporter ». */
  exported: string | null;
  onRequestExport: () => void;
  onImport: (rle: string) => void;
  onClose: () => void;
}

export default function RlePanel({ exported, onRequestExport, onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (exported !== null) {
      setText(exported);
      setError(null);
    }
  }, [exported]);

  const doImport = () => {
    try {
      // On décode ici aussi pour donner l'erreur tout de suite, à côté du
      // champ, plutôt que d'attendre l'aller-retour avec le worker.
      const pattern = decodeRle(text);
      if (pattern.cells.length === 0) {
        setError('Ce motif ne contient aucune cellule vivante.');
        return;
      }
      setError(null);
      onImport(text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Le presse-papiers a été refusé. Sélectionne le texte et copie-le à la main.");
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motif.rle';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="panel" aria-label="Import et export RLE">
      <div className="panel-head">
        <span>RLE</span>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer le panneau RLE">
          ✕
        </button>
      </div>

      <div className="panel-body">
        <div className="stack">
          <p className="note" style={{ marginTop: 0 }}>
            Le format d’échange du Jeu de la Vie. Colle un motif du LifeWiki ou de Golly, ou
            exporte ta grille pour la partager.
          </p>

          <label className="sr-only" htmlFor="rle-text">
            Contenu RLE
          </label>
          <textarea
            id="rle-text"
            className="textarea"
            value={text}
            spellCheck={false}
            placeholder={'x = 3, y = 3, rule = B3/S23\nbo$2bo$3o!'}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
          />

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="row">
            <button className="btn" onClick={doImport} disabled={text.trim() === ''}>
              Importer
            </button>
            <button className="btn" onClick={onRequestExport}>
              Exporter la grille
            </button>
          </div>

          <div className="row">
            <button className="btn" onClick={copy} disabled={text.trim() === ''}>
              {copied ? 'Copié' : 'Copier'}
            </button>
            <button className="btn" onClick={download} disabled={text.trim() === ''}>
              Télécharger
            </button>
          </div>

          <p className="note">
            L’import se pose au centre de la vue. Un caractère inconnu est refusé plutôt que
            deviné : un motif silencieusement faux vaut moins qu’une erreur franche.
          </p>
        </div>
      </div>
    </aside>
  );
}
