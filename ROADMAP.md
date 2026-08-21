# Feuille de route

30 semaines de développement effectif, dont 21 jusqu'au premier euro. À
10–15 h/semaine, compter 5 à 7 mois jusqu'à la monétisation et 8 à 11 mois pour
le produit complet. À temps plein, 3 à 4 mois.

**Décision en cours : test de marché.** On s'arrête à la fin de P2 et on décide
de la suite sur des chiffres réels. Tout ce qui est construit d'ici là est la
fondation des deux autres scénarios — rien n'est perdu si on continue.

## Principes d'ordonnancement

1. **Le moteur d'abord**, sans interface. Une erreur de déterminisme découverte
   au mois six invaliderait tous les classements.
2. **Mise en ligne publique dès P2**, longtemps avant le reste. Le Labo est
   utile tout seul, il construit l'audience pendant le développement du jeu.
3. **L'abonnement dès que ce qu'il vend existe.** Le paywall portant sur
   l'entraînement et les cours, il ouvre en semaine 21. L'Arène — le plus gros
   morceau — passe *après* le premier euro.

---

| Phase | Semaines | Livrable | Fini quand | État |
|---|---|---|---|---|
| **P0** Cadrage | 1 | Docs, squelette du monorepo, outillage | Suite de tests verte sur un dépôt neuf | ✅ **fait** |
| **P1** Moteur + codecs | 3 | Bitboard, topologies, règles B/S, Immigration, RLE / .cells / apgcode, Web Worker | Les vecteurs passent, ≥ 30 gén./s à 1 M cellules | 🟡 **~85 %** |
| **P2** Le Labo | 4 | Canvas infini zoom/pan, édition, undo, bibliothèque, import/export, système de design, PWA | **En ligne, gratuit, sans compte.** Show HN | ✅ **close** |
| **P3** Comptes + galerie | 3 | Auth, Postgres, sauvegarde cloud, profils, galerie, remix, votes, modération | Un inconnu publie un motif, un autre le remixe | ⬜ |
| **P4** Quotidienne + Entraîneur | 5 | 6 types de puzzle, éditeur de puzzles, worker de vérification, classement de puzzles, séries, carte de partage | **Le produit devient un jeu.** Lancement 2 | ⬜ |
| **P5** Académie | 3 | 25 leçons interactives, parcours, suivi | Un débutant comprend le sujet sans aide | ⬜ |
| **P6** Abonnement | 2 | Lemon Squeezy, paliers Terminal / Root, droits d'accès, boutique, CGU/RGPD | **Première transaction encaissée** | ⬜ |
| **P7** Codex | 3 | Identification apgcode, catalogue, découvertes, raretés | Une soupe débloque une entrée vérifiée | ⬜ |
| **P8** Arène | 6 | Constructeur de loadout, appariement, Glicko, saisons, replays, bots, analyse d'après-match | Deux comptes s'affrontent, le classement bouge | ⬜ |
| Ensuite | — | i18n FR/EN, accessibilité, HashLife, SEO des pages de motifs, offre Classe | Continu | ⬜ |

---

## P1 — détail de l'état

Fait :

- [x] `Board` — grille empaquetée en bits, topologies tore et bornée, largeur
      quelconque (le masquage de fin de ligne est testé de 1 à 100 colonnes)
- [x] `Life.step()` — compteur binaire parallèle, règles B/S arbitraires
- [x] `parseRule` — notations « B3/S23 » et historique « 23/3 »
- [x] Codec RLE, décodage et encodage, avec repliage de lignes
- [x] Vecteurs de référence : blinker, planeur, planeur torique, Diehard,
      R-pentomino, canon de Gosper — 20 tests, ~1 s
- [x] Vecteur Acorn en suite lente
- [x] Banc de mesure — 884 gén./s à 1024², soit 29× le seuil
- [x] **`@zp/worker`** — protocole, cœur de simulation testable, adaptateurs
      navigateur, client thread principal. Publication des trames par
      SharedArrayBuffer avec repli postMessage. 17 tests, horloge pilotée à la
      main, aucune dépendance au navigateur pour les exécuter.

Reste :

