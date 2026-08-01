/**
 * L'argent, et la seule façon de l'écrire dans cette application.
 *
 * Tout est en **centimes entiers**. Ce n'est pas une préférence : PostgREST
 * sérialise `numeric` en nombre JSON, donc 19,99 ferait un aller-retour par un
 * flottant JavaScript et on finirait par semer des `Math.round(x * 100)` de
 * prudence un peu partout. Toute colonne suffixée `_cents` est un entier, et
 * rien d'autre dans l'application n'est de l'argent.
 *
 * La conversion n'a lieu qu'aux deux bords : ici à la saisie, ici à
 * l'affichage. Entre les deux, il n'y a que des entiers.
 */

const FORMAT_EURO = new Intl.NumberFormat('fr-BE', {
  style: 'currency',
  currency: 'EUR',
})

const FORMAT_EURO_ENTIER = new Intl.NumberFormat('fr-BE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** « 19,99 € ». Le signe moins est conservé : une dépense est négative. */
export function euros(cents: number): string {
  return FORMAT_EURO.format(cents / 100)
}

/** « 20 € » — pour les colonnes serrées où les centimes sont du bruit. */
export function eurosArrondis(cents: number): string {
  return FORMAT_EURO_ENTIER.format(cents / 100)
}

/**
 * La valeur absolue formatée, quand le signe est déjà porté par autre chose —
 * un libellé « Sorties », une colonne de dépenses. Afficher « −45,00 € » sous
 * un titre « Sorties » ferait douter du sens de la colonne.
 */
export function eurosAbsolus(cents: number): string {
  return FORMAT_EURO.format(Math.abs(cents) / 100)
}

/**
 * Lit un montant tapé à la main et renvoie des centimes entiers.
 *
 * Accepte la virgule comme le point (un clavier iOS en français produit une
 * virgule, un pavé numérique un point), les espaces et les espaces insécables
 * des séparateurs de milliers, et le symbole €. Renvoie `null` si la chaîne
 * n'est pas un montant — jamais 0, qui serait une valeur inventée et passerait
 * silencieusement dans le grand livre.
 */
export function centsDepuisTexte(texte: string): number | null {
  const nettoye = texte
    .replace(/[\s  ]/g, '')
    .replace(/€/g, '')
    .replace(',', '.')
    .trim()

  if (nettoye === '' || !/^-?\d*\.?\d*$/.test(nettoye)) return null
  if (!/\d/.test(nettoye)) return null

  const nombre = Number(nettoye)
  if (!Number.isFinite(nombre)) return null

  // Arrondi au centime le plus proche : 19.999 saisi à la main devient 20,00 €
  // et non 19,99 € par troncature.
  return Math.round(nombre * 100)
}

/** Pour pré-remplir un champ de saisie depuis des centimes. */
export function texteDepuisCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/**
 * Le signe attendu selon la nature de l'écriture.
 *
 * `amount_cents` est signé en base — négatif quand l'argent quitte le compte —
 * ce qui rend le solde calculable par une simple somme, sans jamais avoir à
 * interpréter le type de l'écriture. La contrainte `tx_signe_coherent` refuse
 * d'ailleurs un revenu négatif ou une dépense positive.
 */
export function signerMontant(kind: string, centsAbsolus: number): number {
  const magnitude = Math.abs(centsAbsolus)
  return kind === 'depense' ? -magnitude : magnitude
}
