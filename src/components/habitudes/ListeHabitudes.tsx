'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Case } from '@/components/ui/Case'
import { basculerHabitude } from '@/lib/actions/habitudes'
import type { HabitudeDuJour } from '@/lib/donnees/habitudes'
import type { Jour } from '@/lib/date'

/**
 * La liste cochable.
 *
 * `useOptimistic` est ce qui rend le geste crédible : la case se remplit à
 * l'instant du tap, sans attendre l'aller-retour serveur. Sur un téléphone en
 * 4G médiocre, attendre la réponse donnerait l'impression que le tap n'a pas
 * été pris, et on taperait deux fois — d'où l'upsert idempotent côté action.
 *
 * Si l'écriture échoue, React rétablit l'état précédent tout seul à la fin de
 * la transition : la case se vide, ce qui est le bon retour.
 */
export function ListeHabitudes({
  habitudes,
  jour,
  modifiable = true,
}: {
  habitudes: HabitudeDuJour[]
  jour: Jour
  modifiable?: boolean
}) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()
  const [affichees, basculerLocalement] = useOptimistic(
    habitudes,
    (etat: HabitudeDuJour[], id: string) =>
      etat.map((h) => (h.id === id ? { ...h, cochee: !h.cochee } : h)),
  )

  const basculer = (habitude: HabitudeDuJour) => {
    demarrer(async () => {
      basculerLocalement(habitude.id)
      await basculerHabitude(habitude.id, jour, !habitude.cochee)
      // `revalidatePath` côté serveur ne suffit pas : le navigateur garde en
      // mémoire les pages déjà visitées, et l'accueil affichait encore
      // l'ancien score quand on y revenait par la barre d'onglets. Le geste
      // central de l'application semblait alors sans effet.
      routeur.refresh()
    })
  }

  return (
    <ul aria-busy={enCours}>
      {affichees.map((habitude) => (
        <li
          key={habitude.id}
          className="flex items-center gap-3 border-b border-trait last:border-b-0"
        >
          <Case
            cochee={habitude.cochee}
            onToggle={() => basculer(habitude)}
            libelle={habitude.nom}
            disabled={!modifiable}
          />
          <span className="flex min-w-0 flex-1 items-center gap-2 py-2">
            {habitude.emoji ? (
              <span aria-hidden className="text-15">
                {habitude.emoji}
              </span>
            ) : null}
            <span className="truncate text-15">{habitude.nom}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
