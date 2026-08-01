'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ONGLETS, SECTIONS } from '@/lib/sections'

/**
 * Barre basse, texte seul.
 *
 * Pas d'icônes : un glyphe monochrome de 1px à 24px est ambigu sans étiquette,
 * et une fois l'étiquette ajoutée l'icône ne sert plus à rien. Quatre créneaux
 * pour que chaque cible dépasse largement les 44px sur un écran de 390px.
 *
 * L'onglet actif est marqué par un filet supérieur de 2px et une graisse 500.
 * L'inversion complète est réservée à la section courante dans le panneau : un
 * système monochrome ne dispose que d'un seul surlignage, on ne le dépense
 * qu'une fois.
 */
export function BarreOnglets() {
  const chemin = usePathname()
  const [panneauOuvert, setPanneauOuvert] = useState(false)

  // La navigation ferme le panneau : sans ça, il resterait ouvert par-dessus
  // l'écran qu'on vient de demander.
  useEffect(() => {
    setPanneauOuvert(false)
  }, [chemin])

  const dansPanneau = SECTIONS.some((s) => chemin.startsWith(s.href))

  return (
    <>
      {panneauOuvert ? (
        <PanneauTout chemin={chemin} onFermer={() => setPanneauOuvert(false)} />
      ) : null}

      <nav className="pb-sure fixed inset-x-0 bottom-0 z-40 select-none border-t border-trait bg-fond">
        <div className="mx-auto flex max-w-2xl">
          {ONGLETS.map((onglet) => {
            const actif =
              onglet.href === '/' ? chemin === '/' : chemin.startsWith(onglet.href)
            return (
              <Link
                key={onglet.href}
                href={onglet.href}
                aria-current={actif ? 'page' : undefined}
                className={[
                  'flex h-13 flex-1 items-center justify-center border-t-2 text-13',
                  actif
                    ? 'border-t-texte font-medium text-texte'
                    : 'border-t-transparent text-secondaire',
                ].join(' ')}
              >
                {onglet.nom}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setPanneauOuvert((ouvert) => !ouvert)}
            aria-expanded={panneauOuvert}
            className={[
              'flex h-13 flex-1 items-center justify-center border-t-2 text-13',
              panneauOuvert || dansPanneau
                ? 'border-t-texte font-medium text-texte'
                : 'border-t-transparent text-secondaire',
            ].join(' ')}
          >
            Tout
          </button>
        </div>
      </nav>
    </>
  )
}

function PanneauTout({
  chemin,
  onFermer,
}: {
  chemin: string
  onFermer: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fond">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl px-5 pt-6">
          <h1 className="libelle">Toutes les sections</h1>
        </div>

        <ul className="mx-auto mt-4 max-w-2xl">
          {SECTIONS.map((section) => {
            const actif = chemin.startsWith(section.href)
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={actif ? 'page' : undefined}
                  className={[
                    'flex min-h-14 items-center justify-between gap-4 border-b border-trait px-5 py-2',
                    actif ? 'bg-texte text-fond' : '',
                  ].join(' ')}
                >
                  <span>
                    <span className="block text-15">{section.nom}</span>
                    <span
                      className={[
                        'block text-13',
                        actif ? 'text-fond/70' : 'text-secondaire',
                      ].join(' ')}
                    >
                      {section.detail}
                    </span>
                  </span>
                  <span aria-hidden className="text-13 text-secondaire">
                    ›
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Le bouton de fermeture est en bas, là où le pouce arrive. */}
      <div className="pb-sure border-t border-trait bg-fond">
        <button
          type="button"
          onClick={onFermer}
          className="mx-auto flex h-13 w-full max-w-2xl items-center justify-center text-13 text-secondaire"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
