import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'

/**
 * Les filtres, en pilules.
 *
 * Avant, un filtre actif se distinguait par un soulignement. Sur une ligne de
 * six filtres, il fallait s'arrêter pour trouver lequel était souligné. Une
 * pilule pleine se voit du coin de l'œil, ce qui est exactement l'usage : on
 * vérifie l'état du filtre en passant, on ne le lit pas.
 *
 * Les pilules restent des liens et non des boutons : elles changent l'URL,
 * donc elles se partagent, se mettent en favori et remontent avec le bouton
 * retour. Un `<button>` qui pousserait dans l'historique ferait la même chose
 * en moins bien.
 */
export function BarreFiltres({
  children,
  libelle,
}: {
  children: ReactNode
  /** Ce que la barre filtre — « Statut », « Vue ». Jamais affiché. */
  libelle: string
}) {
  return (
    <nav
      aria-label={libelle}
      className="flex flex-wrap items-center gap-1.5 px-1 py-0.5"
    >
      {children}
    </nav>
  )
}

export function Pilule({
  href,
  actif,
  children,
}: {
  href: Route
  actif: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      className={[
        'transition-etat rounded-plein px-3 py-1.5 text-13',
        actif
          ? 'bg-accent-fond font-medium text-accent'
          : 'bg-carte text-secondaire',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}

/**
 * Le sélecteur de vue, en segments.
 *
 * Ce n'est pas la même chose qu'une barre de filtres : les vues sont
 * exclusives et couvrent tout l'écran, donc elles occupent toute la largeur
 * et se partagent l'espace à parts égales. Le segment actif est une carte
 * blanche posée dans une rainure grise — le même vocabulaire que le reste de
 * l'interface, en plus petit.
 */
export function Onglets({
  libelle,
  onglets,
}: {
  libelle: string
  onglets: readonly { href: Route; libelle: string; actif: boolean }[]
}) {
  return (
    <nav
      aria-label={libelle}
      className="flex gap-1 rounded-carte bg-neutre-fond p-1"
    >
      {onglets.map((onglet) => (
        <Link
          key={onglet.href}
          href={onglet.href}
          aria-current={onglet.actif ? 'page' : undefined}
          className={[
            'transition-etat flex flex-1 items-center justify-center rounded-petit py-2 text-13',
            onglet.actif
              ? 'bg-carte font-medium text-texte shadow-carte'
              : 'text-secondaire',
          ].join(' ')}
        >
          {onglet.libelle}
        </Link>
      ))}
    </nav>
  )
}

/** Le trait vertical qui sépare deux familles de filtres sur la même ligne. */
export function SeparateurFiltres() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-trait" />
}
