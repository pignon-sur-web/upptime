import Link from 'next/link'
import { Badge, type TonBadge } from '@/components/ui/Badge'
import { aujourdhui, heure, jourSemaineCourt } from '@/lib/date'
import {
  CATEGORIES_EVENEMENT,
  LIBELLE_CATEGORIE_EVENEMENT,
  TON_CATEGORIE_EVENEMENT,
  type CategorieEvenement,
} from '@/lib/enums'
import type { JourDAgenda } from '@/lib/donnees/agenda'

/**
 * La semaine en colonnes, une par jour.
 *
 * Sept colonnes tiennent sur un écran d'ordinateur ; sur un téléphone, une
 * colonne ferait 50 px et aucun titre n'y entrerait. La carte défile donc
 * latéralement au doigt en dessous de `lg`, et redevient une grille au-dessus.
 *
 * Le défilement est INTERNE au conteneur, pas celui de la page : le
 * `overflow-x-auto` est borné par la carte, donc `documentElement.scrollWidth`
 * ne bouge pas. C'est ce qui distingue un défileur d'un débordement, et c'est
 * ce que contrôle le banc de parcours.
 *
 * Les tâches datées apparaissent après les événements, en gris et sans case à
 * cocher : l'agenda répond à « qu'est-ce qui m'attend », l'écran Tâches à
 * « qu'est-ce que je fais ». Mélanger les gestes ferait de l'agenda une
 * seconde liste de tâches, moins bonne que la première.
 */

function tonDe(categorie: string | null): TonBadge | null {
  if (!categorie) return null
  if (!(CATEGORIES_EVENEMENT as readonly string[]).includes(categorie)) return null
  return TON_CATEGORIE_EVENEMENT[categorie as CategorieEvenement] as TonBadge
}

export function SemaineEnColonnes({ jours }: { jours: readonly JourDAgenda[] }) {
  const cejour = aujourdhui()

  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 lg:mx-0 lg:overflow-x-visible lg:px-0">
      <div className="flex w-max gap-2 lg:grid lg:w-full lg:grid-cols-7">
        {jours.map((journee) => {
          const cestAujourdhui = journee.jour === cejour
          const vide = journee.evenements.length === 0 && journee.taches.length === 0

          return (
            <section
              key={journee.jour}
              className="w-36 shrink-0 lg:w-auto lg:min-w-0"
              aria-current={cestAujourdhui ? 'date' : undefined}
            >
              <h3
                className={[
                  'mb-1.5 flex items-baseline gap-1.5 border-b pb-1 text-11',
                  cestAujourdhui
                    ? 'border-accent font-semibold text-accent'
                    : 'border-trait text-secondaire',
                ].join(' ')}
              >
                <span className="uppercase">
                  {jourSemaineCourt(journee.jour).replace('.', '')}
                </span>
                <span className="chiffres">{Number(journee.jour.slice(8, 10))}</span>
              </h3>

              {vide ? (
                <p aria-hidden className="text-11 text-secondaire">
                  —
                </p>
              ) : null}

              <ul className="flex flex-col gap-1.5">
                {journee.evenements.map((evenement) => {
                  const ton = tonDe(evenement.categorie)
                  return (
                    <li
                      key={evenement.id}
                      className="rounded-petit bg-neutre-fond p-2"
                    >
                      <p className="truncate text-13">{evenement.titre}</p>
                      <p className="chiffres text-11 text-secondaire">
                        {evenement.journeeEntiere ? 'journée' : heure(evenement.debut)}
                      </p>
                      {ton ? (
                        <p className="mt-1">
                          <Badge ton={ton}>
                            {
                              LIBELLE_CATEGORIE_EVENEMENT[
                                evenement.categorie as CategorieEvenement
                              ]
                            }
                          </Badge>
                        </p>
                      ) : null}
                    </li>
                  )
                })}

                {journee.taches.map((tache) => (
                  <li key={tache.id}>
                    <Link
                      href={`/taches/${tache.id}`}
                      prefetch={false}
                      className={[
                        'block truncate rounded-petit border border-trait p-2 text-13',
                        tache.faite ? 'text-secondaire line-through' : '',
                      ].join(' ')}
                    >
                      {tache.titre}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
