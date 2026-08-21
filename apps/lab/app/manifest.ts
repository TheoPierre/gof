import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zero Player — Le Labo',
    short_name: 'Le Labo',
    description:
      "Le Jeu de la Vie de Conway sur une grille infinie. Dessine, importe un motif, regarde ce qui en sort.",
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#06060a',
    theme_color: '#06060a',
    lang: 'fr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