- [ ] Règle **Immigration** à deux couleurs (nécessaire à l'Arène, P8)
- [ ] Codec `.cells` (format plaintext du LifeWiki)
- [ ] **apgcode** — hachage canonique d'un objet stabilisé (nécessaire au Codex, P7)
- [ ] Détection de période et de déplacement (classer un motif : nature morte,
      oscillateur de période n, vaisseau de vitesse c/n)
- [ ] Optimisation mémoire : cache glissant de trois lignes au lieu de deux
      tampons pleins

**Aucun de ces points n'est nécessaire au test de marché.** P1 est close pour
ce qui concerne les phases 0 → 2 ; le reste rejoindra les phases qui en ont
besoin (P7 pour l'apgcode, P8 pour Immigration).

---

## P2 — détail de l'état

Fait :

- [x] **`@zp/render`** — `Viewport` (calcul pur, testable) et `GridRenderer`
      (itération par mots, deux régimes de dessin). 13 tests.
- [x] **`apps/lab`** — application Next 15, en-têtes COOP/COEP, jetons CSS de
      la direction artistique ambre, worker branché, boucle de rendu.
- [x] Interactions : molette pour zoomer autour du curseur, glisser pour
      dessiner (Maj pour effacer, trait relié en Bresenham), clic droit ou
      outil main pour déplacer, raccourcis clavier qui **ignorent les champs de
      saisie** — le défaut du prototype.
- [x] Barre d'outils : lancer/pause, pas, vitesse, vider, soupe, canon de
      Gosper, cadrer, compteurs, badge SAB/postMessage.
- [x] `next build` vert, 108 ko de JS au premier chargement.
- [x] **Vérifié dans le navigateur** (2026-08-21) : `crossOriginIsolated`
      confirmé, chemin SharedArrayBuffer actif, soupe de 78 720 cellules
      publiée et lue côté principal, canon de Gosper posé par l'interface
      produisant +5 cellules toutes les 30 générations.

Débit de rendu mesuré sur la machine de développement, après chauffe du JIT,
en pixels physiques à densité 2 :

| Vue | Cellules dessinées | Médiane |
|---|---|---|
| zoom 12 (rectangles + jour) | 1 751 | 0,48 ms |
| zoom 4 (rectangles) | 15 599 | 1,92 ms |
| grille 512² entière (pixels) | 78 720 | 2,03 ms |

Le premier appel coûte ~30 ms : c'est de la chauffe JIT, pas un plafond. Tout
tient largement dans le budget d'une image de 16,7 ms.

- [x] **Annuler / rétablir** — historique dans le worker, un trait entier ne
      faisant qu'une entrée. 8 tests.
- [x] **Bibliothèque de motifs** — `@zp/content`, 21 motifs vérifiés, vignettes,
      clic pour armer ou glisser-déposer sur la grille.
- [x] **Import / export RLE** — panneau avec copie, téléchargement, et refus
      explicite d'un RLE invalide.
- [x] **Taille et topologie** — 256² à 2048², bords recollés ou morts.
- [x] **Accessibilité** — grille focalisable, curseur au clavier avec
      `aria-label` qui suit la position, région `role="status"` pour les
      actions, noms accessibles corrects sur les vignettes,
      `prefers-reduced-motion` respecté.
- [x] **Manifeste PWA** — installable, icône, thème.

Reporté, avec sa raison :

- [ ] **Service worker hors-ligne.** Le manifeste rend l'application
      installable, mais rien n'est mis en cache. Un service worker mal cadré
      sert des versions périmées, et son interaction avec COEP demande d'être
      éprouvée — à faire quand il y aura un vrai processus de publication,
      c'est-à-dire en même temps que la mise en ligne.

### Prêt pour la mise en ligne

- [x] Build de production vérifié sur `next start` : en-têtes COOP/COEP
      servis, `SharedArrayBuffer` actif, worker bundlé, aller-retour RLE exact,
      console sans erreur.
- [x] Manifeste et icône servis en 200.
- [x] Intégration continue — types, tests, build à chaque PR ; vecteur Acorn
      sur `main`.
- [x] [DEPLOY.md](DEPLOY.md) — procédure, liste de contrôle avant le Show HN,
      et ce que le test de marché doit mesurer.
- [ ] **Le déploiement lui-même** : il demande tes comptes, c'est à toi.

### Vérifié dans le navigateur (2026-08-21)

Chaîne complète éprouvée par l'interface réelle, pas en simulation :

| Ce qui a été fait | Résultat |
|---|---|
| Motif armé depuis la bibliothèque puis déposé | « Glider déposé », annuler devient actif |
| Import du canon de Gosper par le panneau RLE | 36 cellules |
| Annuler | retour à 0 cellule |
| Import d'un RLE invalide | « Caractère inattendu dans le corps RLE : "z" » |
| Flèches puis Entrée sur la grille focalisée | « Cellule 257, 257 allumée » |
| Passage en 1024² puis bords morts | annoncés tous les deux |
