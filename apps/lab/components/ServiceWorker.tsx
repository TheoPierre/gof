'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker, en production seulement.
 *
 * En développement il servirait des morceaux périmés à chaque rechargement,
 * exactement la panne qu'on a déjà eue en mélangeant les dossiers de sortie.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const enregistrer = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Un enregistrement raté n'empêche rien : le site fonctionne sans.
      });
    };

    // Après le chargement, pour ne pas disputer la bande passante à la page.
    if (document.readyState === 'complete') enregistrer();
    else globalThis.addEventListener('load', enregistrer, { once: true });
  }, []);

  return null;
}
