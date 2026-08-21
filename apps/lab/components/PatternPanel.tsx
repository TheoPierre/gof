'use client';

import { CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER } from '@zp/content';

import PatternPreview from './PatternPreview';

interface Props {
  armedId: string | null;
  onArm: (id: string, rle: string, name: string) => void;
  onClose: () => void;
}

export default function PatternPanel({ armedId, onArm, onClose }: Props) {
  return (
    <aside className="panel" aria-label="Bibliothèque de motifs">
      <div className="panel-head">
        <span>Motifs</span>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer la bibliothèque">
          ✕
        </button>
      </div>

      <div className="panel-body">
        <p className="note" style={{ marginTop: 0 }}>
          Clique un motif puis clique la grille pour le déposer. Tu peux aussi le glisser
          directement dessus.
        </p>

        {CATEGORY_ORDER.map((category) => {
          const patterns = CATALOGUE.filter((p) => p.category === category);
          if (patterns.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="cat-title">{CATEGORY_LABELS[category]}</h2>
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
                    title={pattern.note}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', pattern.rle);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onArm(pattern.id, pattern.rle, pattern.name)}
                  >
                    <PatternPreview rle={pattern.rle} />
                    <span className="pattern-name">{pattern.name}</span>
                    <span className="pattern-note">{pattern.note}</span>
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
