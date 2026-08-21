// Motifs canoniques, vérifiés contre le LifeWiki.
//
// Le prototype d'origine étiquetait « puffer » et « spacefiller » deux motifs
// qui n'en étaient pas. On ne reprend ici que des motifs dont le comportement
// est publié et chiffré : ce sont eux qui servent de vérité de référence.

export const BLINKER = ['OOO'];

export const GLIDER = [
  '.O.',
  '..O',
  'OOO',
];

/** Meurt entièrement à la génération 130. */
export const DIEHARD = [
  '......O.',
  'OO......',
  '.O...OOO',
];

/** Se stabilise à la génération 1103, population finale 116. */
export const R_PENTOMINO = [
  '.OO',
  'OO.',
  '.O.',
];

/** Se stabilise à la génération 5206, population finale 633. */
export const ACORN = [
  '.O.....',
  '...O...',
  'OO..OOO',
];

/** Nature morte : ne bouge jamais. */
export const BLOCK = [
  'OO',
  'OO',
];
