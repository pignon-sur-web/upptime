import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { aujourdhui, jourLong } from '@/lib/date'

/**
 * L'en-tête du tableau de bord : l'emoji, le nom, la date.
 *
 * Le titre est le nom de l'outil et non la date du jour, comme dans la
 * maquette. Ça peut sembler un recul — la date est une information, un titre
 * fixe n'en est pas une — mais un tableau de bord a besoin d'une entrée : on
 * ouvre quelque chose, pas une journée. La date reste, au-dessus, en petit,
 * et le jour long en dessous ; on n'a rien perdu, on a gagné un seuil.
 *
 * Un seul `<h1>`, et en tête du DOM : le banc de parcours interroge
 * `document.querySelector('h1')` sur l'accueil pour contrôler que la police
 * d'interface est bien appliquée.
 */
export function EnTeteJour() {
  const jour = aujourdhui()
  return (
    <header className="px-1 pt-8 pb-2">
      <p aria-hidden className="text-40 leading-none">
        🧠
      </p>
      <h1 className="mt-2 text-40 font-bold tracking-[-0.02em]">2ᵉ CERVEAU</h1>
      <p className="mt-1 text-13 text-secondaire">
        <span className="chiffres">{jour}</span>
        <span className="first-letter:uppercase"> · {jourLong(jour)}</span>
      </p>
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
