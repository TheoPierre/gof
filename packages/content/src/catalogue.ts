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

/** Une chaîne dans les deux langues du site. */
export interface Localised {
  fr: string;
  en: string;
}

export interface CataloguePattern {
  id: string;
  /**
   * Le nom canonique de la communauté, identique dans les deux langues. Ce
   * sont des noms propres : on cherche « Gosper glider gun », pas sa
   * traduction, et c'est le titre de la page LifeWiki correspondante. Seule
   * la description est traduite.
   */
  name: string;
  category: PatternCategory;
  rle: string;
  /** Ce qu'il fait, en une phrase, dans chaque langue. */
  note: Localised;
  /**
   * Ce que le moteur doit mesurer sur ce motif. Un test le vérifie à chaque
   * exécution : si le RLE est faux ou si le moteur dérive, la suite rougit
   * plutôt que le site publier une contre-vérité.
   */
  population: number;
  /** Période, pour les oscillateurs et les vaisseaux. */
  period?: number;
  /**
   * Titre de la page LifeWiki, si le nom affiché n'y correspond pas. Renvoyer
   * vers la source est dû, et c'est aussi là que se trouve l'histoire
   * complète de chaque motif — qu'on ne recopie pas ici.
   */
  wiki?: string;
}

/** Adresse de la page LifeWiki d'un motif. */
export function wikiUrl(pattern: CataloguePattern): string {
  const title = pattern.wiki ?? pattern.name.replace(/ /g, '_');
  return `https://conwaylife.com/wiki/${encodeURI(title)}`;
}

