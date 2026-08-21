import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { CATALOGUE } from '@zp/content';

import LanguageSwitch from '../../../components/LanguageSwitch';
import { analyticsEnabled } from '../../../lib/analytics';
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
    title: dict.about.title,
    description: dict.about.lede,
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/about`])),
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const t = dict.about;

  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">
          Zero Player <LanguageSwitch locale={locale} path="/about" />
        </p>
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>

        <h2>{t.rulesHeading}</h2>
        <p>{t.rulesIntro}</p>
        <ul>
          <li>{t.rule1}</li>
          <li>{t.rule2}</li>
          <li>{t.rule3}</li>
        </ul>
        <p>{t.rulesOutro}</p>

        <h2>{t.siteHeading}</h2>
        <p>{t.siteBody(CATALOGUE.length)}</p>
        <p>{t.siteBody2}</p>

        <h2>{t.creditsHeading}</h2>
        <p>
          {t.creditsBody.split('LifeWiki')[0]}
          <a href="https://conwaylife.com/wiki/" rel="noreferrer noopener" target="_blank">
            LifeWiki
          </a>
          {t.creditsBody.split('LifeWiki')[1]?.split('Catagolue')[0]}
          <a href="https://catagolue.hatsya.com/" rel="noreferrer noopener" target="_blank">
            Catagolue
          </a>
          {t.creditsBody.split('Catagolue')[1]}
        </p>
        <p>{t.creditsConway}</p>

        <h2>{t.privacyHeading}</h2>
        {analyticsEnabled ? (
          <>
            <p>{t.privacy1}</p>
            <p>{t.privacy2}</p>
            <p>{t.privacy3}</p>
          </>
        ) : (
          <p>{t.privacyOff}</p>
        )}

        <h2>{t.codeHeading}</h2>
        <p>
          <a href="https://github.com/TheoPierre/gof" rel="noreferrer noopener" target="_blank">
            github.com/TheoPierre/gof
          </a>{' '}
          — {t.codeBody}
        </p>

        <p className="back">
          <Link href={`/${locale}/lab`}>{t.back}</Link>
        </p>
      </article>
    </main>
  );
}
