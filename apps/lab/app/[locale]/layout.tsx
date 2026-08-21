import { Analytics } from '@vercel/analytics/next';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import ServiceWorker from '../../components/ServiceWorker';
import { DEFAULT_LOCALE, LOCALES, getDict, isLocale, type Locale } from '../../lib/i18n';
import '../globals.css';

// La racine du site vit sous un segment de langue. Next l'autorise : c'est
// cette mise en page qui rend <html>, et c'est ce qui permet à l'attribut
// lang de dire la vérité.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gof-lab.vercel.app';

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
  const title = `${dict.lab.title} — Zero Player`;

  return {
    metadataBase: new URL(SITE),
    title: { default: title, template: '%s — Zero Player' },
    description: dict.siteDescription,
    applicationName: 'Zero Player',
    alternates: {
      canonical: `/${locale}`,
      // Sans ces liens, les deux langues se font concurrence sur les mêmes
      // requêtes au lieu de se compléter.
      languages: Object.fromEntries([
        ...LOCALES.map((l) => [l, `/${l}`]),
        ['x-default', `/${DEFAULT_LOCALE}`],
      ]),
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_GB',
      siteName: 'Zero Player',
      title,
      description: dict.siteDescription,
      url: `${SITE}/${locale}`,
    },
    twitter: { card: 'summary_large_image', title, description: dict.siteDescription },
  };
}

export const viewport: Viewport = {
  themeColor: '#06060a',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale}>
      <body>
        {children}
        {/*
          Mesure d'audience Vercel : pages vues, provenance, pays, appareil.
          Sans cookie, script de même origine — il passe COEP sans aménagement.
          Les questions de comportement restent du ressort de lib/analytics.ts.
        */}
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}

export type { Locale };
