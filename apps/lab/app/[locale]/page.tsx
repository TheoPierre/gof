import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER, patternById } from '@zp/content';

import LanguageSwitch from '../../components/LanguageSwitch';
import LiveBackdrop from '../../components/LiveBackdrop';
import PatternPreview from '../../components/PatternPreview';
import { LOCALES, getDict, isLocale } from '../../lib/i18n';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: { absolute: `Zero Player — ${dict.home.title}` },
    description: dict.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
  };
}

/** Trois motifs qui montrent d'un coup l'étendue de ce que produisent les règles. */
const VITRINE = ['glider', 'pulsar', 'gosper-gun'];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const t = dict.home;

  return (
    <main className="home">
      <section className="hero">
        <LiveBackdrop />
        <div className="hero-inner">
          <p className="eyebrow">
            {t.eyebrow} <LanguageSwitch locale={locale} />
          </p>
          <h1>{t.title}</h1>
          <p className="hero-lede">{t.lede}</p>
          <p className="hero-actions">
            <Link className="btn btn-lg btn-primary" href={`/${locale}/lab`}>
              {t.openLab}
            </Link>
            <Link className="btn btn-lg" href={`/${locale}/patterns`}>
              {t.browsePatterns}
            </Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <h2>{t.rulesTitle}</h2>
          <p className="band-lede">{t.rulesLede}</p>
          <ol className="rules">
            <li>
              <span className="rule-n">01</span>
              {dict.about.rule1}
            </li>
            <li>
              <span className="rule-n">02</span>
              {dict.about.rule2}
            </li>
            <li>
              <span className="rule-n">03</span>
              {dict.about.rule3}
            </li>
          </ol>
          <p className="band-note">{dict.about.rulesOutro}</p>
        </div>
      </section>

      <section className="band band-alt">
        <div className="band-inner">
          <h2>{t.labTitle}</h2>
          <p className="band-lede">{t.labLede}</p>
          <ul className="features">
            <li>{t.labPoint1}</li>
            <li>{t.labPoint2}</li>
            <li>{t.labPoint3}</li>
          </ul>
          <p className="hero-actions">
            <Link className="btn btn-primary" href={`/${locale}/lab`}>
              {t.openLab}
            </Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <h2>{t.catalogueTitle}</h2>
          <p className="band-lede">{t.catalogueLede}</p>

          <div className="showcase">
            {VITRINE.map((id) => {
              const pattern = patternById(id);
              if (!pattern) return null;
              return (
                <Link key={id} className="showcase-card" href={`/${locale}/patterns/${id}`}>
                  <PatternPreview rle={pattern.rle} />
                  <span className="showcase-name">{pattern.name}</span>
                  <span className="showcase-cat">{CATEGORY_LABELS[pattern.category][locale]}</span>
                </Link>
              );
            })}
          </div>

          <p className="band-counts">
            {CATEGORY_ORDER.map((c) => {
              const n = CATALOGUE.filter((p) => p.category === c).length;
              return (
                <span key={c}>
                  <b>{n}</b> {CATEGORY_LABELS[c][locale].toLowerCase()}
                </span>
              );
            })}
          </p>

          <p className="hero-actions">
            <Link className="btn" href={`/${locale}/patterns`}>
              {t.catalogueLink}
            </Link>
          </p>
        </div>
      </section>

      <footer className="home-footer">
        <Link href={`/${locale}/about`}>{dict.lab.about}</Link>
        <a href="https://github.com/TheoPierre/gof" rel="noreferrer noopener" target="_blank">
          {t.footerCode}
        </a>
        <a href="https://conwaylife.com/wiki/" rel="noreferrer noopener" target="_blank">
          {t.footerCredit}
        </a>
      </footer>
    </main>
  );
}
