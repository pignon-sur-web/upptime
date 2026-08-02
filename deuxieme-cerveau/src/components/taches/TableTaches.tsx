'use client'

import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Case } from '@/components/ui/Case'
import { BadgePriorite } from '@/components/ui/Badge'
import { completerTache } from '@/lib/actions/taches'
import type { Tache } from '@/lib/donnees/taches'

/**
 * Les tâches en table : case, priorité, titre.
 *
 * C'est la forme du tableau de bord, et elle coexiste avec `ListeTaches` sans
 * la remplacer. Les deux ne répondent pas à la même question. Une liste répond
 * à « qu'est-ce que je fais maintenant » : le titre respire, l'échéance et le
 * projet sont en second niveau, et on peut reporter d'un tap. Une table répond
 * à « qu'est-ce qui m'attend » : la colonne de priorités s'aligne, l'œil la
 * descend, et deux tâches urgentes se repèrent sans lire un mot.
 *
 * Un seul geste ici, cocher. Reporter appartient à l'écran Tâches — un tableau
 * de bord qu'on peut trop manipuler devient un écran de travail, et on ne le
 * consulte plus en dix secondes.
 *
 * `table-fixed` n'est pas décoratif : sans lui, un titre long ferait grossir sa
 * colonne au-delà de la carte et pousserait la page en débordement horizontal.
 */
export function TableTaches({
  taches,
  vide,
}: {
  taches: Tache[]
  vide?: React.ReactNode
}) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()
  const [retirees, retirer] = useOptimistic<string[], string>(
    [],
    (etat, id) => [...etat, id],
  )

  const affichees = taches.filter((t) => !retirees.includes(t.id))
  if (affichees.length === 0) return <>{vide ?? null}</>

  const cocher = (tache: Tache) => {
    demarrer(async () => {
      retirer(tache.id)
      await completerTache(tache.id)
      // Vide le cache de navigation : sans ça, l'accueil resservirait la liste
      // d'avant en revenant par la barre d'onglets.
      routeur.refresh()
    })
  }

  return (
    <table className="w-full table-fixed" aria-busy={enCours}>
      <thead>
        <tr className="border-b border-trait text-left text-11 text-secondaire">
          <th scope="col" className="w-11 pb-1 font-normal">
            <span className="sr-only">Fait</span>
          </th>
          {/* La colonne disparaît sous 640 px : « Urgent et important » ne tient
              pas à côté d'un titre sur un écran de 390 px, et la pastille seule
              ne dirait pas de quoi elle parle. Les priorités restent lisibles
              sur l'écran Tâches, qui a la place. */}
          <th scope="col" className="hidden w-40 pb-1 font-normal sm:table-cell">
            Priorité
          </th>
          <th scope="col" className="pb-1 font-normal">
            Tâche
          </th>
        </tr>
      </thead>
      <tbody>
        {affichees.map((tache) => (
          <tr key={tache.id} className="border-b border-trait last:border-b-0">
            <td className="align-middle">
              <Case
                cochee={false}
                onToggle={() => cocher(tache)}
                libelle={`Terminer : ${tache.titre}`}
              />
            </td>
            <td className="hidden align-middle sm:table-cell">
              <BadgePriorite priorite={tache.priorite} />
            </td>
            <td className="align-middle">
              <Link
                href={`/taches/${tache.id}`}
                prefetch={false}
                className="block truncate py-2 text-15"
              >
                {tache.titre}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
