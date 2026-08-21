import { notFound } from 'next/navigation';

import LabClient from '../../components/LabClient';
import { isLocale } from '../../lib/i18n';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LabClient locale={locale} />;
}
