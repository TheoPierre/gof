import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // `next dev` et `next build` écrivent par défaut dans le même dossier. Un
  // build lancé pendant que le serveur de dev tourne remplace les chunks que
  // celui-ci a en mémoire, et la page casse sur « Cannot find module
  // ./695.js ». On leur donne chacun le sien.
  //
  // C'est le *développement* qu'on déplace, pas la production : les
  // hébergeurs attendent `.next`, et sortir de ce chemin serait une surprise
  // au premier déploiement.
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',

  // Un package-lock.json traîne dans Downloads/ : sans cette ancre, Next
  // remonte trop haut pour tracer ses fichiers.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),

  // Les paquets internes sont livrés en TypeScript brut, sans étape de build.
  transpilePackages: ['@zp/engine', '@zp/codecs', '@zp/worker', '@zp/render', '@zp/content'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Sans isolation d'origine, SharedArrayBuffer est indisponible et
          // toute la simulation retombe sur le chemin postMessage. Ces deux
          // en-têtes sont la condition du rendu sans copie.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default config;