export const CATEGORY_LABELS: Record<PatternCategory, Localised> = {
  'nature-morte': { fr: 'Natures mortes', en: 'Still lifes' },
  oscillateur: { fr: 'Oscillateurs', en: 'Oscillators' },
  vaisseau: { fr: 'Vaisseaux', en: 'Spaceships' },
  mathusalem: { fr: 'Mathusalems', en: 'Methuselahs' },
  croissance: { fr: 'Croissance infinie', en: 'Infinite growth' },
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
    note: {
      fr: 'Le motif stable le plus simple, et le plus fréquent dans une soupe aléatoire.',
      en: "The simplest stable pattern, and the most common in a random soup.",
    },
    population: 4,
  },
  {
    id: 'beehive',
    name: 'Beehive',
    category: 'nature-morte',
    rle: 'b2o$o2bo$b2o!',
    note: {
      fr: 'Deuxième nature morte la plus courante.',
      en: "The second most common still life.",
    },
    population: 6,
  },
  {
    id: 'loaf',
    name: 'Loaf',
    category: 'nature-morte',
    rle: 'b2o$o2bo$bobo$2bo!',
    note: {
      fr: 'Une ruche asymétrique. Souvent produite par paires.',
      en: "An asymmetric beehive. Often produced in pairs.",
    },
    population: 7,
  },
  {
    id: 'boat',
    name: 'Boat',
    category: 'nature-morte',
    rle: '2o$obo$bo!',
    note: {
      fr: 'La seule nature morte à cinq cellules.',
      en: "The only five-cell still life.",
    },
    population: 5,
  },
  {
    id: 'tub',
    name: 'Tub',
    category: 'nature-morte',
    rle: 'bo$obo$bo!',
    note: {
      fr: 'Quatre cellules en losange. Ajoute une cellule et tu obtiens un bateau.',
      en: "Four cells in a diamond. Add one and you get a boat.",
    },
    population: 4,
  },
  {
    id: 'ship',
    name: 'Ship',
    category: 'nature-morte',
    rle: '2o$obo$b2o!',
    note: {
      fr: 'Un bateau symétrique. S’allonge en « ship-tie » quand on l’étire.',
      en: "A symmetric boat. Stretches into a ship-tie when you pull on it.",
    },
    population: 6,
  },
  {
    id: 'pond',
    name: 'Pond',
    category: 'nature-morte',
    rle: 'b2o$o2bo$o2bo$b2o!',
    note: {
      fr: 'Un anneau de huit cellules autour d’un trou. Ce que laisse souvent une explosion qui s’éteint.',
      en: "A ring of eight cells around a hole. Often what an explosion leaves behind.",
    },
    population: 8,
  },
  {
    id: 'long-boat',
    name: 'Long boat',
    category: 'nature-morte',
    rle: '2o$obo$bobo$2bo!',
    note: {
      fr: 'Un bateau étiré d’une cellule. La famille continue en long long boat, et ainsi de suite.',
      en: "A boat stretched by one cell. The family continues with the long long boat.",
    },
    population: 7,
  },
  {
    id: 'barge',
    name: 'Barge',
    category: 'nature-morte',
    rle: 'bo$obo$bobo$2bo!',
    note: {
      fr: 'Une baignoire allongée. Six cellules en escalier.',
      en: "An elongated tub. Six cells in a staircase.",
    },
    population: 6,
  },
  {
    id: 'snake',
    name: 'Snake',
    category: 'nature-morte',
    rle: '2obo$ob2o!',
    note: {
      fr: 'La nature morte la plus plate : deux lignes seulement.',
      en: "The flattest still life there is: two rows only.",
    },
    population: 6,
  },
  {
    id: 'eater-1',
    name: 'Eater 1',
    category: 'nature-morte',
    rle: '2o$obo$2bo$2b2o!',
    note: {
      fr: 'Le mangeur d’hameçon : il absorbe un planeur et se reconstruit. La brique défensive de base.',
      en: "The fishhook eater. It swallows a glider and rebuilds itself — the basic defensive brick.",
    },
    population: 7,
  },

  // ───────────────────────── Oscillateurs ─────────────────────────
  {
    id: 'blinker',
    name: 'Blinker',
    category: 'oscillateur',
    rle: '3o!',
    note: {
      fr: 'Période 2. L’oscillateur le plus simple, et le plus fréquent.',
      en: "Period 2. The simplest oscillator, and the most common.",
    },
    population: 3,
    period: 2,
  },
  {
    id: 'toad',
    name: 'Toad',
    category: 'oscillateur',
    rle: 'b3o$3o!',
    note: {
      fr: 'Période 2. Deux rangées décalées qui se replient l’une sur l’autre.',
      en: "Period 2. Two offset rows folding into one another.",
    },
    population: 6,
    period: 2,
  },
  {
    id: 'beacon',
    name: 'Beacon',
    category: 'oscillateur',
    rle: '2o$2o$2b2o$2b2o!',
    note: {
      fr: 'Période 2. Deux blocs qui se touchent puis se séparent.',
      en: "Period 2. Two blocks that touch, then separate.",
    },
    population: 8,
    period: 2,
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    category: 'oscillateur',
    rle: '2b3o3b3o2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!',
    note: {
      fr: 'Période 3, 13×13. Le grand oscillateur le plus courant.',
      en: "Period 3, 13×13. The most common large oscillator.",
    },
    population: 48,
    period: 3,
  },
  {
    id: 'pentadecathlon',
    name: 'Pentadecathlon',
    category: 'oscillateur',
    rle: '2bo4bo2b$2ob4ob2o$2bo4bo2b!',
    note: {
      fr: 'Période 15. Découvert par Conway en faisant évoluer une rangée de dix cellules.',
      en: "Period 15. Found by Conway while evolving a row of ten cells.",
    },
    population: 12,
    period: 15,
  },
  {
    id: 'koks-galaxy',
    name: "Kok's galaxy",
    category: 'oscillateur',
    rle: '6ob2o$6ob2o$7b2o$2o5b2o$2o5b2o$2o5b2o$2o$2ob6o$2ob6o!',
    note: {
      fr: 'Période 8. Une spirale qui se retourne sur elle-même. Trouvée par Jan Kok en 1971.',
      en: "Period 8. A spiral that turns in on itself. Found by Jan Kok in 1971.",
    },
    population: 48,
    period: 8,
  },
  {
    id: 'clock',
    name: 'Clock',
    category: 'oscillateur',
    rle: '2bo$obo$bobo$bo!',
    note: {
      fr: 'Période 2. Quatre cellules qui basculent autour de deux pivots.',
      en: "Period 2. Four cells tipping around two pivots.",
    },
    population: 6,
    period: 2,
  },
  {
    id: 'figure-eight',
    name: 'Figure eight',
    category: 'oscillateur',
    rle: '3o$3o$3o$3b3o$3b3o$3b3o!',
    note: {
      fr: 'Période 8. Deux carrés de neuf cellules qui se défont et se refont en diagonale.',
      en: "Period 8. Two nine-cell squares that unmake and remake themselves diagonally.",
    },
    population: 18,
    period: 8,
  },

  // ───────────────────────── Vaisseaux ─────────────────────────
  {
    id: 'glider',
    name: 'Glider',
    category: 'vaisseau',
    rle: 'bo$2bo$3o!',
    note: {
      fr: 'Se translate d’une case en diagonale toutes les 4 générations. Le motif emblématique.',
      en: "Travels one cell diagonally every 4 generations. The emblematic pattern.",
    },
    population: 5,
    period: 4,
  },
  {
    id: 'lwss',
    name: 'Lightweight spaceship',
    category: 'vaisseau',
    rle: 'bo2bo$o$o3bo$4o!',
    note: {
      fr: 'Avance de deux cases à l’horizontale toutes les 4 générations.',
      en: "Travels two cells horizontally every 4 generations.",
    },
    population: 9,
    period: 4,
  },
  {
    id: 'mwss',
    name: 'Middleweight spaceship',
    category: 'vaisseau',
    rle: '3bo$bo3bo$o$o4bo$5o!',
    note: {
      fr: 'Même vitesse que le LWSS, une cellule de plus.',
      en: "Same speed as the lightweight, one cell heavier.",
    },
    population: 11,
    period: 4,
  },
  {
    id: 'hwss',
    name: 'Heavyweight spaceship',
    category: 'vaisseau',
    rle: '3b2o$bo4bo$o$o5bo$6o!',
    note: {
      fr: 'Le plus lourd des trois vaisseaux classiques.',
      en: "The heaviest of the three classic spaceships.",
    },
    population: 13,
    period: 4,
  },

  // ───────────────────────── Mathusalems ─────────────────────────
  {
    id: 'r-pentomino',
    name: 'R-pentomino',
    category: 'mathusalem',
    rle: 'b2o$2o$bo!',
    note: {
      fr: 'Cinq cellules, 1 103 générations, 116 cellules à l’arrêt. Six planeurs s’en échappent.',
      en: "Five cells, 1,103 generations, 116 cells at rest. Six gliders escape along the way.",
    },
    population: 5,
  },
  {
    id: 'diehard',
    name: 'Diehard',
    category: 'mathusalem',
    rle: '6bo$2o$bo3b3o!',
    note: {
      fr: 'Sept cellules qui s’éteignent entièrement à la génération 130. Pas une de plus.',
      en: "Seven cells that vanish entirely at generation 130. Not one generation more.",
    },
    population: 7,
  },
  {
    id: 'acorn',
    name: 'Acorn',
    category: 'mathusalem',
    rle: 'bo$3bo$2o2b3o!',
    note: {
      fr: 'Sept cellules, 5 206 générations, 633 cellules à l’arrêt.',
      en: "Seven cells, 5,206 generations, 633 cells at rest.",
    },
    population: 7,
  },

  // ───────────────────────── Croissance infinie ─────────────────────────
  {
    id: 'gosper-gun',
    name: 'Gosper glider gun',
    category: 'croissance',
    rle: '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',
    note: {
      fr: 'Lâche un planeur toutes les 30 générations, indéfiniment. Bill Gosper, 1970 — le premier motif à croissance infinie découvert.',
      en: "Fires a glider every 30 generations, forever. Bill Gosper, 1970 — the first infinite-growth pattern ever found.",
    },
    population: 36,
  },
  {
    id: 'infinite-growth-5x5',
    name: 'Infinite growth 5×5',
    // Ce motif n'a pas de page à son nom : on renvoie vers la notion, qui
    // vaut mieux qu'un lien mort.
    wiki: 'Infinite_growth',
    category: 'croissance',
    rle: '3obo$o$3b2o$b2obo$obobo!',
    note: {
      fr: 'Le plus petit motif connu tenant dans un carré 5×5 dont la population croît sans fin.',
      en: "The smallest known pattern fitting in a 5×5 box whose population grows without end.",
    },
    population: 13,
  },
];

export function patternById(id: string): CataloguePattern | undefined {
  return CATALOGUE.find((pattern) => pattern.id === id);
}

export function patternsByCategory(category: PatternCategory): CataloguePattern[] {
  return CATALOGUE.filter((pattern) => pattern.category === category);
}
