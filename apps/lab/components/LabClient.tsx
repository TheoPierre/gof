'use client';

import dynamic from 'next/dynamic';

import type { Locale } from '../lib/i18n';

/**
 * Le Labo n'est jamais rendu côté serveur.
 *
 * Il ne dépend que d'API du navigateur — Worker, SharedArrayBuffer, canvas —
 * et son HTML serveur serait jeté à la première image. Il ne porte aucun
 * contenu indexable : le référencement du projet passe par les pages de
 * motifs, pas par l'application.
 *
 * En échange, on supprime toute la surface d'hydratation. C'est ce qui rend
 * l'application insensible aux extensions de navigateur qui modifient le DOM
 * avant que React n'hydrate — une divergence sur laquelle on n'a aucune prise,
 * et qui produit des avertissements impossibles à corriger côté application.
 */
const Lab = dynamic(() => import('./Lab'), { ssr: false, loading: () => <LabSkeleton /> });

export default function LabClient({ locale }: { locale: Locale }) {
  return <Lab locale={locale} />;
}

function LabSkeleton() {
  return (
    <div className="lab" aria-busy="true">
      <header className="chrome topbar">
        <span className="brand">
          ZERO&nbsp;<em>PLAYER</em>
        </span>
        <span className="topbar-meta">B3/S23</span>
      </header>
    </div>
  );
}
