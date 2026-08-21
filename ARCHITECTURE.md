# Architecture

## L'invariant qui gouverne tout

**Un moteur, deux exécutions.** `@zp/engine` est écrit en TypeScript pur, sans
dépendance ni accès au DOM, et il est importé *à la fois* par le navigateur et
par le serveur.

Le Jeu de la Vie n'emploie que des entiers et des opérations bit à bit : aucun
flottant, donc aucune divergence possible entre moteurs JavaScript. Le client
simule pour l'affichage, le serveur rejoue pour vérifier, et les deux obtiennent
le même résultat au bit près.

C'est de cet invariant que dépend l'anti-triche, donc les classements, donc la
crédibilité du produit. **Toute modification du moteur doit laisser passer les
vecteurs de référence** (`packages/engine/test/golden.test.ts`).

---

## Structure du dépôt

```
zero-player/
├── packages/engine     le cœur — zéro dépendance, zéro DOM
├── packages/codecs     RLE, .cells, apgcode
├── packages/db         schéma Drizzle + migrations        (phase 3)
├── packages/ui         système de design terminal          (phase 2)
├── packages/content    catalogue de motifs, leçons, puzzles (phase 2)
├── apps/web            Next.js — site, jeu, boutique       (phase 2)
└── apps/worker         vérification de scores, Arène, GIF  (phase 4)
```

Monorepo en **npm workspaces**. Le plan initial disait pnpm ; npm workspaces
suffit, est déjà installé, et évite une dépendance d'outillage.

---

## Outillage

Node 24 exécute TypeScript nativement (suppression des types au chargement).
Conséquence directe : **le moteur n'a ni étape de build, ni dépendance, ni
runner de test tiers.** On teste avec `node --test`, on lance avec `node
fichier.ts`.

| Commande | Effet |
|---|---|
| `npm test` | Vecteurs de référence et tests de codecs (~1 s) |
| `npm run test:slow` | Vecteur Acorn — 2 816², plusieurs minutes |
| `npm run bench` | Débit du moteur |
| `npm run typecheck` | `tsc --build`, sans émission |
| `npm run dev -w @zp/lab` | Le Labo sur le port 3210 |
| `npm run build -w @zp/lab` | Build de production, dans `.next-build` |

`next dev` écrit dans `.next`, `next build` dans `.next-build` : sans cette
séparation, un build lancé pendant que le serveur de développement tourne
remplace les chunks servis et casse la page. Voir D-017.

Vitest et un bundler n'arriveront qu'avec `apps/web`, où ils servent vraiment.

---

## Le moteur

### Représentation

Une cellule = un bit. La colonne `x` de la ligne `y` vit dans
`bits[y * wordsPerRow + (x >>> 5)]`, au bit `x & 31`, le bit 0 étant la colonne
la plus à gauche du mot.

**Invariant :** les bits au-delà de `width` dans le dernier mot d'une ligne sont
toujours à zéro. Toute la logique de décalage en dépend ; `Board.maskRows()` et
le masquage en fin de pas le maintiennent.

Deux topologies : `torus` (bords recollés — les planeurs survivent, c'est le
défaut) et `bounded` (bords morts). Le prototype d'origine n'avait que des murs,
ce qui tuait tout motif mobile.

### Le pas de simulation

Trente-deux cellules avancent d'une génération en une seule passe :

1. **Décalages horizontaux.** Pour chaque ligne, on précalcule `left[x] =
   src[x-1]` et `right[x] = src[x+1]` sur toute la grille, avec recollement des
   bords en topologie torique.
2. **Comptage.** Les huit bitmaps de voisinage sont additionnées dans un
   compteur binaire parallèle sur 4 bits (`s3 s2 s1 s0` = 0 à 8), par chaîne de
   demi-additionneurs.
3. **Règle.** Pour chaque compte que la règle mentionne, on construit le masque
   des cellules qui l'atteignent, puis
   `next = (~cur & naissances) | (cur & survies)`.

Coût mémoire : trois tampons de la taille de la grille (source, destination,
décalages). Un cache glissant de trois lignes ramènerait ça à O(largeur) — la
piste est notée, les vecteurs de référence protègent l'optimisation.

### Débit mesuré

| Grille | Cellules | Générations/s | Cellules/s |
|---|---|---|---|
| 256² | 0,07 M | 9 292 | 0,61 G |
| 512² | 0,26 M | 3 394 | 0,89 G |
| 1024² | 1,05 M | **884** | 0,93 G |
| 2048² | 4,19 M | 219 | 0,92 G |

Seuil de sortie de phase 1 : ≥ 30 gén./s à un million de cellules. On est
**29× au-dessus**. Rust/WASM est donc écarté pour la v1 ; HashLife arrivera
comme fonctionnalité produit (« temps profond ») et non comme optimisation.

### Vecteurs de référence

Chaque assertion est un fait publié depuis des décennies. Si l'un tombe, le
moteur est faux — et tout classement calculé avec lui l'est aussi.

| Motif | Assertion | Suite |
|---|---|---|
| Blinker | période 2, position inchangée | rapide |
| Planeur | translaté de (1,1) après 4 générations | rapide |
| Planeur sur tore | retour au point de départ après 4N générations, sur 16/20/32/33 | rapide |
| Diehard | population nulle exactement à la génération 130 | rapide |
| R-pentomino | stabilisé à la génération 1103, population 116 | rapide (0,5 s) |
| Canon de Gosper | +5 cellules toutes les 30 générations | rapide |
| Acorn | stabilisé à la génération 5206, population 633 | lente |

