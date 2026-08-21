# ZERO PLAYER — Cadrage du projet

Le Jeu de la Vie de Conway transformé en jeu web : un endroit où l'on vient tous
les jours pour progresser, pas un bac à sable de plus.

Document de stratégie complet : [le plan, rév. 2](https://claude.ai/code/artifact/07783ebc-9574-4c81-b87c-4682bf97dc9a)
Prototype d'origine, conservé comme référence : [`game_of_life_index (4).html`](<game_of_life_index (4).html>)

---

## Directives verrouillées (2026-08-20)

| Directive | Décision |
|---|---|
| **Référence produit** | chess.com. Collant par la maîtrise, jamais par la contrainte. |
| **« Addictif »** | Abandonné comme objectif. Aucun dark pattern, aucune FOMO, aucune culpabilisation. |
| **Lootboxes** | Non. Remplacées par le Codex. |
| **Jouer** | Gratuit et illimité, pour toujours. Le tier libre ne bride jamais le jeu. |
| **Le paywall** | Sur la *progression* (entraînement, analyse, cours) et le *calcul*. Jamais sur la puissance de jeu. |
| **Classements** | Incorruptibles. Tout score est rejoué et vérifié côté serveur. Rien d'achetable ne les touche. |
| **Ambition v1** | Test de marché : phases 0 → 2, 8 semaines, on met le Labo en ligne et on décide de la suite sur des chiffres réels. |
| **Base de code** | Nouveau monorepo. Du prototype on récupère la direction artistique, le catalogue de motifs et le concept du Creator. |
| **Langue** | Documentation et commentaires en français, identifiants en anglais. i18n FR/EN du produit à partir de la phase 8. |
| **Nom** | *Zero Player* — la formule de Conway lui-même. À confirmer avec le domaine. |

---

## Le problème à résoudre

Conway l'a dit : le Jeu de la Vie est un **jeu à zéro joueur**. On pose un état
initial, on regarde. Ni objectif, ni adversaire, ni décision après le premier
instant. C'est ce qui le rend beau, et c'est ce qui empêche toute rétention.

La conception tient donc dans un seul verbe : **placer des cellules avant que ça
démarre**. Le joueur est un ingénieur de conditions initiales. Il ne joue pas
*pendant*, il joue *avant*, et la simulation est l'arbitre.

Deux conséquences dont tout le reste découle :

1. **Tout est vérifiable.** Le Jeu de la Vie est déterministe et entièrement en
   arithmétique entière. Le serveur rejoue le placement du joueur et recalcule
   le score au bit près. Les classements sont incorruptibles — c'est rare, et
   c'est notre principal actif.
2. **Le contenu est gratuit à produire.** Une contrainte + un objectif = un
   puzzle. Deux joueurs + une soupe = un match. Une soupe + un catalogue = une
   découverte. Pas six mois de level design à la main.

---

## Les cinq modes

| Mode | Rôle | Accès |
|---|---|---|
| **La Quotidienne** | Le rituel. Un puzzle par jour, le même pour tous. Six familles d'objectifs, score à l'élégance, carte de partage. | Gratuit, complet, à vie |
| **L'Entraîneur** | La progression, et le produit payant. Puzzles calibrés en continu, classement de puzzles personnel. | 5/jour gratuit, illimité en abonnement |
| **L'Arène** | La profondeur. PvP asynchrone sur la règle Immigration à deux couleurs, classement Glicko, saisons. | **Illimitée et gratuite.** L'analyse d'après-match est payante. |
| **Le Labo** | La création et la longue traîne. Canvas infini, RLE, galerie publique, remix. | Gratuit, 25 motifs sauvegardés |
| **L'Académie** | Onboarding, argument d'abonnement, produit B2B. 25 leçons interactives. | 6 leçons gratuites |

### Le Codex

La pièce maîtresse, et ce qui remplace les lootboxes. Le Jeu de la Vie possède
déjà sa taxonomie : plus d'un millier d'objets nommés, et **une table de rareté
objective** mesurée par recensement distribué sur Catagolue.

On lance des soupes aléatoires, le client identifie les objets stabilisés, le
serveur rejoue la graine pour valider, et chaque objet observé pour la première
fois débloque son entrée. Un Pokédex de la taxonomie de la Vie : la dopamine de
la rareté, sans argent, sans hasard acheté, sans problème juridique. Le tirage,
c'est la science.

---

## Public

Développeurs, matheux, étudiants, enseignants. C'est le public le plus prompt à
identifier et à dénoncer publiquement un dark pattern — d'où la directive
chess.com, qui est autant un calcul qu'un principe.

Le paysage est encombré d'outils et vide de jeux : Golly (desktop, austère),
LifeWiki (encyclopédie), Catagolue (recensement), copy.sh/life (visualiseur).
Aucun n'a de comptes, de progression, de compétition ni de rituel quotidien.

---

## Périmètre du test de marché (phases 0 → 2)

Ce qui est **dans** le périmètre des 8 premières semaines :

- Le moteur déterministe et ses vecteurs de référence
- Les codecs RLE
- Le Labo : canvas infini, édition, undo, bibliothèque de motifs, import/export
- Le système de design (direction artistique terminal, reprise du prototype)
- Mise en ligne publique, gratuite, sans compte

Ce qui est **hors** périmètre jusqu'à la décision de poursuivre : comptes, base
de données, puzzles, classements, Arène, Codex, paiement.

Critère de décision à la semaine 8 : trafic, temps passé, motifs créés, retours
de la communauté conwaylife.com et de Hacker News.
