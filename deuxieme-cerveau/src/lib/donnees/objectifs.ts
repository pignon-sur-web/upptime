import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Jour } from '@/lib/date'

/**
 * Lectures du domaine « objectifs ».
 *
 * La progression vient des vues et non d'un calcul ici, parce que la forme
 * `(actuel − départ) / (cible − départ)` gère gratuitement les résultats clés
 * DÉCROISSANTS : perdre 8 kg, départ 86, cible 78, actuel 82 donne bien 0,5.
 * Un simple `actuel / cible` se tromperait, et se tromperait discrètement.
 *
 * Un objectif sans aucun résultat clé rend `null` — pas `0`. Il n'est pas à
 * zéro, il est indéterminé, et l'interface affiche un tiret.
 */

export type ResultatCle = {
  id: string
  objectifId: string
  nom: string
  unite: string | null
  depart: number
  actuel: number
  cible: number
  position: number
  /** 0 à 1, bornée. */
  progression: number
}

export type Objectif = {
  id: string
  nom: string
  categorie: string | null
  statut: string
  priorite: number | null
  debut: Jour | null
  echeance: Jour | null
  /** `null` si l'objectif n'a aucun résultat clé. */
  progression: number | null
  nbResultats: number
  resultats: ResultatCle[]
}

const COLONNES = 'id, name, category, status, priority, start_date, due_date'

const resultatsParObjectif = cache(async (): Promise<Map<string, ResultatCle[]>> => {
  const { data, error } = await supabase()
    .from('progression_resultat_cle')
    .select(
      'id, goal_id, name, unit, start_value, current_value, target_value, position, progression',
    )
    .order('position')

  if (error) throw error

  const carte = new Map<string, ResultatCle[]>()
  for (const l of data ?? []) {
    if (!l.id || !l.goal_id) continue
    const resultat: ResultatCle = {
      id: l.id,
      objectifId: l.goal_id,
      nom: l.name ?? '',
      unite: l.unit,
      depart: Number(l.start_value ?? 0),
      actuel: Number(l.current_value ?? 0),
      cible: Number(l.target_value ?? 0),
      position: Number(l.position ?? 0),
      progression: Number(l.progression ?? 0),
    }
    carte.set(l.goal_id, [...(carte.get(l.goal_id) ?? []), resultat])
  }
  return carte
})

const progressions = cache(
  async (): Promise<Map<string, { progression: number | null; nb: number }>> => {
    const { data, error } = await supabase()
      .from('progression_objectif')
      .select('goal_id, progression, nb_resultats')

    if (error) throw error

    return new Map(
      (data ?? [])
        .filter((l): l is typeof l & { goal_id: string } => l.goal_id !== null)
        .map((l) => [
          l.goal_id,
          {
            progression: l.progression === null ? null : Number(l.progression),
            nb: Number(l.nb_resultats ?? 0),
          },
        ]),
    )
  },
)

async function convertir(
  lignes: readonly {
    id: string
    name: string
    category: string | null
    status: string
    priority: number | null
    start_date: string | null
    due_date: string | null
  }[],
): Promise<Objectif[]> {
  const [calculs, resultats] = await Promise.all([progressions(), resultatsParObjectif()])

  return lignes.map((l) => ({
    id: l.id,
    nom: l.name,
    categorie: l.category,
    statut: l.status,
    priorite: l.priority,
    debut: l.start_date,
    echeance: l.due_date,
    progression: calculs.get(l.id)?.progression ?? null,
    nbResultats: calculs.get(l.id)?.nb ?? 0,
    resultats: resultats.get(l.id) ?? [],
  }))
}

export const listerObjectifs = cache(
  async (tousLesStatuts = false): Promise<Objectif[]> => {
    let requete = supabase().from('goals').select(COLONNES)
    if (!tousLesStatuts) requete = requete.in('status', ['active', 'pause'])

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

export const detailObjectif = cache(async (id: string): Promise<Objectif | null> => {
  const { data, error } = await supabase()
    .from('goals')
    .select(COLONNES)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return (await convertir([data]))[0] ?? null
})
