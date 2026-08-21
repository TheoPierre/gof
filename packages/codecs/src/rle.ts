// Format RLE — le format d'échange du Jeu de la Vie.
//
// C'est ce que parlent le LifeWiki, Golly, Catagolue et les forums depuis
// vingt ans. Savoir le lire, c'est hériter de milliers de motifs déjà
// nommés, datés et documentés au lieu de les ressaisir à la main.
//
//   #N Gosper glider gun
//   #C Le premier canon découvert, 1970.
//   x = 36, y = 9, rule = B3/S23
//   24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$...!
//
//   b = morte, o = vivante, $ = fin de ligne, ! = fin du motif.
//   Un nombre préfixe une répétition.

export interface Pattern {
  /** Coordonnées des cellules vivantes, origine en haut à gauche. */
  cells: Array<readonly [x: number, y: number]>;
  width: number;
  height: number;
  /** Règle déclarée dans l'en-tête, ou null si absente (Life est alors implicite). */
  rule: string | null;
  name: string | null;
  /** Lignes `#C` / `#c` concaténées. */
  comment: string | null;
  author: string | null;
}

export class RleParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RleParseError';
  }
}

const HEADER = /^\s*x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)\s*(?:,\s*rule\s*=\s*([^,\s]+))?\s*$/i;

export function decodeRle(text: string): Pattern {
  const lines = text.split(/\r?\n/);

  let name: string | null = null;
  let author: string | null = null;
  const comments: string[] = [];

  let declaredWidth = 0;
  let declaredHeight = 0;
  let rule: string | null = null;
  let bodyStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed.startsWith('#')) {
      const tag = trimmed[1];
      const value = trimmed.slice(2).trim();
      if (tag === 'N') name = value;
      else if (tag === 'O') author = value;
      else if (tag === 'C' || tag === 'c') comments.push(value);
      continue;
    }

    const header = HEADER.exec(trimmed);
    if (header) {
      declaredWidth = Number(header[1]);
      declaredHeight = Number(header[2]);
      rule = header[3] ?? null;
      bodyStart = i + 1;
      break;
    }

    // Pas d'en-tête : certains fichiers commencent directement par le corps.
    bodyStart = i;
    break;
  }

  if (bodyStart < 0) throw new RleParseError('Aucun contenu de motif trouvé.');

  const body = lines.slice(bodyStart).join('');
  const cells: Array<readonly [number, number]> = [];

  let x = 0;
  let y = 0;
  let maxX = 0;
  let run = 0;
  let sawTerminator = false;

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      run = run * 10 + (ch.charCodeAt(0) - 48);
      continue;
    }

    const count = run === 0 ? 1 : run;
    run = 0;

    switch (ch) {
      case 'b':
      case 'B':
      case '.':
        x += count;
        break;

      case 'o':
      case 'O':
        for (let k = 0; k < count; k++) cells.push([x + k, y]);
        x += count;
        break;

      case '$':
        if (x > maxX) maxX = x;
        x = 0;
        y += count;
        break;

      case '!':
        sawTerminator = true;
        break;

      case ' ':
      case '\t':
        break;

      default:
        // Les formats multi-états utilisent d'autres lettres. On refuse
        // franchement plutôt que de produire un motif silencieusement faux.
        throw new RleParseError(`Caractère inattendu dans le corps RLE : ${JSON.stringify(ch)}`);
    }

    if (sawTerminator) break;
  }

  if (x > maxX) maxX = x;
  const lastRow = cells.length > 0 ? Math.max(...cells.map(([, cy]) => cy)) : -1;

  return {
    cells,
    width: declaredWidth || maxX,
    height: declaredHeight || lastRow + 1,
    rule,
    name,
    comment: comments.length > 0 ? comments.join('\n') : null,
    author,
  };
}

export interface EncodeOptions {
  rule?: string;
  name?: string;
  comment?: string;
  author?: string;
  /** Longueur maximale des lignes du corps. 70 est la convention de Golly. */
  lineWidth?: number;
}

export function encodeRle(
  cells: Iterable<readonly [x: number, y: number]>,
  options: EncodeOptions = {},
): string {
  const list = [...cells];
  const { lineWidth = 70, rule = 'B3/S23' } = options;

  if (list.length === 0) {
    return `${headerLines(options)}x = 0, y = 0, rule = ${rule}\n!\n`;
  }

  // Normalise sur l'origine : un motif est une forme, pas une position.
  const minX = Math.min(...list.map(([x]) => x));
  const minY = Math.min(...list.map(([, y]) => y));
  const maxX = Math.max(...list.map(([x]) => x));
  const maxY = Math.max(...list.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const rows: Set<number>[] = Array.from({ length: height }, () => new Set<number>());
  for (const [x, y] of list) rows[y - minY]!.add(x - minX);

  // Suite de (longueur, symbole) pour tout le motif.
  const tokens: string[] = [];
  const emit = (count: number, symbol: string): void => {
    if (count <= 0) return;
    tokens.push(count === 1 ? symbol : `${count}${symbol}`);
  };

  let pendingBlankRows = 0;
  for (let y = 0; y < height; y++) {
    const row = rows[y]!;
    if (row.size === 0) {
      pendingBlankRows++;
      continue;
    }
    if (y > 0) emit(pendingBlankRows + 1, '$');
    pendingBlankRows = 0;

    let x = 0;
    while (x < width) {
      const alive = row.has(x);
      let run = 1;
      while (x + run < width && row.has(x + run) === alive) run++;
      // Les cellules mortes en fin de ligne sont implicites : on les omet.
      if (!(alive === false && x + run >= width)) emit(run, alive ? 'o' : 'b');
      x += run;
    }
  }
  tokens.push('!');

  // Repliage : on ne coupe jamais au milieu d'un jeton.
  const bodyLines: string[] = [];
  let current = '';
  for (const token of tokens) {
    if (current.length + token.length > lineWidth) {
      bodyLines.push(current);
      current = '';
    }
    current += token;
  }
  if (current !== '') bodyLines.push(current);

  return `${headerLines(options)}x = ${width}, y = ${height}, rule = ${rule}\n${bodyLines.join('\n')}\n`;
}

function headerLines(options: EncodeOptions): string {
  let out = '';
  if (options.name) out += `#N ${options.name}\n`;
  if (options.author) out += `#O ${options.author}\n`;
  if (options.comment) {
    for (const line of options.comment.split('\n')) out += `#C ${line}\n`;
  }
  return out;
}
