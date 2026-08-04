import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, decaler, type Jour } from '@/lib/date'
import { STATUTS_OUVERTS, type Ancrage, type Contexte, type Recurrence, type StatutTache } from '@/lib/enums'

export type Tache = {
  id: string
  titre: string
  priorite: number | null
  statut: StatutTache
  echeance: Jour | null
  contexte: Contexte | null
  note: string | null
  projetId: string | null
  projetNom: string | null
  tacheParenteId: string | null
  recurrence: Recurrence | null
  ancrage: Ancrage
  faitLe: string | null
}

const CHAMPS =
  'id, title, priority, status, due_date, context, note, project_id, parent_task_id, recurrence, recurrence_anchor, done_at, projects(name)'

type LigneTache = {
  id: string
  title: string
  priority: number | null
  status: string
  due_date: string | null
  context: string | null
  note: string | null
  project_id: string | null
  parent_task_id: string | null
  recurrence: string | null
  recurrence_anchor: string
  done_at: string | null
  projects: { name: string } | { name: string }[] | null
}

function versTache(ligne: LigneTache): Tache {
  const projet = Array.isArray(ligne.projects) ? ligne.projects[0] : ligne.projects
  return {
    id: ligne.id,
    titre: ligne.title,
    priorite: ligne.priority,
    statut: ligne.status as StatutTache,
    echeance: ligne.due_date,
    contexte: ligne.context as Contexte | null,
    note: ligne.note,
    projetId: ligne.project_id,
    projetNom: projet?.name ?? null,
    tacheParenteId: ligne.parent_task_id,
    recurrence: ligne.recurrence as Recurrence | null,
    ancrage: ligne.recurrence_anchor as Ancrage,
    faitLe: ligne.done_at,
  }
}

/**
 * La vue Aujourd'hui : ce qui est dû aujourd'hui, plus tout ce qui traîne.
 *
 * Les retards sont renvoyés séparément parce qu'ils se rendent différemment —
 * filet vertical de 2px en Encre — et parce que leur widget ne s'affiche que
 * s'il y en a.
 */
export const tachesDuJour = cache(
  async (): Promise<{ dues: Tache[]; retards: Tache[] }> => {
    const jour = aujourdhui()

    const { data, error } = await supabase()
      .from('tasks')
      .select(CHAMPS)
      .in('status', STATUTS_OUVERTS)
      .not('due_date', 'is', null)
      .lte('due_date', jour)
      .order('due_date')
      .order('priority', { nullsFirst: false })

    if (error) throw error

    const taches = (data ?? []).map((l) => versTache(l as unknown as LigneTache))
    return {
      dues: taches.filter((t) => t.echeance === jour),
      retards: taches.filter((t) => t.echeance !== null && t.echeance < jour),
    }
  },
)

/** Les sept prochains jours, groupés par jour. Aujourd'hui n'y figure pas. */
export const septProchainsJours = cache(
  async (): Promise<{ jour: Jour; taches: Tache[] }[]> => {
    const debut = decaler(aujourdhui(), 1)
    const fin = decaler(aujourdhui(), 7)

    const { data, error } = await supabase()
      .from('tasks')
      .select(CHAMPS)
      .in('status', STATUTS_OUVERTS)
      .gte('due_date', debut)
      .lte('due_date', fin)
      .order('due_date')
      .order('priority', { nullsFirst: false })

    if (error) throw error

    const taches = (data ?? []).map((l) => versTache(l as unknown as LigneTache))

    return Array.from({ length: 7 }, (_, i) => decaler(aujourdhui(), i + 1))
      .map((jour) => ({ jour, taches: taches.filter((t) => t.echeance === jour) }))
      .filter((groupe) => groupe.taches.length > 0)
  },
)

export type FiltreTaches = {
  statut?: 'ouvertes' | 'faites' | 'toutes'
  contexte?: Contexte
  projetId?: string
}

/** La vue Toutes, filtrable. */
export const toutesTaches = cache(async (filtre: FiltreTaches = {}): Promise<Tache[]> => {
  let requete = supabase().from('tasks').select(CHAMPS).is('parent_task_id', null)

  if (filtre.statut === 'faites') requete = requete.eq('status', 'fait')
  else if (filtre.statut !== 'toutes') requete = requete.in('status', STATUTS_OUVERTS)

  if (filtre.contexte) requete = requete.eq('context', filtre.contexte)
  if (filtre.projetId) requete = requete.eq('project_id', filtre.projetId)

  const { data, error } = await requete
    .order('due_date', { nullsFirst: false })
    .order('priority', { nullsFirst: false })
    .limit(300)

  if (error) throw error
  return (data ?? []).map((l) => versTache(l as unknown as LigneTache))
})

/** Les sous-tâches d'un lot de tâches, en une seule requête. */
export const sousTachesDe = cache(async (parentIds: string[]): Promise<Map<string, Tache[]>> => {
  if (parentIds.length === 0) return new Map()

  const { data, error } = await supabase()
    .from('tasks')
    .select(CHAMPS)
    .in('parent_task_id', parentIds)
    .order('created_at')

  if (error) throw error

  const parParent = new Map<string, Tache[]>()
  for (const ligne of data ?? []) {
    const tache = versTache(ligne as unknown as LigneTache)
    if (!tache.tacheParenteId) continue
    const liste = parParent.get(tache.tacheParenteId) ?? []
    liste.push(tache)
    parParent.set(tache.tacheParenteId, liste)
  }
  return parParent
})

/** Les tâches terminées un jour donné — le journal s'en sert pour se préremplir. */
export const tachesTermineesLe = cache(async (jour: Jour): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(CHAMPS)
    .eq('status', 'fait')
    .gte('done_at', `${jour}T00:00:00`)
    .lte('done_at', `${jour}T23:59:59.999`)
    .order('done_at')

  if (error) throw error
  return (data ?? []).map((l) => versTache(l as unknown as LigneTache))
})
