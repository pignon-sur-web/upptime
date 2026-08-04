/**
 * L'argent, en centimes entiers.
 *
 * PostgREST sérialise `numeric` en NOMBRE JSON : 19,99 ferait un aller-retour
 * par un flottant JavaScript. Tout est donc stocké et manipulé en centimes
 * entiers, et la conversion n'a lieu qu'au bord — ici.
 *
 * Règle : toute variable suffixée `Cents` est un entier, et rien d'autre dans
 * l'application n'est de l'argent.
 */

const FORMAT_EURO = new Intl.NumberFormat('fr-BE', {
  style: 'currency',
  currency: 'EUR',
})

const FORMAT_EURO_COMPACT = new Intl.NumberFormat('fr-BE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** « 1 234,56 € ». Le signe négatif est conservé. */
export function formater(cents: number): string {
  return FORMAT_EURO.format(cents / 100)
}

/** « 1 235 € » — pour les totaux en grand, où les centimes sont du bruit. */
export function formaterCompact(cents: number): string {
  return FORMAT_EURO_COMPACT.format(cents / 100)
}

/** « +12,40 € » / « −12,40 € ». Le vrai signe moins, pas le trait d'union. */
export function formaterSigne(cents: number): string {
  if (cents === 0) return formater(0)
  const signe = cents > 0 ? '+' : '−'
  return `${signe}${formater(Math.abs(cents))}`
}

/**
 * Lit un montant saisi à la main et rend des centimes.
 *
 * Accepte ce qu'on tape réellement sur un téléphone belge : virgule ou point
 * décimal, espaces (y compris insécables), séparateurs de milliers, symbole
 * euro, signe moins en tête. Rend `null` quand la saisie n'est pas exploitable
 * — l'appelant décide quoi en dire, on ne devine pas un zéro.
 */
export function versCents(saisie: string): number | null {
  let texte = saisie
    .replace(/[\s  ]/g, '')
    .replace(/[€]/g, '')
    .replace(/−/g, '-') // le vrai signe moins, si l'utilisateur le colle
    .trim()

  if (!texte) return null

  const negatif = texte.startsWith('-')
  if (negatif || texte.startsWith('+')) texte = texte.slice(1)

  const separateurs = [...texte.matchAll(/[.,]/g)]
  let entier = texte
  let decimales = ''

  if (separateurs.length > 0) {
    const dernier = separateurs[separateurs.length - 1]!.index
    const apres = texte.slice(dernier + 1)

    if (/^\d{1,2}$/.test(apres)) {
      // Un ou deux chiffres derrière : c'est le séparateur décimal.
      entier = texte.slice(0, dernier)
      decimales = apres
    } else if (/^\d{3}$/.test(apres) && separateurs.length >= 2) {
      // Plusieurs séparateurs suivis de groupes de trois : des milliers.
      entier = texte
    } else if (/^\d{3}$/.test(apres)) {
      // Un seul séparateur, trois chiffres derrière : « 12,345 » peut vouloir
      // dire douze euros et demi mal tapé, ou douze mille trois cent
      // quarante-cinq. Sur de l'argent, se tromper d'un facteur mille est le
      // pire résultat possible : on refuse au lieu de deviner.
      return null
    } else {
      return null
    }
  }

  entier = entier.replace(/[.,]/g, '')

  if (!/^\d*$/.test(entier) || entier === '') return null
  if (decimales && !/^\d{1,2}$/.test(decimales)) return null

  const cents = Number(entier) * 100 + Number(decimales.padEnd(2, '0') || '0')
  if (!Number.isSafeInteger(cents)) return null

  return negatif ? -cents : cents
}

/** Le mois d'un jour, sous la forme `AAAA-MM-01` que stocke la base. */
export function moisDe(jour: string): string {
  return `${jour.slice(0, 7)}-01`
}
