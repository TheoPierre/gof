import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { decodeRle } from '@zp/codecs';
import { CATALOGUE, CATEGORY_LABELS, patternById, wikiUrl } from '@zp/content';
import { analyse, type Analysis } from '@zp/engine';

import PatternPlayer from '../../../components/PatternPlayer';

// Une page par motif nommé, rendue à la construction du site.
//
// C'est le canal d'acquisition principal du projet. Des gens cherchent
// « glider game of life » ou « canon à planeurs » tous les jours, et la
// référence actuelle est une encyclopédie sans simulation jouable. On ne
// gagnera pas sur le contenu — le LifeWiki a cinquante ans d'avance — mais on
// peut gagner sur l'expérience, et renvoyer vers lui pour le reste.

export function generateStaticParams() {
  return CATALOGUE.map((pattern) => ({ slug: pattern.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pattern = patternById(slug);
  if (!pattern) return {};
  return {
    title: pattern.name,
    description: pattern.note,
    openGraph: { title: pattern.name + ' — Zero Player', description: pattern.note },
  };
}

const KIND_LABELS: Record<Analysis['kind'], string> = {
  'still-life': 'Nature morte',
  oscillator: 'Oscillateur',
  spaceship: 'Vaisseau',
  unstable: 'Sans période observée',
  extinct: 'Motif qui meurt',
};

export default async function MotifPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pattern = patternById(slug);
  if (!pattern) notFound();

  // Mesuré à la construction en faisant tourner le motif, pas recopié : si un
  // chiffre est faux, c'est le moteur qui l'est, et ses vecteurs de référence
  // l'auraient dit avant.
  const facts = analyse(decodeRle(pattern.rle).cells, { maxGenerations: 400 });
  const voisins = CATALOGUE.filter((p) => p.category === pattern.category && p.id !== pattern.id);

  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">
          <Link href="/motifs">Motifs</Link> · {CATEGORY_LABELS[pattern.category]}
        </p>
        <h1>{pattern.name}</h1>
        <p className="lede">{pattern.note}</p>

        <PatternPlayer rle={pattern.rle} label={pattern.name} />

        <h2>Ce que le moteur mesure</h2>
        <dl className="facts">
          <div>
            <dt>Comportement</dt>
            <dd>{KIND_LABELS[facts.kind]}</dd>
          </div>
          <div>
            <dt>Cellules</dt>
            <dd>{facts.population}</dd>
          </div>
          <div>
            <dt>Encombrement</dt>
            <dd>
              {facts.width} × {facts.height}
            </dd>
          </div>
          {facts.period !== undefined && facts.kind !== 'still-life' ? (
            <div>
              <dt>Période</dt>
              <dd>{facts.period} générations</dd>
            </div>
          ) : null}
          {facts.speed ? (
            <div>
              <dt>Vitesse</dt>
              <dd>{facts.speed}</dd>
            </div>
          ) : null}
          {facts.extinctAt !== undefined ? (
            <div>
              <dt>Extinction</dt>
              <dd>génération {facts.extinctAt}</dd>
            </div>
          ) : null}
        </dl>
        <p className="note">
          Ces valeurs sont calculées à la construction du site en faisant tourner le motif. Aucune
          n'est recopiée d'une source.
        </p>

        <h2>Le motif en RLE</h2>
        <p>
          Le format d'échange du Jeu de la Vie. Copie-le pour l'ouvrir dans Golly, ou dépose-le dans
          le Labo.
        </p>
        <pre className="rle">{pattern.rle}</pre>

        <p className="cta">
          <Link className="btn" href={'/?motif=' + pattern.id}>
            Ouvrir dans le Labo →
          </Link>
        </p>

        <h2>Pour aller plus loin</h2>
        <p>
          L'histoire complète de ce motif — qui l'a trouvé, quand, et ce qu'on en a tiré depuis —
          est sur{' '}
          <a href={wikiUrl(pattern)} rel="noreferrer noopener" target="_blank">
            sa page du LifeWiki
          </a>
          , sous licence CC BY-SA.
        </p>

        {voisins.length > 0 ? (
          <>
            <h2>Dans la même famille</h2>
            <ul className="peers">
              {voisins.map((p) => (
                <li key={p.id}>
                  <Link href={'/motif/' + p.id}>{p.name}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="back">
          <Link href="/motifs">← Tous les motifs</Link> · <Link href="/">Le Labo</Link>
        </p>
      </article>
    </main>
  );
}
