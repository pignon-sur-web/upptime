import type { ReactNode } from 'react'

/**
 * Les champs de formulaire de l'application.
 *
 * Une boîte fermée aux coins arrondis, comme les cartes : un champ est un
 * endroit où l'on met quelque chose, et le contour dit où commence et où
 * finit cet endroit. Le filet simple d'avant se confondait avec les
 * séparateurs de liste.
 *
 * La mise au point colore le contour en bleu d'accent plutôt que d'ajouter un
 * halo : c'est la même couleur que la case cochée et que l'onglet actif, donc
 * « là où je suis » s'écrit toujours pareil.
 *
 * La taille du texte des champs est imposée à 16px par `globals.css`, pas ici :
 * sous ce seuil, Safari iOS zoome le viewport à la mise au point et n'en
 * revient jamais. C'est une règle de base, pas une décoration.
 */

const CLASSE_SAISIE =
  'w-full rounded-petit border border-trait bg-carte px-3 py-2 text-texte outline-none placeholder:text-secondaire focus:border-accent'

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
      <span className="mb-1 block text-13 font-medium text-secondaire">
        {libelle}
      </span>
      {children}
      {aide ? <span className="mt-1 block text-11 text-secondaire">{aide}</span> : null}
    </label>
  )
}

/*
 * `ComponentPropsWithRef` plutôt que `InputHTMLAttributes` : depuis React 19,
 * `ref` est une propriété ordinaire des composants fonction, mais il faut le
 * dire au typage pour que la saisie rapide puisse récupérer le focus après
 * l'envoi.
 */
export function Saisie(proprietes: React.ComponentPropsWithRef<'input'>) {
  const { className, ...reste } = proprietes
  return <input {...reste} className={[CLASSE_SAISIE, className ?? ''].join(' ')} />
}

export function Zone(proprietes: React.ComponentPropsWithRef<'textarea'>) {
  const { className, ...reste } = proprietes
  return (
    <textarea
      {...reste}
      className={[CLASSE_SAISIE, 'resize-y', className ?? ''].join(' ')}
    />
  )
}

export function Menu(proprietes: React.ComponentPropsWithRef<'select'>) {
  const { className, children, ...reste } = proprietes
  return (
    <select {...reste} className={[CLASSE_SAISIE, className ?? ''].join(' ')}>
      {children}
    </select>
  )
}

/**
 * Le bouton d'envoi : plein, bleu d'accent, aux coins arrondis.
 *
 * C'est l'action principale de l'écran, et il n'y en a qu'une par écran. Un
 * second bouton plein en dessous ferait hésiter au lieu de guider — les
 * actions secondaires restent des libellés soulignés (`BoutonDiscret`).
 */
export function BoutonPrincipal({
  children,
  ...reste
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button
      {...reste}
      className="cible w-full rounded-petit bg-accent px-4 text-15 font-medium text-carte disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** Action secondaire : un simple libellé souligné, jamais un second bouton plein. */
export function BoutonDiscret({
  children,
  ...reste
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button {...reste} className="cible px-2 text-13 text-secondaire underline">
      {children}
    </button>
  )
}
