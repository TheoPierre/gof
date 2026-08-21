import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gof-lab.vercel.app';
const DESCRIPTION =
  'Le Jeu de la Vie de Conway, sur une grille jusqu’à 2048 cellules de côté. Dessine, importe un motif, regarde ce qui en sort.';

export const metadata: Metadata = {
  // Sert de base aux URL absolues des aperçus de lien.
  metadataBase: new URL(SITE),
  title: {
    default: 'Le Labo — Zero Player',
    template: '%s — Zero Player',
  },
  description: DESCRIPTION,
  applicationName: 'Zero Player',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Zero Player',
    title: 'Le Labo — Zero Player',
    description: DESCRIPTION,
    url: SITE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Le Labo — Zero Player',
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#06060a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
