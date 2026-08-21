# Journal des décisions

Une ligne par choix structurant, avec sa raison. Le but est de pouvoir répondre
dans six mois à « pourquoi c'est fait comme ça » sans rouvrir le débat.

---

### D-001 — La référence produit est chess.com
**2026-08-20 · verrouillé**

Le cahier des charges initial disait « rendre addictif ». Abandonné.

Le public visé — développeurs, matheux, étudiants, enseignants — est le plus
prompt à identifier et à dénoncer publiquement un dark pattern. Une fausse
urgence ou une monnaie opaque, et le produit se fait démonter sur Hacker News
en une soirée ; cette réputation ne se répare pas. chess.com démontre qu'on
peut être massivement collant et massivement rentable sans manipuler personne.

Ce n'est donc pas seulement le choix propre, c'est le choix qui rapporte le plus
sur cette audience.

**Conséquences concrètes :** le tier gratuit ne bride jamais le fait de jouer
(Arène classée illimitée) ; le paywall porte sur la progression et le calcul ;
les séries sont un compteur, pas une laisse — pas de gel payant, pas de
notification culpabilisante ; pas de passe de saison (mécanique Fortnite, pas
chess.com).

---

### D-002 — Pas de lootboxes
**2026-08-20 · verrouillé**

Découle de D-001, et le calcul de risque allait déjà dans ce sens : Belgique
(assimilées à des jeux de hasard depuis 2018, en pratique interdites), Pays-Bas
(statut incertain après l'annulation de l'amende FIFA en 2022), résolution du
Parlement européen de 2023, principes du réseau CPC sur les monnaies virtuelles
en 2025, *Digital Fairness Act* en préparation. Et le public comptera des
mineurs, le Jeu de la Vie étant enseigné au lycée.

Pour un projet solo, le coût de conformité dépasse le revenu marginal.

**À la place :** le Codex. La table de rareté existe déjà, objective, mesurée
par recensement sur Catagolue. Même dopamine, aucun argent, aucun hasard acheté.

---

### D-003 — On ne vend jamais de puissance de jeu
**2026-08-20 · verrouillé**

Le seul actif du produit est la crédibilité de ses classements, qui repose sur
la vérification serveur. Vendre un budget de cellules ou un bonus de score la
détruirait définitivement.

On vend du volume d'entraînement, de l'analyse, des cours, de la capacité de
calcul et de création. Deux paliers : Terminal 4,99 €, Root 9,99 €.

---

### D-004 — Ambition v1 : test de marché
**2026-08-20**

Trois scénarios étaient sur la table : vitrine (P0→P4), produit complet
(P0→P8, 8–11 mois), test de marché (P0→P2, 8 semaines).

Retenu : **test de marché**. Huit semaines pour savoir si le sujet mobilise du
monde avant d'engager six mois de plus. Réversible, et rien n'est perdu : le
moteur et le Labo sont la fondation des deux autres scénarios.

---

### D-005 — Nouveau monorepo, le prototype reste en référence
**2026-08-20**

Le prototype fait 394 lignes dans un seul fichier, avec un état entièrement
global. Le porter coûterait plus cher que le réécrire.

On en récupère trois choses : la direction artistique ambre Cool-Retro-Term
(c'est un actif — personne dans cet espace n'a de DA), le catalogue de motifs,
et le concept du Creator. Le fichier reste à la racine comme référence.

---

### D-006 — Un seul moteur TypeScript, pas de Rust/WASM
**2026-08-20**

Le Jeu de la Vie n'emploie que des entiers et des opérations bit à bit. Le
déterminisme entre moteurs JavaScript est donc acquis sans effort, ce qui permet
d'exécuter *le même code* dans le navigateur et sur le serveur — l'invariant
dont dépend tout l'anti-triche.

Mesure à l'appui : 884 générations/s à 1024² (0,93 milliard de cellules/s) en
JavaScript pur, soit 29× le seuil visé. Rust/WASM n'apporterait rien pour un
coût d'intégration élevé.

