import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Jour } from '@/lib/date'
import { STATUTS_PROJET_VIVANTS, type StatutProjet } from '@/lib/enums'

/**
 * Lectures du domaine « projets ».
 *
 * L'avancement vient de la vue `avancement_projet` et non d'un calcul ici :
 * elle exclut les tâches annulées du numérateur comme du dénominateur, et
 * rend `null` — pas `0` — pour un projet sans aucune tâche. Un projet neuf
 * n'est pas à 0 %, il est indéterminé, et l'interface affiche un tiret.
 */

export type Projet = {
  id: string
  nom: string
  statut: StatutProjet
  priorite: number | null
  debut: Jour | null
  echeance: Jour | null
  clientId: string | null
  /** 0 à 1, ou `null` si le projet n'a aucune tâche. */
  avancement: number | null
  tachesTotal: number
  tachesFaites: number
  /** Négatif quand l'échéance est passée. `null` s'il n'y en a pas. */
  joursRestants: number | null
}

type LigneProjet = {
  id: string
  name: string
  status: string
  priority: number | null
  start_date: string | null
  due_date: string | null
  client_id: string | null
}

const COLONNES = 'id, name, status, priority, start_date, due_date, client_id'

/** L'avancement de tous les projets, en une requête. */
const avancements = cache(
  async (): Promise<
    Map<string, { avancement: number | null; total: number; faites: number; jours: number | null }>
  > => {
    const { data, error } = await supabase()
      .from('avancement_projet')
      .select('project_id, avancement, taches_total, taches_faites, jours_restants')

    if (error) throw error

    return new Map(
      (data ?? [])
        .filter((l): l is typeof l & { project_id: string } => l.project_id !== null)
        .map((l) => [
          l.project_id,
          {
            avancement: l.avancement === null ? null : Number(l.avancement),
            total: Number(l.taches_total ?? 0),
            faites: Number(l.taches_faites ?? 0),
            jours: l.jours_restants === null ? null : Number(l.jours_restants),
          },
        ]),
    )
  },
)

async function convertir(lignes: readonly LigneProjet[]): Promise<Projet[]> {
  const calculs = await avancements()

  return lignes.map((l) => {
    const calcul = calculs.get(l.id)
    return {
      id: l.id,
      nom: l.name,
      statut: l.status as StatutProjet,
      priorite: l.priority,
      debut: l.start_date,
      echeance: l.due_date,
      clientId: l.client_id,
      avancement: calcul?.avancement ?? null,
      tachesTotal: calcul?.total ?? 0,
      tachesFaites: calcul?.faites ?? 0,
      joursRestants: calcul?.jours ?? null,
    }
  })
}

/**
 * Les projets, les vivants d'abord.
 *
 * Le tri met en tête ce qui a une échéance proche : un projet daté réclame une
 * décision, un projet sans date attend qu'on la prenne.
 */
export const listerProjets = cache(
  async (tousLesStatuts = false): Promise<Projet[]> => {
    let requete = supabase().from('projects').select(COLONNES)
    if (!tousLesStatuts) requete = requete.in('status', STATUTS_PROJET_VIVANTS)

    const { data, error } = await requete
    if (error) throw error

    return (await convertir(data ?? [])).sort((a, b) => {
      if (a.echeance !== b.echeance) {
        if (a.echeance === null) return 1
        if (b.echeance === null) return -1
        return a.echeance < b.echeance ? -1 : 1
      }
      return a.nom.localeCompare(b.nom, 'fr')
    })
  },
)

export const detailProjet = cache(async (id: string): Promise<Projet | null> => {
  const { data, error } = await supabase()
    .from('projects')
    .select(COLONNES)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return (await convertir([data]))[0] ?? null
})

/** Le menu « Projet » des formulaires : juste un identifiant et un nom. */
export const optionsProjets = cache(
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
