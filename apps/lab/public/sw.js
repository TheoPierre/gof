// Service worker — hors-ligne et chargements suivants.
//
// Il a été volontairement reporté jusqu'ici, pour deux raisons qui décidaient
// de sa conception :
//
// 1. **Un cache périmé sert une version morte.** D'où : réseau d'abord pour
//    les documents. En ligne, on voit toujours la dernière version ; hors
//    ligne, on voit la dernière connue. Un mauvais déploiement se répare tout
//    seul au prochain chargement en ligne, sans intervention.
//
// 2. **COEP.** La page n'est isolée d'origine que si la réponse porte
//    Cross-Origin-Opener-Policy et Cross-Origin-Embedder-Policy — sans quoi
//    SharedArrayBuffer disparaît et tout le rendu retombe sur postMessage, en
//    silence. On ne fabrique donc jamais de réponse : on rejoue celle du
//    réseau telle quelle, en-têtes compris, ce que l'API Cache préserve.

const CACHE = 'zero-player-v1';

/** Ces fichiers portent un hachage dans leur nom : ils ne périment jamais. */
const IMMUABLE = /\/_next\/static\//;

self.addEventListener('install', () => {
  // Pas de pré-chargement : on ne veut pas deviner ce dont l'utilisateur aura
  // besoin, et un install qui échoue laisserait le worker coincé.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  // La mesure d'audience ne doit ni être mise en cache ni être rejouée.
  if (url.pathname.startsWith('/_vercel/')) return;

  if (IMMUABLE.test(url.pathname)) {
    event.respondWith(cacheDAbord(requete));
    return;
  }

  if (requete.mode === 'navigate' || requete.destination === 'document') {
    event.respondWith(reseauDAbord(requete));
  }
});

async function cacheDAbord(requete) {
  const enCache = await caches.match(requete);
  if (enCache) return enCache;

  const reponse = await fetch(requete);
  if (reponse.ok && reponse.type === 'basic') {
    const cache = await caches.open(CACHE);
    void cache.put(requete, reponse.clone());
  }
  return reponse;
}

async function reseauDAbord(requete) {
  try {
    const reponse = await fetch(requete);
    // On ne met en cache que des réponses complètes de même origine : une
    // réponse opaque n'a pas d'en-têtes, donc pas de COOP/COEP, et la
    // rejouer ferait perdre l'isolation d'origine.
    if (reponse.ok && reponse.type === 'basic') {
      const cache = await caches.open(CACHE);
      void cache.put(requete, reponse.clone());
    }
    return reponse;
  } catch (echec) {
    const enCache = await caches.match(requete);
    if (enCache) return enCache;
    throw echec;
  }
}