HashLife arrivera plus tard, non comme optimisation invisible mais comme
fonctionnalité vendue (« temps profond », 10⁹ générations d'un coup).

---

### D-007 — npm workspaces et le runner de test de Node, pas pnpm ni Vitest
**2026-08-20**

Node 24 exécute TypeScript nativement. Le moteur n'a donc **ni build, ni
dépendance, ni runner tiers** : `node --test` suffit, la suite complète tourne
en une seconde.

pnpm n'est pas installé sur la machine et n'apporte rien à ce stade. Vitest et
un bundler arriveront avec `apps/web`, où ils servent vraiment.

C'est aussi une garantie de longévité : un paquet à zéro dépendance ne pourrit
pas.

---

### D-008 — Le tore est la topologie par défaut
**2026-08-20**

Le prototype tronquait le voisinage aux bords, donc tout motif mobile mourait
au bord — un planeur ne survivait pas à la traversée. Les deux topologies sont
implémentées ; le tore est le défaut, `bounded` reste disponible pour les
puzzles qui ont besoin de murs et pour les vecteurs de référence.

---

### D-009 — Le parseur RLE refuse au lieu de deviner
**2026-08-20**

Un caractère multi-états ou une règle invalide lève une erreur. Un motif
silencieusement faux se propage dans la galerie, dans les classements et dans
le Codex ; une erreur franche s'attrape à l'import.

---

### D-010 — La logique du worker ne connaît pas le worker
**2026-08-20**

`simulation.ts` ne référence ni `Worker`, ni `self`, ni `postMessage`, ni
`performance` : elle reçoit des commandes, émet des événements, et lit l'heure
par une horloge injectée. Les adaptateurs décrivent par des interfaces
minimales le peu qu'ils attendent de l'environnement.

Deux bénéfices immédiats : tout se teste sous Node avec une horloge pilotée à
la main — pas de navigateur, pas de `jsdom`, pas d'attente de temps réel — et
tout passe au typecheck avec la seule lib `ES2023`, sans avoir à mélanger les
libs DOM et WebWorker qui s'excluent.

---

### D-011 — SharedArrayBuffer, trois trames, copie figée
**2026-08-20**

Le rendu lit les trames dans un tampon partagé plutôt que de les recevoir par
message. Repli automatique sur `postMessage` quand l'isolation d'origine n'est
pas disponible.

Trois choix contre-intuitifs, chacun pour une raison précise :

- **On publie une copie, pas les tampons de travail du moteur.** Il en permute
  deux à chaque génération ; à 900 générations par seconde pour 60 images, le
  rendu lirait une grille en cours de réécriture. La copie coûte 128 Ko par
  million de cellules, négligeable devant la simulation.
- **Trois trames.** Avec deux, le rédacteur réécrit celle que le lecteur tient
  encore dès la publication suivante.
- **Le retard se plafonne avant d'être consommé, pas après.** Écrit d'abord
  dans l'autre sens ; un test a montré qu'un onglet réveillé après dix minutes
  simulait 18 000 générations d'un coup. Le budget de temps par réveil étale le
  rattrapage, il ne l'annule pas.

**Conséquence pour le déploiement :** les en-têtes COOP/COEP doivent être posés
dans la configuration Next, sans quoi tout le monde tombe sur le chemin de
repli.

---

### D-012 — Le rendu itère sur les mots, pas sur les cellules
**2026-08-20**

`GridRenderer` parcourt les mots de 32 bits de la zone visible et **saute les
mots nuls**, extrayant les bits allumés un à un (`word & -word`, `Math.clz32`).
Le coût devient proportionnel à la population, pas à la surface : une grille de
4096² presque vide se dessine au prix de ses trois cellules. Un test le vérifie.

Le prototype repeignait toute la surface *et* chaque ligne de quadrillage à
chaque image, d'où son plafond vers 150×80 cellules.

Deux régimes selon la taille d'une cellule à l'écran :

- **≥ 3 px** — un `fillRect` par cellule, avec un jour d'un pixel dès 6 px.
  L'aspect « grille » vient de ce jour, pas de lignes tracées.
- **< 3 px** — écriture directe dans un `ImageData` : il y aurait trop de
  rectangles. Le fond est peint *dans* le tampon, parce que `putImageData`
  remplace les pixels sans composer — un tampon transparent effacerait le
  canvas au lieu de laisser voir le fond.

Le quadrillage n'est tracé qu'au-delà de 8 px par cellule.

**Piste notée, non faite :** dans le régime pixels, le tampon est à la
résolution physique. Le construire à la résolution CSS puis l'agrandir
diviserait le coût par quatre sur un écran à densité double. À mesurer avant
d'optimiser.

---

### D-013 — Next.js, et les en-têtes COOP/COEP dès le premier jour
**2026-08-20**

`apps/lab` est une application Next 15. La raison n'est pas l'application
elle-même — le Labo est du canvas côté client — mais les pages de motifs
rendues côté serveur, qui sont le canal d'acquisition principal du projet
(§ Acquisition du plan). Partir sur Vite obligerait à tout migrer.

Les paquets internes sont livrés en TypeScript brut, sans build :
`transpilePackages` s'en charge. Vérifié, ça fonctionne, y compris les imports
en `.ts` explicite.

`next.config.ts` pose **COOP/COEP** dès maintenant. Sans isolation d'origine,
`SharedArrayBuffer` est indisponible et tout le monde retombe sur le chemin
`postMessage`. Un badge dans la barre d'outils affiche lequel des deux est
actif, pour que la régression se voie au lieu de se deviner.

---

### D-014 — La caméra est du calcul pur, séparée du dessin
**2026-08-20**

`Viewport` ne touche à aucun canvas : conversions monde ↔ écran, zoom, pan,
cadrage, calcul des cellules visibles. Elle se teste donc sous Node.

La propriété qui compte, et qui a son test : **zoomer laisse la cellule sous le
curseur exactement sous le curseur.** Sans elle, la grille dérive sous la souris
et le zoom paraît cassé — c'est le défaut le plus courant des éditeurs de ce
genre.

---

### D-015 — Annuler ne défait que les modifications, pas le temps
**2026-08-21**

L'historique vit dans le worker et retient les *modifications* : trait, motif
déposé, vidage, soupe. Faire tourner la simulation n'est pas annulable.

On ne remonte pas le temps d'un automate, et l'état est de toute façon
reproductible depuis le dernier point d'histoire. « Annuler » revient donc sur
la dernière chose que l'utilisateur a *faite* — ce qu'il attend. Annuler après
avoir laissé tourner restaure la grille *et* la génération du moment de la
modification.

Un trait à la souris émet des dizaines de `setCells`. L'interface envoie donc
`checkpoint` au début du geste, et c'est lui seul qui pose l'entrée : tout le
trait s'annule d'un coup. Plafond de 40 entrées ou 64 Mo, au premier atteint.

---

### D-016 — Le catalogue est vérifié par des tests, pas par confiance
**2026-08-21**

`@zp/content` porte 21 motifs en RLE. Chaque catégorie a un test qui *fait
tourner* le motif : les natures mortes ne bougent pas, les oscillateurs
reviennent à leur état de départ sans se déplacer, les vaisseaux retrouvent
leur forme ailleurs, les mathusalems atteignent leur population publiée, la
croissance infinie croît.

Le prototype rangeait sous « puffer » et « spacefiller » deux motifs qui n'en
étaient pas ; un visiteur qui connaît le sujet le repère en dix secondes, et
cette crédibilité-là ne se répare pas. Une erreur d'étiquetage est désormais
une suite rouge.

Corollaire assumé : **il n'y a ni puffer ni spacefiller dans le catalogue.**
Ils entreront quand leur RLE viendra d'une source sûre, pas de mémoire.

---

### D-017 — `next dev` et `next build` ont chacun leur dossier de sortie
**2026-08-21**

Par défaut les deux écrivent dans `.next`. Un build lancé pendant que le
serveur de développement tourne remplace les chunks que celui-ci sert, et la
page casse sur `Cannot find module './695.js'` — une erreur qui désigne le
runtime webpack et n'a rien à voir avec le code.

`distDir` vaut donc `.next-build` en production et `.next` en développement.

Ça compte au-delà de l'anecdote : la vérification de ce projet passe par des
builds répétés pendant que le Labo tourne. Sans cette séparation, chaque
vérification casse ce qu'elle est censée vérifier.

---

### D-018 — Le Labo n'est jamais rendu côté serveur
**2026-08-21**

`app/page.tsx` monte le Labo par `dynamic(..., { ssr: false })`. Le serveur
n'envoie qu'un squelette.

Raison de fond : le Labo ne dépend que d'API du navigateur — Worker,
SharedArrayBuffer, canvas — son HTML serveur serait jeté à la première image,
et il ne porte aucun contenu indexable. Le référencement du projet passe par
les pages de motifs, pas par l'application.

Raison immédiate : une extension de navigateur ajoutait un attribut au DOM
avant l'hydratation, et React le signalait comme une divergence
serveur/client. C'est un avertissement sur lequel l'application n'a aucune
prise. En ne rendant plus rien côté serveur, la surface d'hydratation
disparaît — et avec elle toute cette classe de faux positifs.

Bénéfice mesuré au passage : la route tombe de 10 ko à 1,39 ko et le JS de
premier chargement de 113 à 104 ko, le Labo devenant un chunk différé.

**Corollaire pour la suite :** les pages de motifs (P2+, référencement) devront
au contraire être rendues côté serveur. Elles n'auront pas ce problème — ce
sont du texte et une simulation optionnelle, pas une application.

---

## À trancher

- **Le nom et le domaine.** *Zero Player* est retenu à titre provisoire.
  Alternatives écartées mais notées : *Soup*, *Still Life* (trop pris),
  *B3/S23* (illisible hors initiés).
- **Licences de contenu.** Le LifeWiki est en CC BY-SA : attribution
  obligatoire, et la clause de partage à l'identique demande un examen pour une
  base dérivée. Conditions de Catagolue et de la collection Golly à vérifier
  séparément. À régler avant d'importer le catalogue en P2.
