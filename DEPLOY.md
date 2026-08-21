# Mise en ligne

Le Labo est une application Next.js sans base de données, sans authentification
et sans état serveur. Le déploiement est donc simple — à une exception près,
qui décide de la moitié des performances du produit.

## L'exception : COOP et COEP

Le rendu lit les trames de la simulation dans un `SharedArrayBuffer`, sans
copie ni message. Le navigateur ne l'autorise que sur une page **isolée
d'origine**, ce qui demande deux en-têtes :

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Ils sont posés dans [`apps/lab/next.config.ts`](apps/lab/next.config.ts) et
tout hébergeur qui respecte la fonction `headers()` de Next les servira.

**Sans eux, rien ne casse** — le repli `postMessage` prend le relais
silencieusement. C'est justement le risque : la régression est invisible. D'où
le badge en haut à droite de la barre d'outils, qui affiche `SAB` ou
`postMessage`. **C'est la première chose à regarder après un déploiement.**

`require-corp` a une conséquence : toute ressource tierce chargée par la page
devra porter `Cross-Origin-Resource-Policy` ou passer par `crossorigin`. Le
Labo n'en charge aucune aujourd'hui ; ça se pose le jour où on ajoutera une
police distante ou un outil de mesure d'audience.

## Vercel

L'hébergeur du plan. Rien de particulier à configurer :

1. Importer le dépôt.
2. **Root Directory** : `apps/lab`.
3. Laisser Vercel détecter Next.js. La commande de build est `npm run build`,
   le dossier de sortie `.next` — le chemin standard, volontairement (D-017).
4. Node 24 dans les réglages du projet — le monorepo l'exige.

### Variables d'environnement

Une seule compte, et elle décide de la valeur du test de marché :

| Variable | Effet |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Active la mesure d'audience. **Sans elle, rien n'est envoyé et les huit semaines ne mesurent rien.** |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` par défaut — région UE. |

Voir [`apps/lab/.env.example`](apps/lab/.env.example). Ce qui est mesuré, et
comment, est décrit en clair sur la page `/a-propos` du site : sans cookie,
sans stockage, sans capture automatique, et `Do Not Track` respecté.

### La règle à retenir sur le monorepo

**Vercel n'installe que les dépendances du workspace visé, jamais les
`devDependencies` de la racine.** Tout ce dont `next build` a besoin doit donc
être déclaré dans `apps/lab/package.json`, même si npm le hoiste gentiment
depuis la racine sur ta machine.

C'est ce qui a fait échouer le premier déploiement : `typescript` n'existait
qu'à la racine, Next a essayé de le rattraper seul — avec yarn, créant un
lockfile concurrent — et le build est mort sur `Cannot find module
'typescript'`.

Pour reproduire la condition de Vercel avant de pousser :

```bash
rm -rf node_modules
npm ci -w @zp/lab --include-workspace-root=false
npm run build -w @zp/lab
```

Si ça passe là, ça passera sur Vercel.

## Autre hébergeur

`npm run build -w @zp/lab` puis `npm run start -w @zp/lab`. Un reverse proxy
devant devra **transmettre les deux en-têtes** plutôt que les réécrire.

---

## Liste de contrôle avant le Show HN

Technique :

- [ ] Le badge affiche `SAB` sur le domaine de production
- [ ] Les en-têtes COOP/COEP sont bien présents (`curl -D -`)
- [ ] `/manifest.webmanifest` et `/icon.svg` répondent en 200
- [x] Mise en page mobile vérifiée en 375×812 : grille pleine largeur,
      commandes sur une ligne qui défile, panneau en recouvrement et fermé au
      départ
- [ ] Confirmer sur un téléphone réel — le tactile, pas seulement la taille
- [ ] Un tour au clavier seul : Tab jusqu'à la grille, flèches, Entrée
- [ ] Vérifier sur Safari : `SharedArrayBuffer` et les Web Workers de type
      module y sont plus capricieux qu'ailleurs

Produit :

- [ ] Le nom et le domaine sont tranchés (voir « À trancher » dans DECISIONS.md)
- [x] Attribution LifeWiki visible dans l'interface — en bas à droite de la
      scène, et détaillée sur `/a-propos`
- [x] Page `/a-propos` : les règles, le projet, les crédits, la vie privée
- [x] Mesure d'audience — sans cookie ni stockage, `Do Not Track` respecté,
      silencieuse tant que la clé n'est pas configurée
- [ ] **Renseigner `NEXT_PUBLIC_POSTHOG_KEY` sur Vercel.** Tant qu'elle est
      vide, les huit semaines ne mesurent rien.

Diffusion, dans cet ordre :

- [ ] Le forum conwaylife.com **d'abord**, pour des retours avant l'affluence.
      Ce sont des puristes : arriver avec l'outil, créditer le LifeWiki et
      Catagolue, demander un avis, ne pas faire de promotion.
- [ ] r/cellular_automata, r/conwayslife
- [ ] Hacker News en dernier. Le Jeu de la Vie y marche presque à tous les
      coups, mais on n'a qu'un seul bon tir — inutile de le griller avant
      d'avoir corrigé ce que la communauté aura relevé.

---

## Ce que le test de marché doit mesurer

Le but des huit semaines n'est pas d'avoir un beau produit, c'est de décider
s'il faut engager six mois de plus. À regarder au bout de quatre semaines :

| Signal | Ce qu'il dit |
|---|---|
| Visiteurs uniques, et leur origine | Le sujet mobilise-t-il, et par quel canal |
| Temps passé médian | Est-ce un jouet de trente secondes ou un outil |
| Motifs créés ou importés par visiteur | La création prend-elle |
| Retours du forum conwaylife.com | La communauté qui compte accepte-t-elle le projet |
| Retours spontanés demandant « et un mode jeu ? » | Le signal le plus fort pour la suite |

Le scénario prudent du plan (3 000 visiteurs mensuels) ne paie pas un salaire.
Construire en partant du principe que c'est celui-là qui arrivera.
