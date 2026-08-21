'use client';

import { useEffect, useState } from 'react';

import { decodeRle } from '@zp/codecs';

import { getDict, type Locale } from '../lib/i18n';

interface Props {
  locale: Locale;
  /** RLE de la grille courante, renvoyé par le worker après « Exporter ». */
  exported: string | null;
  onRequestExport: () => void;
  onImport: (rle: string) => void;
  onClose: () => void;
}

export default function RlePanel({ locale, exported, onRequestExport, onImport, onClose }: Props) {
  const t = getDict(locale).panel;
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
        setError(t.emptyPattern);
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
      setError(t.clipboardRefused);
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
    <aside className="panel" aria-label={t.rleTitle}>
      <div className="panel-head">
        <span>{t.rleTitle}</span>
        <button className="icon-btn" onClick={onClose} aria-label={t.closeRle}>
          ✕
        </button>
      </div>

      <div className="panel-body">
        <div className="stack">
          <p className="note" style={{ marginTop: 0 }}>
            {t.rleIntro}
          </p>

          <label className="sr-only" htmlFor="rle-text">
            {t.rleContent}
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
              {t.import}
            </button>
            <button className="btn" onClick={onRequestExport}>
              {t.exportGrid}
            </button>
          </div>

          <div className="row">
            <button className="btn" onClick={copy} disabled={text.trim() === ''}>
              {copied ? t.copied : t.copy}
            </button>
            <button className="btn" onClick={download} disabled={text.trim() === ''}>
              {t.download}
            </button>
          </div>

          <p className="note">
            {t.rleFooter}
          </p>
        </div>
      </div>
    </aside>
  );
}
