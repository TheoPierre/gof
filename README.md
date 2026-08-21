# Zero Player

Le Jeu de la Vie de Conway transformé en jeu web : un endroit où l'on vient
tous les jours pour progresser, pas un bac à sable de plus.

**État : phases 0 à 2 closes.** Le Labo tourne, il reste à le mettre en ligne.

| Document | Contenu |
|---|---|
| [PROJECT.md](PROJECT.md) | Cadrage, directives verrouillées, les cinq modes |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Le moteur, le worker, le rendu, l'anti-triche |
| [ROADMAP.md](ROADMAP.md) | Les neuf phases et leur état |
| [DECISIONS.md](DECISIONS.md) | Journal des choix structurants et de leurs raisons |
| [DEPLOY.md](DEPLOY.md) | Mise en ligne et liste de contrôle |

Le prototype d'origine est conservé à la racine comme référence :
[`game_of_life_index (4).html`](<game_of_life_index (4).html>).

---

## Démarrer

Node 24 ou plus est **requis** : les paquets sont écrits en TypeScript et
exécutés tels quels, sans étape de build. C'est ce qui leur permet de n'avoir
aucune dépendance.

```bash
npm install
npm test              # 67 tests, ~1 s
npm run dev -w @zp/lab   # le Labo sur http://localhost:3210
```

| Commande | Effet |
|---|---|
| `npm test` | Vecteurs de référence, codecs, worker, rendu, catalogue |
| `npm run test:slow` | Vecteur Acorn — 2 816², plusieurs minutes |
| `npm run bench` | Débit du moteur |
| `npm run typecheck` | Types de tous les paquets |
| `npm run dev -w @zp/lab` | Serveur de développement, port 3210 |
| `npm run build -w @zp/lab` | Build de production |
| `npm run start -w @zp/lab` | Sert le build, port 3211 |

Le développement écrit dans `.next-dev` et la production dans `.next` : sans
cette séparation, un build lancé pendant que le serveur de développement
tourne casse la page servie. Voir D-017.

---

## Structure

```
zero-player/
├── packages/engine     le cœur — bitboard déterministe, zéro dépendance
├── packages/codecs     RLE et .cells
├── packages/content    catalogue de motifs, vérifié par tests
├── packages/render     caméra et rendu canvas
├── packages/worker     protocole, simulation hors thread, client
└── apps/lab            le Labo — Next.js
```

**L'invariant du projet :** `@zp/engine` est importé à la fois par le
navigateur et par le serveur. Le Jeu de la Vie n'emploie que des entiers et des
opérations bit à bit, donc le résultat est identique au bit près partout — ce
qui permettra au serveur de rejouer une partie du client pour la vérifier.
Toute modification du moteur doit laisser passer les vecteurs de référence.

---

## Ce qui fonctionne aujourd'hui

Le Labo : canvas à zoom et panoramique sur des grilles de 256² à 2048², bords
recollés ou morts, dessin au trait, annuler/rétablir, bibliothèque de 21 motifs
vérifiés, import et export RLE, navigation au clavier.

Mesures sur la machine de développement :

- Moteur : **884 générations/s à 1024²**, soit 0,93 milliard de cellules par
  seconde, en JavaScript pur.
- Rendu : 2 ms pour dessiner 78 720 cellules, 0,5 ms pour 1 751.

---

## Attribution

Les noms et descriptions de motifs viennent du [LifeWiki](https://conwaylife.com/wiki/),
sous licence CC BY-SA. Les conditions de Catagolue et de la collection Golly
restent à vérifier avant d'importer le catalogue complet — voir la section
« À trancher » de [DECISIONS.md](DECISIONS.md).

John Horton Conway (1937–2020) a imaginé ces règles en 1970. Ce projet n'a
aucun lien avec lui ni avec ses ayants droit.
