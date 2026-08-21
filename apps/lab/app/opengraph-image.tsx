import { ImageResponse } from 'next/og';

// Image d'aperçu des liens partagés. Sans elle, un lien posté sur Hacker News
// ou dans un forum n'est qu'une URL nue — or le partage est le canal
// d'acquisition principal du projet.

export const alt = 'Zero Player — le Jeu de la Vie de Conway';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VOID = '#06060a';
const AMBER = '#ff9b3d';
const MUTED = '#7d7668';

/** Le planeur : trois cellules par côté, la forme emblématique du sujet. */
const GLIDER: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

export default function Image() {
  const cell = 96;
  const gap = 10;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 72,
          padding: '0 88px',
          background: VOID,
          // Papier millimétré très faible, comme la trame d'une grille.
          backgroundImage: `linear-gradient(to right, rgba(255,155,61,0.07) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,155,61,0.07) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: cell * 3 + gap * 2,
            height: cell * 3 + gap * 2,
            flexShrink: 0,
          }}
        >
          {GLIDER.map(([x, y]) => (
            <div
              key={`${x}-${y}`}
              style={{
                position: 'absolute',
                left: x * (cell + gap),
                top: y * (cell + gap),
                width: cell,
                height: cell,
                background: AMBER,
                borderRadius: 10,
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: AMBER,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Zero Player
          </div>
          <div style={{ fontSize: 34, color: '#e9e3d8', marginTop: 18, lineHeight: 1.3 }}>
            Le Jeu de la Vie de Conway
          </div>
          <div style={{ fontSize: 26, color: MUTED, marginTop: 26, lineHeight: 1.4 }}>
            Dessine, importe un motif, regarde ce qui en sort.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
