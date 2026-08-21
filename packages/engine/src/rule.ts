// Règles d'automate cellulaire en notation B/S.
//
// « B3/S23 » se lit : une cellule morte naît avec exactement 3 voisines,
// une cellule vivante survit avec 2 ou 3 voisines. C'est le Jeu de la Vie.

export interface Rule {
  /** birth[n] = true si une cellule morte ayant n voisines naît. */
  readonly birth: ReadonlyArray<boolean>;
  /** survive[n] = true si une cellule vivante ayant n voisines survit. */
  readonly survive: ReadonlyArray<boolean>;
  /** Forme canonique, p. ex. "B3/S23". */
  readonly name: string;
}

const EMPTY = (): boolean[] => new Array<boolean>(9).fill(false);

function fromDigits(birthDigits: string, surviveDigits: string): Rule {
  const birth = EMPTY();
  const survive = EMPTY();
  for (const d of birthDigits) birth[Number(d)] = true;
  for (const d of surviveDigits) survive[Number(d)] = true;
  return { birth, survive, name: canonicalName(birth, survive) };
}

function canonicalName(birth: ReadonlyArray<boolean>, survive: ReadonlyArray<boolean>): string {
  let b = '';
  let s = '';
  for (let n = 0; n <= 8; n++) {
    if (birth[n]) b += n;
    if (survive[n]) s += n;
  }
  return `B${b}/S${s}`;
}

/**
 * Accepte les deux notations en usage :
 *   - « B3/S23 » (notation moderne, insensible à la casse)
 *   - « 23/3 »   (notation historique survie/naissance, celle de Golly)
 *
 * Lève une erreur sur toute entrée invalide plutôt que de deviner : une règle
 * mal comprise produit des classements faux, pas un simple bug d'affichage.
 */
export function parseRule(input: string): Rule {
  const text = input.trim();

  const modern = /^[Bb]([0-8]*)\/?[Ss]([0-8]*)$/.exec(text);
  if (modern) return fromDigits(dedupe(modern[1]!), dedupe(modern[2]!));

  const legacy = /^([0-8]*)\/([0-8]*)$/.exec(text);
  if (legacy) return fromDigits(dedupe(legacy[2]!), dedupe(legacy[1]!));

  throw new Error(`Règle invalide : ${JSON.stringify(input)}. Attendu « B3/S23 » ou « 23/3 ».`);
}

function dedupe(digits: string): string {
  return [...new Set(digits)].sort().join('');
}

/** Le Jeu de la Vie de Conway. */
export const LIFE: Rule = parseRule('B3/S23');

/** HighLife — comme Life, plus une naissance à 6 voisines. Produit un réplicateur. */
export const HIGHLIFE: Rule = parseRule('B36/S23');

/** Day & Night — symétrique par échange vivant/mort. */
export const DAY_AND_NIGHT: Rule = parseRule('B3678/S34678');

/** Seeds — aucune cellule ne survit jamais. Utile comme cas limite de test. */
export const SEEDS: Rule = parseRule('B2/S');
