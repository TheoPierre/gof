import { notFound } from 'next/navigation';

import LabClient from '../../../components/LabClient';
import { getDict, isLocale } from '../../../lib/i18n';
import { LOCALES } from '../../../lib/i18n';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: dict.lab.title,
    description: dict.siteDescription,
    alternates: {
      canonical: `/${locale}/lab`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/lab`])),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LabClient locale={locale} />;
}