Les figures publiées valent pour une grille **infinie**. Sur une grille finie,
il faut assez de place pour que les planeurs éjectés n'atteignent jamais le
bord : 640² pour le R-pentomino, 2 816² pour l'Acorn. D'où la suite lente.

---

## Les codecs

`@zp/codecs` lit et écrit le **RLE**, le format d'échange du LifeWiki, de Golly,
de Catagolue et des forums. C'est l'investissement au meilleur rendement du
projet : il donne accès à des milliers de motifs déjà nommés, datés et
documentés.

Le parseur **refuse** ce qu'il ne comprend pas (caractère multi-états, règle
invalide) plutôt que de deviner : un motif silencieusement faux est pire qu'une
erreur.

---

---

## L'exécution hors thread principal

`@zp/worker` sort la simulation du thread de l'interface. Trois fichiers
comptent :

| Fichier | Rôle |
|---|---|
| `protocol.ts` | Commandes, événements, disposition du tampon partagé. Aucune logique. |
| `simulation.ts` | **Tout le comportement.** Ne connaît ni `Worker`, ni `self`, ni `postMessage` : elle reçoit des commandes, émet des événements, lit l'heure par une horloge injectée. |
| `runtime.ts` / `client.ts` | Adaptateurs. Décrivent par des interfaces minimales le peu qu'ils attendent de l'environnement. |

Conséquence de ce découpage : **tout se teste sous Node**, avec une horloge
pilotée à la main et une paire worker/client en mémoire. Aucun navigateur, aucun
`jsdom`, aucune attente de temps réel. Et rien ne référence de global ambiant,
donc tout passe au typecheck avec la seule lib `ES2023`.

### Publication des trames

Deux chemins, décidés à l'initialisation :

1. **SharedArrayBuffer.** La simulation écrit, le rendu lit directement. Aucun
   message pendant que ça tourne. Demande l'isolation d'origine (en-têtes
   COOP/COEP à poser dans la configuration Next).
2. **postMessage.** Repli automatique et transparent : une copie transférée par
   trame, à cadence réduite.

Trois décisions non évidentes :

- **On publie une copie figée, pas les tampons de travail.** Le moteur permute
  ses deux tampons à chaque génération ; à 900 générations par seconde pour 60
  images, le rendu lirait une grille en cours de réécriture. La copie coûte
  128 Ko pour un million de cellules — négligeable devant la simulation.
- **Trois trames, pas deux.** Avec deux, le rédacteur réécrit la trame que le
  lecteur tient encore dès la publication suivante. Avec trois, le lecteur
  dispose de deux cycles complets pour dessiner.
- **Le retard se plafonne à une seconde, avant d'être consommé.** Un onglet
  laissé en arrière-plan une heure reviendrait sinon avec des millions de
  générations à rattraper. Le budget de temps par réveil (12 ms) ne suffit pas :
  il étale le rattrapage au lieu de l'annuler. Un test le vérifie.

### Cadence

La simulation se réveille au rythme des images, ou plus lentement si la vitesse
demandée est basse. Chaque réveil dispose de 12 ms : au-delà, elle rend la main
même en retard. Mieux vaut une simulation qui décroche qu'un worker qui ne
répond plus au bouton « stop ».

### Reproductibilité des soupes

`randomise` prend une **graine** qui fait partie du protocole : c'est elle que
le serveur rejouera pour valider une découverte du Codex. Le générateur
congruentiel est donc figé pour toujours — le modifier invaliderait toutes les
découvertes passées.

---

## À venir

| Couche | Choix | Phase |
|---|---|---|
| Rendu | Canvas 2D + *dirty rects*, WebGL2 au-delà d'1 M cellules | 2 |
| Front | Next.js 15 (App Router) + React 19 | 2 |
| État | Zustand (client) + TanStack Query (serveur) | 2 |
| Style | Tailwind v4 + jetons maison | 2 |
| Auth | Better Auth — lien magique, Discord, Google | 3 |
| Base | PostgreSQL (Neon) + Drizzle ORM | 3 |
| Cache | Redis (Upstash) — *sorted sets* pour les classements | 4 |
| File | pg-boss, adossé à Postgres | 4 |
| Stockage | Cloudflare R2 — miniatures, GIF, replays | 4 |
| Paiement | Lemon Squeezy ou Paddle (*merchant of record*, porte la TVA OSS) | 6 |
| Produit | PostHog région UE, sans cookie | 3 |
| Erreurs | Sentry | 2 |

### Anti-triche

Un score n'est jamais envoyé. Le client envoie une **revendication** —
`{ puzzleId, placement RLE, graine }` — que le serveur met en file, rejoue avec
le même moteur, et dont il recalcule le résultat avant d'écrire la moindre
ligne de classement.

Le coût de rejeu est borné par construction (générations max, cellules max,
taille de grille max), donc la vérification est bon marché et ne peut pas servir
de vecteur de déni de service. Même schéma pour l'Arène (rejeu des deux
*loadouts*) et pour les découvertes du Codex (rejeu de la graine de soupe).

### Modération

Une galerie publique de grilles de pixels dessinables produira des croix
gammées et des phallus dès la première semaine. Ce n'est pas un risque, c'est
une certitude. Le jour où la galerie ouvre, il faut : bouton de signalement,
file de modération, mise en attente automatique des premières publications d'un
compte neuf. Le DSA l'impose de toute façon à toute plateforme UGC dans l'UE.
