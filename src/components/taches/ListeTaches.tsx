'use client'

import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { Case } from '@/components/ui/Case'
import { completerTache, reporterTache } from '@/lib/actions/taches'
import { aujourdhui, jourRelatif } from '@/lib/date'
import { MARQUE_PRIORITE, type Priorite } from '@/lib/enums'
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
    })
  }

  const reporter = (tache: Tache) => {
    demarrer(async () => {
      retirer(tache.id)
      await reporterTache(tache.id, 1)
    })
  }

  if (affichees.length === 0) return <>{vide ?? null}</>

  const jour = aujourdhui()

  return (
    <ul aria-busy={enCours}>
      {affichees.map((tache) => {
        const enRetard = tache.echeance !== null && tache.echeance < jour
        const marque = MARQUE_PRIORITE[(tache.priorite ?? 0) as Priorite]

        return (
          <li
            key={tache.id}
            className={[
              'flex items-center gap-1 border-b border-trait last:border-b-0',
              enRetard ? 'border-l-2 border-l-texte pl-2' : '',
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
              <span className="flex items-baseline gap-2">
                {marque ? (
                  <span aria-hidden className="chiffres shrink-0 text-13">
                    {marque}
                  </span>
                ) : null}
                <span className="truncate text-15">{tache.titre}</span>
              </span>

              <span className="mt-0.5 flex items-baseline gap-2 text-11 text-secondaire">
                {tache.echeance ? (
                  <span className={enRetard ? 'text-texte' : undefined}>
                    {jourRelatif(tache.echeance, jour)}
                  </span>
                ) : null}
                {tache.projetNom ? <span className="truncate">{tache.projetNom}</span> : null}
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
