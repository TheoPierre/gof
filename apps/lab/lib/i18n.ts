// Les deux langues du site.
//
// L'anglais est la langue par défaut, et ce n'est pas un détail d'affichage :
// tout l'écosystème de ce sujet est anglophone — le LifeWiki, Golly, Catagolue,
// le forum conwaylife.com — et c'est là que le projet sera présenté. Le
// français reste servi en entier pour qui le préfère.

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', fr: 'Français' };

export interface Dict {
  locale: Locale;
  siteDescription: string;
  lab: {
    title: string;
    run: string;
    pause: string;
    step: string;
    perSecond: string;
    undoTitle: string;
    redoTitle: string;
    clear: string;
    soup: string;
    fit: string;
    patterns: string;
    rle: string;
    generation: string;
    alive: string;
    zoom: string;
    gridSize: string;
    edges: string;
    edgesWrap: string;
    edgesDead: string;
    sharedTitle: string;
    toolbar: string;
    hint: string;
    hintArmed: (name: string) => string;
    canvasLabel: string;
    cursorAt: (x: number, y: number) => string;
    attribution: string;
    about: string;
    allPatterns: string;
    loading: string;
    loadingGrid: string;
    announce: {
      dropped: (name: string) => string;
      droppedGeneric: string;
      armed: (name: string) => string;
      cleared: string;
      newSoup: string;
      undone: string;
      redone: string;
      cellOn: (x: number, y: number) => string;
      resized: (size: number, wrap: boolean) => string;
      imported: string;
      loadedFromPage: (name: string) => string;
      error: (message: string) => string;
    };
  };
  panel: {
    patternsTitle: string;
    patternsIntro: string;
    close: string;
    closeRle: string;
    rleTitle: string;
    rleIntro: string;
    rleContent: string;
    import: string;
    exportGrid: string;
    copy: string;
    copied: string;
    download: string;
    rleFooter: string;
    emptyPattern: string;
    clipboardRefused: string;
  };
  player: {
    label: (name: string) => string;
    restart: string;
  };
  patterns: { title: string; lede: string };
  pattern: {
    breadcrumb: string;
    measured: string;
    behaviour: string;
    cells: string;
    bounds: string;
    period: string;
    periodValue: (n: number) => string;
    speed: string;
    extinction: string;
    extinctionValue: (n: number) => string;
    measuredNote: string;
    rleHeading: string;
    rleIntro: string;
    openInLab: string;
    further: string;
    furtherBody: string;
    wikiLink: string;
    family: string;
    allPatterns: string;
    lab: string;
    kinds: Record<string, string>;
  };
  about: {
    title: string;
    lede: string;
    rulesHeading: string;
    rulesIntro: string;
    rule1: string;
    rule2: string;
    rule3: string;
    rulesOutro: string;
    siteHeading: string;
    siteBody: (count: number) => string;
    siteBody2: string;
    creditsHeading: string;
    creditsBody: string;
    creditsConway: string;
    privacyHeading: string;
    privacyOff: string;
    privacy1: string;
    privacy2: string;
    privacy3: string;
    codeHeading: string;
    codeBody: string;
    back: string;
  };
}

