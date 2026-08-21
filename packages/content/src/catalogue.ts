// Catalogue de motifs nommés.
//
// Chaque entrée est en RLE, le format de l'écosystème, et chaque comportement
// annoncé est vérifiable. Le prototype d'origine étiquetait « puffer » et
// « spacefiller » deux motifs qui n'en étaient pas : on ne reproduit pas
// l'erreur. Il n'y a donc ici ni puffer ni spacefiller — ils arriveront quand
// leur RLE sera repris d'une source sûre plutôt que de mémoire.
//
// Les noms et descriptions viennent du LifeWiki (CC BY-SA) : l'attribution est
// due, et la clause de partage à l'identique reste à examiner avant d'importer
// le catalogue complet. Voir DECISIONS.md, « À trancher ».

export type PatternCategory =
  | 'nature-morte'
  | 'oscillateur'
  | 'vaisseau'
  | 'mathusalem'
  | 'croissance';

export interface CataloguePattern {
  id: string;
  name: string;
  category: PatternCategory;
  rle: string;
  /** Ce qu'il fait, en une phrase. */
  note: string;
}

export const CATEGORY_LABELS: Record<PatternCategory, string> = {
  'nature-morte': 'Natures mortes',
  oscillateur: 'Oscillateurs',
  vaisseau: 'Vaisseaux',
  mathusalem: 'Mathusalems',
  croissance: 'Croissance infinie',
};

export const CATEGORY_ORDER: PatternCategory[] = [
  'nature-morte',
  'oscillateur',
  'vaisseau',
  'mathusalem',
  'croissance',
];

export const CATALOGUE: CataloguePattern[] = [
  // ───────────────────────── Natures mortes ─────────────────────────
  {
    id: 'block',
    name: 'Block',
    category: 'nature-morte',
    rle: '2o$2o!',
    note: 'Le motif stable le plus simple, et le plus fréquent dans une soupe aléatoire.',
  },
  {
    id: 'beehive',
    name: 'Beehive',
    category: 'nature-morte',
    rle: 'b2o$o2bo$b2o!',
    note: 'Deuxième nature morte la plus courante.',
  },
  {
    id: 'loaf',
    name: 'Loaf',
    category: 'nature-morte',
    rle: 'b2o$o2bo$bobo$2bo!',
    note: 'Une ruche asymétrique. Souvent produite par paires.',
  },
  {
    id: 'boat',
    name: 'Boat',
    category: 'nature-morte',
    rle: '2o$obo$bo!',
    note: 'La seule nature morte à cinq cellules.',
  },
  {
    id: 'tub',
    name: 'Tub',
    category: 'nature-morte',
    rle: 'bo$obo$bo!',
    note: 'Quatre cellules en losange. Ajoute une cellule et tu obtiens un bateau.',
  },
  {
    id: 'ship',
    name: 'Ship',
    category: 'nature-morte',
    rle: '2o$obo$b2o!',
    note: 'Un bateau symétrique. S’allonge en « ship-tie » quand on l’étire.',
  },

  // ───────────────────────── Oscillateurs ─────────────────────────
  {
    id: 'blinker',
    name: 'Blinker',
    category: 'oscillateur',
    rle: '3o!',
    note: 'Période 2. L’oscillateur le plus simple, et le plus fréquent.',
  },
  {
    id: 'toad',
    name: 'Toad',
    category: 'oscillateur',
    rle: 'b3o$3o!',
    note: 'Période 2. Deux rangées décalées qui se replient l’une sur l’autre.',
  },
  {
    id: 'beacon',
    name: 'Beacon',
    category: 'oscillateur',
    rle: '2o$2o$2b2o$2b2o!',
    note: 'Période 2. Deux blocs qui se touchent puis se séparent.',
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    category: 'oscillateur',
    rle: '2b3o3b3o2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!',
    note: 'Période 3, 13×13. Le grand oscillateur le plus courant.',
  },
  {
    id: 'pentadecathlon',
    name: 'Pentadecathlon',
    category: 'oscillateur',
    rle: '2bo4bo2b$2ob4ob2o$2bo4bo2b!',
    note: 'Période 15. Découvert par Conway en faisant évoluer une rangée de dix cellules.',
  },
  {
    id: 'koks-galaxy',
    name: "Kok's galaxy",
    category: 'oscillateur',
    rle: '6ob2o$6ob2o$7b2o$2o5b2o$2o5b2o$2o5b2o$2o$2ob6o$2ob6o!',
    note: 'Période 8. Une spirale qui se retourne sur elle-même. Trouvée par Jan Kok en 1971.',
  },

  // ───────────────────────── Vaisseaux ─────────────────────────
  {
    id: 'glider',
    name: 'Glider',
    category: 'vaisseau',
    rle: 'bo$2bo$3o!',
    note: 'Se translate d’une case en diagonale toutes les 4 générations. Le motif emblématique.',
  },
  {
    id: 'lwss',
    name: 'Lightweight spaceship',
    category: 'vaisseau',
    rle: 'bo2bo$o$o3bo$4o!',
    note: 'Avance de deux cases à l’horizontale toutes les 4 générations.',
  },
  {
    id: 'mwss',
    name: 'Middleweight spaceship',
    category: 'vaisseau',
    rle: '3bo$bo3bo$o$o4bo$5o!',
    note: 'Même vitesse que le LWSS, une cellule de plus.',
  },
  {
    id: 'hwss',
    name: 'Heavyweight spaceship',
    category: 'vaisseau',
    rle: '3b2o$bo4bo$o$o5bo$6o!',
    note: 'Le plus lourd des trois vaisseaux classiques.',
  },

  // ───────────────────────── Mathusalems ─────────────────────────
  {
    id: 'r-pentomino',
    name: 'R-pentomino',
    category: 'mathusalem',
    rle: 'b2o$2o$bo!',
    note: 'Cinq cellules, 1 103 générations, 116 cellules à l’arrêt. Six planeurs s’en échappent.',
  },
  {
    id: 'diehard',
    name: 'Diehard',
    category: 'mathusalem',
    rle: '6bo$2o$bo3b3o!',
    note: 'Sept cellules qui s’éteignent entièrement à la génération 130. Pas une de plus.',
  },
  {
    id: 'acorn',
    name: 'Acorn',
    category: 'mathusalem',
    rle: 'bo$3bo$2o2b3o!',
    note: 'Sept cellules, 5 206 générations, 633 cellules à l’arrêt.',
  },

  // ───────────────────────── Croissance infinie ─────────────────────────
  {
    id: 'gosper-gun',
    name: 'Canon à planeurs de Gosper',
    category: 'croissance',
    rle: '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',
    note: 'Lâche un planeur toutes les 30 générations, indéfiniment. Bill Gosper, 1970 — le premier motif à croissance infinie découvert.',
  },
  {
    id: 'infinite-growth-5x5',
    name: 'Croissance infinie 5×5',
    category: 'croissance',
    rle: '3obo$o$3b2o$b2obo$obobo!',
    note: 'Le plus petit motif connu tenant dans un carré 5×5 dont la population croît sans fin.',
  },
];

export function patternById(id: string): CataloguePattern | undefined {
  return CATALOGUE.find((pattern) => pattern.id === id);
}

export function patternsByCategory(category: PatternCategory): CataloguePattern[] {
  return CATALOGUE.filter((pattern) => pattern.category === category);
}
