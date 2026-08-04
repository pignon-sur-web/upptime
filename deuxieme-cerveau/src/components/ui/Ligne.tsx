import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'

/**
 * La ligne de liste. Hauteur minimale 44px, filet en bas, contenu à gauche,
 * valeur à droite.
 *
 * `enRetard` pose un trait vertical de 2px en Encre pur sur le bord gauche.
 * C'est la seule exception prévue par la direction artistique : le retard se
 * signale par un trait, pas par du rouge.
 */
export function Ligne({
  children,
  droite,
  enRetard = false,
  href,
}: {
  children: ReactNode
  droite?: ReactNode
  enRetard?: boolean
  href?: Route
}) {
  const contenu = (
    <div
      className={[
        'cible flex w-full items-center justify-between gap-4 border-b border-trait py-2',
        enRetard ? 'border-l-2 border-l-texte pl-3' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {droite ? <div className="shrink-0 text-13 text-secondaire">{droite}</div> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {contenu}
      </Link>
    )
  }

  return contenu
}