const en: Dict = {
  locale: 'en',
  siteDescription:
    "Conway's Game of Life on a grid up to 2048 cells across. Draw, drop in a pattern, watch what comes out.",
  lab: {
    title: 'The Lab',
    run: '▶ Run',
    pause: '⏸ Pause',
    step: '⇥ Step',
    perSecond: 'gen/s',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Shift+Z)',
    clear: 'Clear',
    soup: 'Soup',
    fit: '⤢ Fit',
    patterns: 'Patterns',
    rle: 'RLE',
    generation: 'Generation',
    alive: 'Alive',
    zoom: 'Zoom',
    gridSize: 'Grid size',
    edges: 'Grid edges',
    edgesWrap: 'Wrapping edges',
    edgesDead: 'Dead edges',
    sharedTitle: 'Memory shared between the worker and the renderer',
    toolbar: 'Simulation controls',
    hint: 'Drag to draw · Shift to erase · Scroll to zoom · Right-click to pan · Space, →, F, C, R',
    hintArmed: (name) => `${name} — click the grid to drop it, Esc to cancel`,
    canvasLabel:
      'Game of Life grid. Use the arrow keys to move the cursor, Enter to switch a cell on.',
    cursorAt: (x, y) => `Cursor at column ${x}, row ${y}.`,
    attribution: 'Patterns: LifeWiki, CC BY-SA',
    about: 'About',
    allPatterns: 'Patterns',
    loading: 'Starting the engine…',
    loadingGrid: 'Loading the grid.',
    announce: {
      dropped: (name) => `${name} dropped.`,
      droppedGeneric: 'Pattern dropped.',
      armed: (name) => `${name} selected. Click the grid to drop it.`,
      cleared: 'Grid cleared.',
      newSoup: 'New soup.',
      undone: 'Undone.',
      redone: 'Redone.',
      cellOn: (x, y) => `Cell ${x}, ${y} switched on.`,
      resized: (size, wrap) => `Grid ${size} by ${size}, ${wrap ? 'wrapping' : 'dead'} edges.`,
      imported: 'Pattern imported at the centre of the view.',
      loadedFromPage: (name) => `${name} loaded from its page.`,
      error: (message) => `Error: ${message}`,
    },
  },
  panel: {
    patternsTitle: 'Patterns',
    patternsIntro:
      'Click a pattern, then click the grid to drop it. You can also drag it straight onto the grid.',
    close: 'Close the pattern library',
    closeRle: 'Close the RLE panel',
    rleTitle: 'RLE',
    rleIntro:
      'The Game of Life interchange format. Paste a pattern from the LifeWiki or Golly, or export your grid to share it.',
    rleContent: 'RLE content',
    import: 'Import',
    exportGrid: 'Export the grid',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    rleFooter:
      'An import lands at the centre of the view. An unknown character is refused rather than guessed: a silently wrong pattern is worth less than a plain error.',
    emptyPattern: 'This pattern contains no live cells.',
    clipboardRefused: 'The clipboard was refused. Select the text and copy it by hand.',
  },
  player: {
    label: (name) => `Simulation of ${name}`,
    restart: '↺ Restart',
  },
  patterns: {
    title: 'The patterns',
    lede: "From the blinker's three cells to the Gosper gun's thirty-six, here is what fifty years of research pulled out of three rules. Every pattern has its page and its simulation.",
  },
  pattern: {
    breadcrumb: 'Patterns',
    measured: 'What the engine measures',
    behaviour: 'Behaviour',
    cells: 'Cells',
    bounds: 'Bounding box',
    period: 'Period',
    periodValue: (n) => `${n} generations`,
    speed: 'Speed',
    extinction: 'Extinction',
    extinctionValue: (n) => `generation ${n}`,
    measuredNote:
      'These values are computed when the site is built, by running the pattern. None of them is copied from a source.',
    rleHeading: 'The pattern in RLE',
    rleIntro:
      'The Game of Life interchange format. Copy it to open in Golly, or drop it into the Lab.',
    openInLab: 'Open in the Lab →',
    further: 'Going further',
    furtherBody:
      'The full history of this pattern — who found it, when, and what came of it since — is on',
    wikiLink: 'its LifeWiki page',
    family: 'In the same family',
    allPatterns: '← All patterns',
    lab: 'The Lab',
    kinds: {
      'still-life': 'Still life',
      oscillator: 'Oscillator',
      spaceship: 'Spaceship',
      unstable: 'No period observed',
      extinct: 'Dies out',
    },
  },
  about: {
    title: 'A zero-player game',
    lede: 'The Game of Life was devised by John Horton Conway in 1970. It has no goal, no opponent, and no decision after the first moment — Conway himself called it a zero-player game. You place cells, and you watch.',
    rulesHeading: 'The rules, in full',
    rulesIntro:
      'A grid of cells, alive or dead. Each generation, every cell looks at its eight neighbours:',
    rule1: 'A live cell with 2 or 3 live neighbours survives.',
    rule2: 'Any other live cell dies.',
    rule3: 'A dead cell with exactly 3 live neighbours comes to life.',
    rulesOutro:
      'That is all. Out of those three lines come patterns that travel, oscillate and reproduce, and machines able to compute anything at all.',
    siteHeading: 'This site',
    siteBody: (count) =>
      `The Lab is a sandbox: a grid up to 2048 cells across, a catalogue of ${count} named patterns, and import and export in RLE — the format the LifeWiki, Golly and Catagolue speak.`,
    siteBody2:
      'It is the first piece of something larger. What comes next depends on the interest this one draws.',
    creditsHeading: 'Credits',
    creditsBody:
      'Pattern names, descriptions and behaviours come from the LifeWiki, under CC BY-SA 3.0. The census of patterns arising from random soups is the work of Catagolue. Half a century of that community is what makes this subject so rich.',
    creditsConway:
      'John Horton Conway died in 2020. This project has no connection to him or to his estate — only a debt.',
    privacyHeading: 'Privacy',
    privacyOff: 'No audience measurement is active on this instance. Nothing is sent anywhere.',
    privacy1:
      'This site measures its traffic, and does so as soberly as possible: no cookie, no storage in your browser, no automatic capture of your clicks, no session replay.',
    privacy2:
      'A randomly drawn identifier, created when the page opens and dying with it, links the events of a single visit together. There is therefore no tracking from one visit to the next. The only events sent are: opening the Lab, dropping a pattern, the first stroke drawn, starting the simulation, an RLE import or export, a grid size change, and the length of the visit.',
    privacy3:
      'Of the referrer, only the domain name is kept — to know which channel people arrive through, not precisely where from. The Do Not Track and Global Privacy Control signals are respected: if either is set, nothing is sent.',
    codeHeading: 'The code',
    codeBody:
      'Everything is open. Feedback, and corrections to terminology above all, are welcome.',
    back: '← Back to the Lab',
  },
};

