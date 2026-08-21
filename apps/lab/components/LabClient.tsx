'use client';

import dynamic from 'next/dynamic';

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
const Lab = dynamic(() => import('./Lab'), {
  ssr: false,
  loading: () => <LabSkeleton />,
});

export default function LabClient() {
  return <Lab />;
}

function LabSkeleton() {
  return (
    <div className="lab" aria-busy="true">
      <div className="toolbar">
        <span className="badge">Initialisation du moteur…</span>
      </div>
      <div className="workspace">
        <div className="stage">
          <div className="hint">Chargement de la grille.</div>
        </div>
      </div>
    </div>
  );
}
