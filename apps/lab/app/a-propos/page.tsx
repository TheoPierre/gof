import Link from 'next/link';
import type { Metadata } from 'next';

import { CATALOGUE } from '@zp/content';

import { analyticsEnabled } from '../../lib/analytics';

export const metadata: Metadata = {
  title: 'À propos — Zero Player',
  description:
    "Ce qu'est le Jeu de la Vie de Conway, ce qu'est ce site, et ce qu'il mesure de votre visite.",
};

export default function APropos() {
  return (
    <main className="page">
      <article className="prose">
        <p className="eyebrow">Zero Player</p>
        <h1>Un jeu à zéro joueur</h1>

        <p className="lede">
          Le Jeu de la Vie a été imaginé par John Horton Conway en 1970. Il n’a ni objectif, ni
          adversaire, ni décision après le premier instant — Conway l’appelait lui-même un « jeu à
          zéro joueur ». On pose des cellules, on regarde.
        </p>

        <h2>Les règles, en entier</h2>
        <p>
          Une grille de cellules, vivantes ou mortes. À chaque génération, chacune regarde ses huit
          voisines :
        </p>
        <ul>
          <li>Une cellule vivante entourée de 2 ou 3 voisines vivantes survit.</li>
          <li>Toute autre cellule vivante meurt.</li>
          <li>Une cellule morte entourée d’exactement 3 voisines vivantes naît.</li>
        </ul>
        <p>
          C’est tout. De ces trois lignes sortent des motifs qui se déplacent, oscillent, se
          reproduisent, et des machines capables de calculer n’importe quoi.
        </p>

        <h2>Ce site</h2>
        <p>
          Le Labo est un bac à sable : une grille jusqu’à 2048 cellules de côté, un catalogue de{' '}
          {CATALOGUE.length} motifs nommés, l’import et l’export au format RLE — celui que parlent
          le LifeWiki, Golly et Catagolue.
        </p>
        <p>
          C’est la première pièce d’un projet plus large. La suite dépendra de l’intérêt que
          celui-ci suscitera.
        </p>

        <h2>Crédits</h2>
        <p>
          Les noms, descriptions et comportements des motifs proviennent du{' '}
          <a href="https://conwaylife.com/wiki/" rel="noreferrer noopener" target="_blank">
            LifeWiki
          </a>
          , sous licence{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            rel="noreferrer noopener"
            target="_blank"
          >
            CC BY-SA 3.0
          </a>
          . Le recensement des motifs issus de soupes aléatoires est l’œuvre de{' '}
          <a href="https://catagolue.hatsya.com/" rel="noreferrer noopener" target="_blank">
            Catagolue
          </a>
          . Le travail d’un demi-siècle de cette communauté est ce qui rend ce sujet aussi riche.
        </p>
        <p>
          John Horton Conway est mort en 2020. Ce projet n’a aucun lien avec lui ni avec ses ayants
          droit — seulement une dette.
        </p>

        <h2>Vie privée</h2>
        {analyticsEnabled ? (
          <>
            <p>
              Ce site mesure sa fréquentation, et le fait de la façon la plus sobre possible :{' '}
              <strong>aucun cookie, aucun stockage dans votre navigateur</strong>, aucune capture
              automatique de vos clics, aucun rejeu de session.
            </p>
            <p>
              Un identifiant tiré au hasard à l’ouverture de la page, qui meurt avec elle, permet de
              relier entre eux les événements d’une même visite. Il n’y a donc aucun suivi d’une
              visite à l’autre. Les seuls événements envoyés sont : l’ouverture du Labo, le dépôt
              d’un motif, le premier trait dessiné, le lancement de la simulation, un import ou un
              export RLE, un changement de taille de grille, et la durée de la visite.
            </p>
            <p>
              Du référent, seul le nom de domaine est conservé — pour savoir par quel canal les
              gens arrivent, pas d’où précisément. Les signaux{' '}
              <code>Do Not Track</code> et <code>Global Privacy Control</code> sont respectés : s’ils
              sont actifs, rien n’est envoyé.
            </p>
          </>
        ) : (
          <p>
            Aucune mesure d’audience n’est active sur cette instance. Rien n’est envoyé nulle part.
          </p>
        )}

        <h2>Le code</h2>
        <p>
          Tout est ouvert :{' '}
          <a
            href="https://github.com/TheoPierre/gof"
            rel="noreferrer noopener"
            target="_blank"
          >
            github.com/TheoPierre/gof
          </a>
          . Les retours, et surtout les corrections de terminologie, sont bienvenus.
        </p>

        <p className="back">
          <Link href="/">← Retour au Labo</Link>
        </p>
      </article>
    </main>
  );
}
