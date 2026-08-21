import type { MetadataRoute } from 'next';

import { CATALOGUE } from '@zp/content';

import { LOCALES } from '../lib/i18n';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gof-lab.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) => [
    { url: `${SITE}/${locale}`, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${SITE}/${locale}/lab`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${SITE}/${locale}/patterns`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${SITE}/${locale}/about`, changeFrequency: 'yearly' as const, priority: 0.3 },
    ...CATALOGUE.map((pattern) => ({
      url: `${SITE}/${locale}/patterns/${pattern.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]);
}