const fr: Dict = {
  locale: 'fr',
  siteDescription:
    'Le Jeu de la Vie de Conway, sur une grille jusqu’à 2048 cellules de côté. Dessine, importe un motif, regarde ce qui en sort.',
  lab: {
    title: 'Le Labo',
    run: '▶ Lancer',
    pause: '⏸ Pause',
    step: '⇥ Pas',
    perSecond: 'gén./s',
    undoTitle: 'Annuler (Ctrl+Z)',
    redoTitle: 'Rétablir (Ctrl+Maj+Z)',
    clear: 'Vider',
    soup: 'Soupe',
    fit: '⤢ Cadrer',
    patterns: 'Motifs',
    rle: 'RLE',
    generation: 'Génération',
    alive: 'Vivantes',
    zoom: 'Zoom',
    gridSize: 'Taille de la grille',
    edges: 'Bords de la grille',
    edgesWrap: 'Bords recollés',
    edgesDead: 'Bords morts',
    sharedTitle: 'Mémoire partagée entre le worker et le rendu',
    toolbar: 'Contrôles de la simulation',
    hint: 'Glisser pour dessiner · Maj pour effacer · Molette pour zoomer · Clic droit pour déplacer · Espace, →, F, C, R',
    hintArmed: (name) => `${name} — clique la grille pour le déposer, Échap pour annuler`,
    canvasLabel:
      'Grille du Jeu de la Vie. Utilise les flèches pour déplacer le curseur, Entrée pour allumer une cellule.',
    cursorAt: (x, y) => `Curseur en colonne ${x}, ligne ${y}.`,
    attribution: 'Motifs : LifeWiki, CC BY-SA',
    about: 'À propos',
    allPatterns: 'Les motifs',
    loading: 'Initialisation du moteur…',
    loadingGrid: 'Chargement de la grille.',
    announce: {
      dropped: (name) => `${name} déposé.`,
      droppedGeneric: 'Motif déposé.',
      armed: (name) => `${name} sélectionné. Clique la grille pour le déposer.`,
      cleared: 'Grille vidée.',
      newSoup: 'Nouvelle soupe.',
      undone: 'Annulé.',
      redone: 'Rétabli.',
      cellOn: (x, y) => `Cellule ${x}, ${y} allumée.`,
      resized: (size, wrap) => `Grille ${size} sur ${size}, bords ${wrap ? 'recollés' : 'morts'}.`,
      imported: 'Motif importé au centre de la vue.',
      loadedFromPage: (name) => `${name} chargé depuis sa page.`,
      error: (message) => `Erreur : ${message}`,
    },
  },
  panel: {
    patternsTitle: 'Motifs',
    patternsIntro:
      'Clique un motif puis clique la grille pour le déposer. Tu peux aussi le glisser directement dessus.',
    close: 'Fermer la bibliothèque',
    closeRle: 'Fermer le panneau RLE',
    rleTitle: 'RLE',
    rleIntro:
      'Le format d’échange du Jeu de la Vie. Colle un motif du LifeWiki ou de Golly, ou exporte ta grille pour la partager.',
    rleContent: 'Contenu RLE',
    import: 'Importer',
    exportGrid: 'Exporter la grille',
    copy: 'Copier',
    copied: 'Copié',
    download: 'Télécharger',
    rleFooter:
      'L’import se pose au centre de la vue. Un caractère inconnu est refusé plutôt que deviné : un motif silencieusement faux vaut moins qu’une erreur franche.',
    emptyPattern: 'Ce motif ne contient aucune cellule vivante.',
    clipboardRefused:
      'Le presse-papiers a été refusé. Sélectionne le texte et copie-le à la main.',
  },
  player: {
    label: (name) => `Simulation de ${name}`,
    restart: '↺ Reprendre',
  },
  patterns: {
    title: 'Les motifs',
    lede: 'Des trois cellules du blinker aux trente-six du canon de Gosper, voici ce que cinquante ans de recherche ont sorti de trois règles. Chaque motif a sa page et sa simulation.',
  },
  pattern: {
    breadcrumb: 'Motifs',
    measured: 'Ce que le moteur mesure',
    behaviour: 'Comportement',
    cells: 'Cellules',
    bounds: 'Encombrement',
    period: 'Période',
    periodValue: (n) => `${n} générations`,
    speed: 'Vitesse',
    extinction: 'Extinction',
    extinctionValue: (n) => `génération ${n}`,
    measuredNote:
      'Ces valeurs sont calculées à la construction du site en faisant tourner le motif. Aucune n’est recopiée d’une source.',
    rleHeading: 'Le motif en RLE',
    rleIntro:
      'Le format d’échange du Jeu de la Vie. Copie-le pour l’ouvrir dans Golly, ou dépose-le dans le Labo.',
    openInLab: 'Ouvrir dans le Labo →',
    further: 'Pour aller plus loin',
    furtherBody:
      'L’histoire complète de ce motif — qui l’a trouvé, quand, et ce qu’on en a tiré depuis — est sur',
    wikiLink: 'sa page du LifeWiki',
    family: 'Dans la même famille',
    allPatterns: '← Tous les motifs',
    lab: 'Le Labo',
    kinds: {
      'still-life': 'Nature morte',
      oscillator: 'Oscillateur',
      spaceship: 'Vaisseau',
      unstable: 'Sans période observée',
      extinct: 'Motif qui meurt',
    },
  },
  about: {
    title: 'Un jeu à zéro joueur',
    lede: 'Le Jeu de la Vie a été imaginé par John Horton Conway en 1970. Il n’a ni objectif, ni adversaire, ni décision après le premier instant — Conway l’appelait lui-même un « jeu à zéro joueur ». On pose des cellules, on regarde.',
    rulesHeading: 'Les règles, en entier',
    rulesIntro:
      'Une grille de cellules, vivantes ou mortes. À chaque génération, chacune regarde ses huit voisines :',
    rule1: 'Une cellule vivante entourée de 2 ou 3 voisines vivantes survit.',
    rule2: 'Toute autre cellule vivante meurt.',
    rule3: 'Une cellule morte entourée d’exactement 3 voisines vivantes naît.',
    rulesOutro:
      'C’est tout. De ces trois lignes sortent des motifs qui se déplacent, oscillent, se reproduisent, et des machines capables de calculer n’importe quoi.',
    siteHeading: 'Ce site',
    siteBody: (count) =>
      `Le Labo est un bac à sable : une grille jusqu’à 2048 cellules de côté, un catalogue de ${count} motifs nommés, l’import et l’export au format RLE — celui que parlent le LifeWiki, Golly et Catagolue.`,
    siteBody2:
      'C’est la première pièce d’un projet plus large. La suite dépendra de l’intérêt que celui-ci suscitera.',
    creditsHeading: 'Crédits',
    creditsBody:
      'Les noms, descriptions et comportements des motifs proviennent du LifeWiki, sous licence CC BY-SA 3.0. Le recensement des motifs issus de soupes aléatoires est l’œuvre de Catagolue. Le travail d’un demi-siècle de cette communauté est ce qui rend ce sujet aussi riche.',
    creditsConway:
      'John Horton Conway est mort en 2020. Ce projet n’a aucun lien avec lui ni avec ses ayants droit — seulement une dette.',
    privacyHeading: 'Vie privée',
    privacyOff:
      'Aucune mesure d’audience n’est active sur cette instance. Rien n’est envoyé nulle part.',
    privacy1:
      'Ce site mesure sa fréquentation, et le fait de la façon la plus sobre possible : aucun cookie, aucun stockage dans votre navigateur, aucune capture automatique de vos clics, aucun rejeu de session.',
    privacy2:
      'Un identifiant tiré au hasard à l’ouverture de la page, qui meurt avec elle, permet de relier entre eux les événements d’une même visite. Il n’y a donc aucun suivi d’une visite à l’autre. Les seuls événements envoyés sont : l’ouverture du Labo, le dépôt d’un motif, le premier trait dessiné, le lancement de la simulation, un import ou un export RLE, un changement de taille de grille, et la durée de la visite.',
    privacy3:
      'Du référent, seul le nom de domaine est conservé — pour savoir par quel canal les gens arrivent, pas d’où précisément. Les signaux Do Not Track et Global Privacy Control sont respectés : s’ils sont actifs, rien n’est envoyé.',
    codeHeading: 'Le code',
    codeBody:
      'Tout est ouvert. Les retours, et surtout les corrections de terminologie, sont bienvenus.',
    back: '← Retour au Labo',
  },
};

export const DICTS: Record<Locale, Dict> = { en, fr };

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}
