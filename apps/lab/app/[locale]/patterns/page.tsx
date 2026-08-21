import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER } from '@zp/content';

import LanguageSwitch from '../../../components/LanguageSwitch';
import { LOCALES, getDict, isLocale } from '../../../lib/i18n';

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
    title: dict.patterns.title,
    description: dict.patterns.lede,
    alternates: {
      canonical: `/${locale}/patterns`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/patterns`])),
    },
  };
}

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);

  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">
          Zero Player <LanguageSwitch locale={locale} path="/patterns" />
        </p>
        <h1>{dict.patterns.title}</h1>
        <p className="lede">{dict.patterns.lede}</p>

        {CATEGORY_ORDER.map((category) => {
          const patterns = CATALOGUE.filter((p) => p.category === category);
          if (patterns.length === 0) return null;
          return (
            <section key={category}>
              <h2>{CATEGORY_LABELS[category][locale]}</h2>
              <ul className="index">
                {patterns.map((p) => (
                  <li key={p.id}>
                    <Link href={`/${locale}/patterns/${p.id}`}>{p.name}</Link>
                    <span>{p.note[locale]}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="back">
          <Link href={`/${locale}/lab`}>{dict.pattern.lab}</Link> ·{' '}
          <Link href={`/${locale}/about`}>{dict.lab.about}</Link>
        </p>
      </article>
    </main>
  );
}
