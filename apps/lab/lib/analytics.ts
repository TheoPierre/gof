// Mesure d'audience — minimale, sans cookie, sans dépendance.
//
// Le test de marché doit répondre à cinq questions (voir DEPLOY.md) : le sujet
// mobilise-t-il, par quel canal, est-ce un jouet de trente secondes ou un
// outil, la création prend-elle, et les gens réclament-ils un mode jeu. On
// n'instrumente que ça.
//
// Trois choix qui découlent du public visé — des développeurs, des matheux et
// des enseignants, c'est-à-dire les gens les plus prompts à ouvrir l'onglet
// réseau :
//
//   1. **Aucun stockage côté client.** Ni cookie, ni localStorage, ni
//      sessionStorage. L'identifiant est tiré à chaque chargement de page et
//      meurt avec elle. Rien à consentir, donc pas de bandeau — et pas de
//      suivi entre visites, ce qu'on assume : on compte des visites, pas des
//      personnes.
//   2. **Aucune capture automatique.** Pas de clics enregistrés à l'aveugle,
//      pas de rejeu de session. Chaque événement envoyé est écrit à la main
//      dans ce fichier, et sa liste est lisible ci-dessous.
//   3. **Silencieux par défaut.** Sans clé configurée, rien ne part — le
//      développement local n'émet aucune requête.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/** La liste exhaustive de ce qu'on mesure. Rien d'autre n'est envoyé. */
export type LabEvent =
  /** Une visite. `shared` dit si le rendu sans copie est actif en production. */
  | { name: 'lab_loaded'; shared: boolean; worldSize: number }
  /** Un motif du catalogue déposé sur la grille. */
  | { name: 'pattern_placed'; pattern: string }
  /** Un premier trait dessiné — une fois par visite, pas par geste. */
  | { name: 'drawing_started' }
  | { name: 'simulation_started' }
  | { name: 'rle_imported' }
  | { name: 'rle_exported' }
  | { name: 'grid_resized'; worldSize: number; topology: string }
  /** Durée de la visite, envoyée au départ de la page. */
  | { name: 'visit_ended'; seconds: number; interactions: number };

const visitId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let startedAt = 0;
let interactions = 0;
const seen = new Set<string>();

/** Respecte les signaux de refus du navigateur, sans discuter. */
function refused(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

export function track(event: LabEvent): void {
  interactions++;
  if (!KEY || refused()) return;

  const { name, ...properties } = event;

  // `keepalive` permet à la requête de survivre au déchargement de la page,
  // ce dont dépend « visit_ended ».
  void fetch(`${HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      api_key: KEY,
      event: name,
      distinct_id: visitId,
      properties: {
        ...properties,
        // L'origine du trafic : la question « par quel canal » du test de
        // marché. On ne garde que le domaine référent, pas l'URL complète.
        referrer_host: referrerHost(),
        $current_url: typeof location === 'undefined' ? undefined : location.pathname,
      },
    }),
  }).catch(() => {
    // Une mesure qui échoue ne doit jamais gêner l'usage du produit.
  });
}

/** N'émet l'événement qu'une fois par visite. */
export function trackOnce(event: LabEvent): void {
  if (seen.has(event.name)) return;
  seen.add(event.name);
  track(event);
}

function referrerHost(): string | undefined {
  if (typeof document === 'undefined' || document.referrer === '') return undefined;
  try {
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? undefined : host;
  } catch {
    return undefined;
  }
}

/**
 * Démarre le chronomètre de la visite et arme l'envoi de sa durée.
 * `pagehide` plutôt que `beforeunload` : c'est le seul qui se déclenche
 * de façon fiable sur mobile.
 */
export function startVisit(): () => void {
  startedAt = Date.now();

  const end = () => {
    if (startedAt === 0) return;
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    startedAt = 0;
    track({ name: 'visit_ended', seconds, interactions });
  };

  globalThis.addEventListener('pagehide', end);
  return () => {
    globalThis.removeEventListener('pagehide', end);
    end();
  };
}

/** Vrai si la mesure est configurée. Affiché sur la page « à propos ». */
export const analyticsEnabled = Boolean(KEY);
