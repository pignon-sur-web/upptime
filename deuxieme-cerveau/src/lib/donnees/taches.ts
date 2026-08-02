import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, decaler, jourDe, type Jour } from '@/lib/date'
import { rangPriorite, STATUTS_OUVERTS, type StatutTache } from '@/lib/enums'

/**
 * Lectures du domaine « tâches ».
 *
 * Les jointures sont recomposées ici plutôt que déléguées à l'imbrication
 * PostgREST : le volume est de l'ordre de quelques centaines de lignes, les
 * lectures passent par `cache()` donc le nom des projets n'est demandé qu'une
 * fois par rendu, et on garde des types exacts au lieu des `Relationships`
 * approximatives du client généré.
 */

export type Tache = {
  id: string
  titre: string
  priorite: number | null
  statut: StatutTache
  echeance: Jour | null
  contexte: string | null
  note: string | null
  projetId: string | null
  projetNom: string | null
  parentId: string | null
  recurrence: string | null
  ancrage: string
  lotImport: string | null
  faiteLe: string | null
}

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
  import_batch_id: string | null
  done_at: string | null
}

const COLONNES =
  'id, title, priority, status, due_date, context, note, project_id, parent_task_id, recurrence, recurrence_anchor, import_batch_id, done_at'

/** Le nom des projets, une seule fois par rendu. */
const nomsProjets = cache(async (): Promise<Map<string, string>> => {
  const { data, error } = await supabase().from('projects').select('id, name')
  if (error) throw error
  return new Map((data ?? []).map((p) => [p.id, p.name]))
})

async function convertir(lignes: readonly LigneTache[]): Promise<Tache[]> {
  const noms = lignes.some((l) => l.project_id) ? await nomsProjets() : new Map()

  return lignes.map((l) => ({
    id: l.id,
    titre: l.title,
    priorite: l.priority,
    statut: l.status as StatutTache,
    echeance: l.due_date,
    contexte: l.context,
    note: l.note,
    projetId: l.project_id,
    projetNom: l.project_id ? (noms.get(l.project_id) ?? null) : null,
    parentId: l.parent_task_id,
    recurrence: l.recurrence,
    ancrage: l.recurrence_anchor,
    lotImport: l.import_batch_id,
    faiteLe: l.done_at,
  }))
}

/**
 * L'ordre de lecture d'une liste de tâches, et il est toujours le même :
 * l'échéance la plus proche d'abord, puis la priorité, puis le titre.
 *
 * Les tâches sans échéance passent après celles qui en ont une — non parce
 * qu'elles comptent moins, mais parce qu'une liste triée par date doit se
 * lire de haut en bas sans que le regard revienne en arrière.
 */
function ordonner(taches: Tache[]): Tache[] {
  return taches.sort((a, b) => {
    if (a.echeance !== b.echeance) {
      if (a.echeance === null) return 1
      if (b.echeance === null) return -1
      return a.echeance < b.echeance ? -1 : 1
    }
    const p = rangPriorite(a.priorite) - rangPriorite(b.priorite)
    if (p !== 0) return p
    return a.titre.localeCompare(b.titre, 'fr')
  })
}

/**
 * Aujourd'hui : ce qui est dû aujourd'hui et tout ce qui traîne derrière.
 *
 * Les retards sont dans la même liste et non dans un écran à part : une tâche
 * en retard qu'on ne voit pas en ouvrant l'application est une tâche qu'on ne
 * fera pas. Elle porte un filet de 2px à gauche, c'est tout ce qu'il faut.
 */
export const tachesDuJour = cache(async (): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .in('status', STATUTS_OUVERTS)
    .lte('due_date', aujourdhui())

  if (error) throw error
  return ordonner(await convertir(data ?? []))
})

/**
 * Les tâches ouvertes sans échéance.
 *
 * Elles ont failli ne jamais être affichées nulle part. `tachesDuJour` filtre
 * sur `due_date <= aujourd'hui`, et en SQL une comparaison avec `null` n'est
 * pas fausse : elle est inconnue, donc la ligne ne sort pas. Une tâche notée
 * sans date disparaissait sans le moindre message — elle était bien en base,
 * simplement invisible.
 *
 * Elles forment leur propre liste plutôt que de rejoindre celle du jour, et
 * c'est délibéré : elles ne sont dues aujourd'hui ni ne sont en retard. Les
 * verser dans « aujourd'hui » gonflerait le dénominateur de l'anneau, qui ne
 * se refermerait plus jamais, et transformerait une réserve en dette.
 */
