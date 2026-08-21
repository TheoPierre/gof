import Link from 'next/link';
import type { Metadata } from 'next';

import { CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER } from '@zp/content';

export const metadata: Metadata = {
  title: 'Les motifs',
  description:
    'Natures mortes, oscillateurs, vaisseaux, mathusalems et croissance infinie : les motifs classiques du Jeu de la Vie, chacun avec sa simulation jouable.',
};

export default function MotifsPage() {
  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">Zero Player</p>
        <h1>Les motifs</h1>
        <p className="lede">
          Des trois cellules du blinker aux trente-six du canon de Gosper, voici ce que cinquante
          ans de recherche ont sorti de trois règles. Chaque motif a sa page et sa simulation.
        </p>

        {CATEGORY_ORDER.map((category) => {
          const patterns = CATALOGUE.filter((p) => p.category === category);
          if (patterns.length === 0) return null;
          return (
            <section key={category}>
              <h2>{CATEGORY_LABELS[category]}</h2>
              <ul className="index">
                {patterns.map((p) => (
                  <li key={p.id}>
                    <Link href={'/motif/' + p.id}>{p.name}</Link>
                    <span>{p.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="back">
          <Link href="/">← Le Labo</Link> · <Link href="/a-propos">À propos</Link>
        </p>
      </article>
    </main>
  );
}
