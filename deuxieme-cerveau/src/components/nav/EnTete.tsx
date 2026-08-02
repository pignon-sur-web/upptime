import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { aujourdhui, jourLong } from '@/lib/date'

/**
 * En-tête minimal du tableau de bord : la date du jour en Geist Mono, et rien
 * d'autre. C'est le seul repère temporel dont l'application a besoin en
 * permanence.
 */
export function EnTeteJour() {
  const jour = aujourdhui()
  return (
    <header className="px-1 pt-8 pb-1">
      <p className="chiffres text-13 text-secondaire">{jour}</p>
      <h1 className="mt-1 text-24 font-semibold first-letter:uppercase">
        {jourLong(jour)}
      </h1>
    </header>
  )
}

/**
 * En-tête des écrans de section. Le bouton retour est obligatoire : en PWA
 * installée il n'y a pas de bouton retour du navigateur, et le geste de bord
 * iOS n'est pas fiable en mode standalone.
 */
export function EnTeteSection({
  titre,
  retour,
  action,
}: {
  titre: string
  retour?: Route
  action?: ReactNode
}) {
  return (
    <header className="flex items-center gap-2 px-1 pt-6 pb-1">
      {retour ? (
        <Link
          href={retour}
          aria-label="Retour"
          className="-ml-3 flex size-11 shrink-0 items-center justify-center text-18 text-secondaire"
        >
          ‹
        </Link>
      ) : null}
      <h1 className="min-w-0 flex-1 text-24 font-semibold">{titre}</h1>
      {action}
    </header>
  )
}
