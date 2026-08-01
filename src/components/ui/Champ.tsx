import type { ReactNode } from 'react'

/**
 * Les champs de formulaire de l'application.
 *
 * Un seul filet sous le champ, jamais de boîte fermée : c'est la même grammaire
 * que les listes et les widgets, et ça évite d'inventer un deuxième langage
 * visuel pour la saisie.
 *
 * La taille du texte des champs est imposée à 16px par `globals.css`, pas ici :
 * sous ce seuil, Safari iOS zoome le viewport à la mise au point et n'en
 * revient jamais. C'est une règle de base, pas une décoration.
 */

const CLASSE_SAISIE =
  'w-full border-b border-trait bg-transparent py-2 text-texte outline-none placeholder:text-secondaire focus:border-texte'

export function Champ({
  libelle,
  children,
  aide,
}: {
  libelle: string
  children: ReactNode
  aide?: string
}) {
  return (
    <label className="block py-2">
      <span className="libelle block">{libelle}</span>
      {children}
      {aide ? <span className="mt-1 block text-11 text-secondaire">{aide}</span> : null}
    </label>
  )
}

export function Saisie(
  proprietes: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...reste } = proprietes
  return <input {...reste} className={[CLASSE_SAISIE, className ?? ''].join(' ')} />
}

export function Zone(proprietes: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...reste } = proprietes
  return (
    <textarea
      {...reste}
      className={[CLASSE_SAISIE, 'resize-y', className ?? ''].join(' ')}
    />
  )
}

export function Menu(proprietes: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...reste } = proprietes
  return (
    <select {...reste} className={[CLASSE_SAISIE, className ?? ''].join(' ')}>
      {children}
    </select>
  )
}

/**
 * Le bouton d'envoi. Inversé — fond Encre, texte Papier — parce que c'est
 * l'action principale de l'écran et que l'inversion est le seul surlignage
 * dont dispose un système monochrome.
 */
export function BoutonPrincipal({
  children,
  ...reste
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...reste}
      className="cible w-full bg-texte px-4 text-15 font-medium text-fond disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** Action secondaire : un simple libellé souligné, jamais un second bouton plein. */
export function BoutonDiscret({
  children,
  ...reste
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...reste} className="cible px-2 text-13 text-secondaire underline">
      {children}
    </button>
  )
}
