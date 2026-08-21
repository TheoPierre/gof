import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { decodeRle } from '@zp/codecs';
import { CATALOGUE, CATEGORY_LABELS, patternById, wikiUrl } from '@zp/content';
import { analyse } from '@zp/engine';

import LanguageSwitch from '../../../../components/LanguageSwitch';
import PatternPlayer from '../../../../components/PatternPlayer';
import { LOCALES, getDict, isLocale } from '../../../../lib/i18n';

// Une page par motif et par langue, rendue à la construction du site.
//
// C'est le canal d'acquisition principal du projet. La référence actuelle est
// une encyclopédie sans simulation jouable : on ne gagnera pas sur le contenu,
// on peut gagner sur l'expérience, et renvoyer vers elle pour le reste.

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => CATALOGUE.map((p) => ({ locale, slug: p.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const pattern = patternById(slug);
  if (!pattern || !isLocale(locale)) return {};
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gof-lab.vercel.app'),
    title: pattern.name,
    description: pattern.note[locale],
    alternates: {
      canonical: `/${locale}/patterns/${slug}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/patterns/${slug}`])),
    },
    // Sans le bloc twitter, une carte partagée hérite du titre générique du
    // layout — « The Lab » au lieu du nom du motif.
    openGraph: { title: `${pattern.name} — Zero Player`, description: pattern.note[locale] },
    twitter: { title: `${pattern.name} — Zero Player`, description: pattern.note[locale] },
  };
}

export default async function PatternPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const pattern = patternById(slug);
  if (!pattern || !isLocale(locale)) notFound();
  const dict = getDict(locale);
  const t = dict.pattern;

  // Mesuré à la construction en faisant tourner le motif, pas recopié : si un
  // chiffre est faux, c'est le moteur qui l'est, et ses vecteurs de référence
  // l'auraient dit avant.
  const facts = analyse(decodeRle(pattern.rle).cells, { maxGenerations: 400 });
  const peers = CATALOGUE.filter((p) => p.category === pattern.category && p.id !== pattern.id);

  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">
          <Link href={`/${locale}/patterns`}>{t.breadcrumb}</Link> ·{' '}
          {CATEGORY_LABELS[pattern.category][locale]}
          <LanguageSwitch locale={locale} path={`/patterns/${slug}`} />
        </p>
        <h1>{pattern.name}</h1>
        <p className="lede">{pattern.note[locale]}</p>

        <PatternPlayer rle={pattern.rle} label={pattern.name} locale={locale} />

        <h2>{t.measured}</h2>
        <dl className="facts">
          <div>
            <dt>{t.behaviour}</dt>
            <dd>{t.kinds[facts.kind]}</dd>
          </div>
          <div>
            <dt>{t.cells}</dt>
            <dd>{facts.population}</dd>
          </div>
          <div>
            <dt>{t.bounds}</dt>
            <dd>
              {facts.width} × {facts.height}
            </dd>
          </div>
          {facts.period !== undefined && facts.kind !== 'still-life' ? (
            <div>
              <dt>{t.period}</dt>
              <dd>{t.periodValue(facts.period)}</dd>
            </div>
          ) : null}
          {facts.speed ? (
            <div>
              <dt>{t.speed}</dt>
              <dd>{facts.speed}</dd>
            </div>
          ) : null}
          {facts.extinctAt !== undefined ? (
            <div>
              <dt>{t.extinction}</dt>
              <dd>{t.extinctionValue(facts.extinctAt)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="note">{t.measuredNote}</p>

        <h2>{t.rleHeading}</h2>
        <p>{t.rleIntro}</p>
        <pre className="rle">{pattern.rle}</pre>

        <p className="cta">
          <Link className="btn" href={`/${locale}/lab?motif=${pattern.id}`}>
            {t.openInLab}
          </Link>
        </p>

        <h2>{t.further}</h2>
        <p>
          {t.furtherBody}{' '}
          <a href={wikiUrl(pattern)} rel="noreferrer noopener" target="_blank">
            {t.wikiLink}
          </a>
          , CC BY-SA.
        </p>

        {peers.length > 0 ? (
          <>
            <h2>{t.family}</h2>
            <ul className="peers">
              {peers.map((p) => (
                <li key={p.id}>
                  <Link href={`/${locale}/patterns/${p.id}`}>{p.name}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="back">
          <Link href={`/${locale}/patterns`}>{t.allPatterns}</Link> ·{' '}
          <Link href={`/${locale}/lab`}>{t.lab}</Link>
        </p>
      </article>
    </main>
  );
}
