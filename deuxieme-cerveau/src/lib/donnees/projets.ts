import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Jour } from '@/lib/date'
import type { StatutProjet } from '@/lib/enums'

export type Projet = {
  id: string
  nom: string
  statut: StatutProjet
  priorite: number | null
  debut: Jour | null
  echeance: Jour | null
  clientId: string | null
  /** `null` quand le projet n'a aucune tâche : indéterminé, pas 0 %. */
  avancement: number | null
  tachesTotal: number
  tachesFaites: number
  joursRestants: number | null
}

/**
 * Les projets, avec leur avancement.
 *
 * L'avancement et les jours restants viennent de la vue `avancement_projet`,
 * jamais d'un calcul refait ici : c'est elle qui décide qu'une tâche annulée
 * sort du numérateur ET du dénominateur, et qu'un projet sans tâche vaut
 * `null` plutôt que zéro.
 */
export const projets = cache(async (): Promise<Projet[]> => {
  const [lignes, avancements] = await Promise.all([
    supabase()
      .from('projects')
      .select('id, name, status, priority, start_date, due_date, client_id')
      .order('status')
      .order('priority', { nullsFirst: false })
      .order('due_date', { nullsFirst: false }),
    supabase()
      .from('avancement_projet')
      .select('project_id, avancement, taches_total, taches_faites, jours_restants'),
  ])

  if (lignes.error) throw lignes.error
  if (avancements.error) throw avancements.error

  const parProjet = new Map(
    (avancements.data ?? []).map((a) => [a.project_id, a]),
  )

  return (lignes.data ?? []).map((p) => {
    const a = parProjet.get(p.id)
    return {
      id: p.id,
      nom: p.name,
      statut: p.status as StatutProjet,
      priorite: p.priority,
      debut: p.start_date,
      echeance: p.due_date,
      clientId: p.client_id,
      avancement: a?.avancement === null || a?.avancement === undefined ? null : Number(a.avancement),
      tachesTotal: Number(a?.taches_total ?? 0),
      tachesFaites: Number(a?.taches_faites ?? 0),
      joursRestants:
        a?.jours_restants === null || a?.jours_restants === undefined
          ? null
          : Number(a.jours_restants),
    }
  })
})

export const projetsEnCours = cache(async (): Promise<Projet[]> => {
  const tous = await projets()
  return tous.filter((p) => p.statut === 'active')
})

/** Liste réduite pour les menus déroulants des formulaires. */
export const projetsPourChoix = cache(
  async (): Promise<{ id: string; nom: string }[]> => {
    const { data, error } = await supabase()
      .from('projects')
      .select('id, name')
      .in('status', ['idee', 'active', 'pause'])
      .order('name')

    if (error) throw error
    return (data ?? []).map((p) => ({ id: p.id, nom: p.name }))
  },
)
