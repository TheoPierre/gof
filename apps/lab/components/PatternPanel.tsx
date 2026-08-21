'use client';

import { CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER } from '@zp/content';

import { getDict, type Locale } from '../lib/i18n';
import PatternPreview from './PatternPreview';

interface Props {
  locale: Locale;
  armedId: string | null;
  onArm: (id: string, rle: string, name: string) => void;
  onClose: () => void;
}

export default function PatternPanel({ locale, armedId, onArm, onClose }: Props) {
  const t = getDict(locale).panel;
  return (
    <aside className="panel" aria-label={t.patternsTitle}>
      <div className="panel-head">
        <span>{t.patternsTitle}</span>
        <button className="icon-btn" onClick={onClose} aria-label={t.close}>
          ✕
        </button>
      </div>

      <div className="panel-body">
        <p className="note" style={{ marginTop: 0 }}>
          {t.patternsIntro}
        </p>

        {CATEGORY_ORDER.map((category) => {
          const patterns = CATALOGUE.filter((p) => p.category === category);
          if (patterns.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="cat-title">{CATEGORY_LABELS[category][locale]}</h2>
              <div className="pattern-grid">
                {patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    type="button"
                    className="pattern-card"
                    aria-pressed={armedId === pattern.id}
                    // Le nom accessible doit être le nom du motif. Sans ça, un
                    // lecteur d'écran annonce la description entière — trois
                    // lignes de texte pour choisir une vignette.
                    aria-label={pattern.name}
                    title={pattern.note[locale]}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', pattern.rle);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onArm(pattern.id, pattern.rle, pattern.name)}
                  >
                    <PatternPreview rle={pattern.rle} />
                    <span className="pattern-name">{pattern.name}</span>
                    <span className="pattern-note">{pattern.note[locale]}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
