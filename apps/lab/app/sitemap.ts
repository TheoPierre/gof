import type { MetadataRoute } from 'next';

import { CATALOGUE } from '@zp/content';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gof-lab.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/motifs`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/a-propos`, changeFrequency: 'yearly', priority: 0.3 },
    ...CATALOGUE.map((pattern) => ({
      url: `${SITE}/motif/${pattern.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
