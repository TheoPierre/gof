import Link from 'next/link';

import { LOCALES, LOCALE_NAMES, type Locale } from '../lib/i18n';

/**
 * Bascule de langue. Elle pointe vers la même page dans l'autre langue quand
 * le chemin est connu, sinon vers sa racine — mieux vaut la racine de la bonne
 * langue qu'une page morte.
 */
export default function LanguageSwitch({ locale, path = '' }: { locale: Locale; path?: string }) {
  return (
    <span className="lang-switch">
      {LOCALES.map((other) => (
        <Link
          key={other}
          href={`/${other}${path}`}
          hrefLang={other}
          aria-current={other === locale ? 'true' : undefined}
        >
          {LOCALE_NAMES[other]}
        </Link>
      ))}
    </span>
  );
}