export const tachesSansEcheance = cache(async (): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .in('status', STATUTS_OUVERTS)
    .is('due_date', null)
    .is('parent_task_id', null)

  if (error) throw error
  return ordonner(await convertir(data ?? []))
})

/** Les tâches dont l'échéance est passée. Sous-ensemble strict du jour. */
export const tachesEnRetard = cache(async (): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .in('status', STATUTS_OUVERTS)
    .lt('due_date', aujourdhui())

  if (error) throw error
  return ordonner(await convertir(data ?? []))
})

/** Les sept prochains jours, aujourd'hui exclu — c'est déjà l'autre liste. */
export const tachesSeptJours = cache(async (): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .in('status', STATUTS_OUVERTS)
    .gt('due_date', aujourdhui())
    .lte('due_date', decaler(aujourdhui(), 7))

  if (error) throw error
  return ordonner(await convertir(data ?? []))
})

export type FiltreTaches = {
  statut?: 'ouvertes' | 'faites' | 'toutes'
  projetId?: string
  contexte?: string
  sansEcheance?: boolean
}

/** L'écran « Toutes », avec ses filtres. */
export const listerTaches = cache(
  async (filtre: FiltreTaches = {}): Promise<Tache[]> => {
    let requete = supabase().from('tasks').select(COLONNES).is('parent_task_id', null)

    if (filtre.statut === 'faites') requete = requete.eq('status', 'fait')
    else if (filtre.statut !== 'toutes') requete = requete.in('status', STATUTS_OUVERTS)

    if (filtre.projetId) requete = requete.eq('project_id', filtre.projetId)
    if (filtre.contexte) requete = requete.eq('context', filtre.contexte)
    if (filtre.sansEcheance) requete = requete.is('due_date', null)

    const { data, error } = await requete.limit(500)
    if (error) throw error
    return ordonner(await convertir(data ?? []))
  },
)

/** Les tâches d'un projet, sous-tâches comprises. */
export const tachesDuProjet = cache(async (projetId: string): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .eq('project_id', projetId)

  if (error) throw error
  return ordonner(await convertir(data ?? []))
})

export type TacheDetaillee = Tache & { sousTaches: Tache[]; parent: Tache | null }

export const detailTache = cache(async (id: string): Promise<TacheDetaillee | null> => {
  const [principale, enfants] = await Promise.all([
    supabase().from('tasks').select(COLONNES).eq('id', id).maybeSingle(),
    supabase().from('tasks').select(COLONNES).eq('parent_task_id', id),
  ])

  if (principale.error) throw principale.error
  if (enfants.error) throw enfants.error
  if (!principale.data) return null

  const [tache] = await convertir([principale.data])
  if (!tache) return null

  let parent: Tache | null = null
  if (tache.parentId) {
    const { data } = await supabase()
      .from('tasks')
      .select(COLONNES)
      .eq('id', tache.parentId)
      .maybeSingle()
    parent = data ? ((await convertir([data]))[0] ?? null) : null
  }

  return { ...tache, sousTaches: ordonner(await convertir(enfants.data ?? [])), parent }
})

/**
 * Les tâches terminées un jour donné — le journal du soir les reprend.
 *
 * `done_at` est un instant UTC : la journée belge qu'on cherche déborde d'un
 * côté ou de l'autre selon l'heure d'été. On ratisse donc large en SQL, puis
 * on referme en TypeScript avec `jourDe()`, seul endroit qui connaît le
 * fuseau. Filtrer directement sur des bornes UTC calculées à la main serait
 * juste deux fois par an et faux le reste du temps.
 */
export const tachesFaitesLe = cache(async (jour: Jour): Promise<Tache[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select(COLONNES)
    .eq('status', 'fait')
    .gte('done_at', `${decaler(jour, -1)}T00:00:00Z`)
    .lt('done_at', `${decaler(jour, 2)}T00:00:00Z`)

  if (error) throw error

  const taches = await convertir(data ?? [])
  return ordonner(taches.filter((t) => t.faiteLe !== null && jourDe(t.faiteLe) === jour))
})

/** Le dernier lot importé, pour proposer son annulation juste après coup. */
export const dernierLotImport = cache(
  async (): Promise<{ id: string; source: string | null; nbLignes: number } | null> => {
    const { data, error } = await supabase()
      .from('import_batches')
      .select('id, source, row_count')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return { id: data.id, source: data.source, nbLignes: data.row_count }
  },
)
