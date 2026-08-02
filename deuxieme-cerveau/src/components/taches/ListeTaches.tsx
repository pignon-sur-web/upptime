'use client'

import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Case } from '@/components/ui/Case'
import { Badge, BadgePriorite } from '@/components/ui/Badge'
import { completerTache, reporterTache } from '@/lib/actions/taches'
import { aujourdhui, jourRelatif } from '@/lib/date'
import type { Tache } from '@/lib/donnees/taches'

/**
 * La liste de tâches, et les deux seuls gestes qu'elle propose : cocher et
 * reporter à demain.
 *
 * Tout le reste — changer le projet, la priorité, la récurrence — vit sur
 * l'écran de détail. Une liste sur laquelle on peut tout faire est une liste
 * qu'on n'ose plus toucher au pouce, et le geste quotidien n'est pas de
 * modifier une tâche, c'est de la faire.
 *
 * `useOptimistic` retire la ligne à l'instant du tap. La RPC de complétion
 * étant idempotente et verrouillée, une double tape sur un réseau lent ne
 * peut ni créer deux occurrences ni laisser un état incohérent.
 */
export function ListeTaches({
  taches,
  reportable = true,
  vide,
}: {
  taches: Tache[]
  /** Faux sur les listes de consultation, où reporter n'aurait pas de sens. */
  reportable?: boolean
  /** Ce qui s'affiche quand il ne reste rien. */
  vide?: React.ReactNode
}) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()
  const [retirees, retirer] = useOptimistic<string[], string>(
    [],
    (etat, id) => [...etat, id],
  )

  const affichees = taches.filter((t) => !retirees.includes(t.id))

  const cocher = (tache: Tache) => {
    demarrer(async () => {
      retirer(tache.id)
      await completerTache(tache.id)
      // Vide le cache de navigation : sans ça, l'accueil resservirait la
      // liste d'avant en revenant par la barre d'onglets.
      routeur.refresh()
    })
  }

  const reporter = (tache: Tache) => {
    demarrer(async () => {
      retirer(tache.id)
      await reporterTache(tache.id, 1)
      routeur.refresh()
    })
  }

  if (affichees.length === 0) return <>{vide ?? null}</>

  const jour = aujourdhui()

  return (
    <ul aria-busy={enCours}>
      {affichees.map((tache) => {
        const enRetard = tache.echeance !== null && tache.echeance < jour

        return (
          <li
            key={tache.id}
            className={[
              'flex items-center gap-1 border-b border-trait last:border-b-0',
              // Le filet rouge à gauche remplace la marque « !! » : il se voit
              // en balayant la liste, sans occuper de place dans le titre.
              enRetard ? 'border-l-2 border-l-echec pl-2' : '',
            ].join(' ')}
          >
            <Case
              cochee={false}
              onToggle={() => cocher(tache)}
              libelle={`Terminer : ${tache.titre}`}
            />

            <Link
              href={`/taches/${tache.id}`}
              className="min-w-0 flex-1 py-2"
              prefetch={false}
            >
              <span className="block truncate text-15">{tache.titre}</span>

              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-11 text-secondaire">
                <BadgePriorite priorite={tache.priorite} />
                {tache.echeance ? (
                  <span
                    className={enRetard ? 'font-medium text-echec' : undefined}
                  >
                    {jourRelatif(tache.echeance, jour)}
                  </span>
                ) : null}
                {tache.projetNom ? (
                  <Badge pastille={false}>{tache.projetNom}</Badge>
                ) : null}
                {tache.recurrence ? <span aria-label="récurrente">↻</span> : null}
              </span>
            </Link>

            {reportable ? (
              <button
                type="button"
                onClick={() => reporter(tache)}
                aria-label={`Reporter à demain : ${tache.titre}`}
                className="flex size-11 shrink-0 items-center justify-center text-13 text-secondaire"
              >
                +1 j
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
