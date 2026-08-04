import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, decaler, jourSemaineISO, type Jour } from '@/lib/date'

/**
 * Lectures du domaine « habitudes ».
 *
 * Chaque fonction est enveloppée dans `cache()` : deux widgets qui demandent
 * la même chose pendant le même rendu ne déclenchent qu'une seule requête.
 * C'est ce qui permet à chaque widget d'aller chercher ses propres données
 * sans multiplier les allers-retours.
 */

export type Habitude = {
  id: string
  nom: string
  emoji: string | null
  position: number
  joursSemaine: number[]
  demarreeLe: Jour
  archiveeLe: Jour | null
}

export type HabitudeDuJour = Habitude & { cochee: boolean }

export type ScoreJour = {
  jour: Jour
  attendues: number
  cochees: number
  /** `null` quand aucune habitude n'était programmée ce jour-là. */
  score: number | null
}

/** Les habitudes actives, dans l'ordre d'affichage. */
export const habitudesActives = cache(async (): Promise<Habitude[]> => {
  const { data, error } = await supabase()
    .from('habits')
    .select('id, name, emoji, position, days_of_week, started_on, archived_on')
    .is('archived_on', null)
    .order('position')
    .order('created_at')

  if (error) throw error

  return (data ?? []).map((ligne) => ({
    id: ligne.id,
    nom: ligne.name,
    emoji: ligne.emoji,
    position: ligne.position,
    joursSemaine: ligne.days_of_week,
    demarreeLe: ligne.started_on,
    archiveeLe: ligne.archived_on,
  }))
})

/** Toutes les habitudes, archivées comprises — pour l'écran de réglage. */
export const toutesHabitudes = cache(async (): Promise<Habitude[]> => {
  const { data, error } = await supabase()
    .from('habits')
    .select('id, name, emoji, position, days_of_week, started_on, archived_on')
    .order('archived_on', { nullsFirst: true })
    .order('position')

  if (error) throw error

  return (data ?? []).map((ligne) => ({
    id: ligne.id,
    nom: ligne.name,
    emoji: ligne.emoji,
    position: ligne.position,
    joursSemaine: ligne.days_of_week,
    demarreeLe: ligne.started_on,
    archiveeLe: ligne.archived_on,
  }))
})

/**
 * Les habitudes programmées un jour donné, avec leur état de cochage.
 *
 * Le filtrage reprend exactement la règle de la vue `score_habitude_jour` :
 * démarrée, pas encore archivée, et le jour de semaine fait partie du
 * programme. Si les deux divergeaient, l'écran et le score se contrediraient.
 */
export const habitudesDuJour = cache(
  async (jour: Jour = aujourdhui()): Promise<HabitudeDuJour[]> => {
    const jourISO = jourSemaineISO(jour)

    const [habitudes, journal] = await Promise.all([
      supabase()
        .from('habits')
        .select('id, name, emoji, position, days_of_week, started_on, archived_on')
        .lte('started_on', jour)
        .order('position')
        .order('created_at'),
      supabase().from('habit_logs').select('habit_id, done').eq('date', jour),
    ])

    if (habitudes.error) throw habitudes.error
    if (journal.error) throw journal.error

    const coches = new Map(journal.data?.map((l) => [l.habit_id, l.done]))

    return (habitudes.data ?? [])
      .filter(
        (h) =>
          (h.archived_on === null || jour < h.archived_on) &&
          h.days_of_week.includes(jourISO),
      )
      .map((h) => ({
        id: h.id,
        nom: h.name,
        emoji: h.emoji,
        position: h.position,
        joursSemaine: h.days_of_week,
        demarreeLe: h.started_on,
        archiveeLe: h.archived_on,
        cochee: coches.get(h.id) ?? false,
      }))
  },
)

/** Scores d'une plage de jours, du plus ancien au plus récent. */
export const scoresDepuis = cache(async (nbJours: number): Promise<ScoreJour[]> => {
  const debut = decaler(aujourdhui(), -(nbJours - 1))

  const { data, error } = await supabase()
    .from('score_habitude_jour')
    .select('date, attendues, cochees, score')
    .gte('date', debut)
    .order('date')

  if (error) throw error

  return (data ?? []).map((l) => ({
    jour: l.date ?? debut,
    attendues: Number(l.attendues ?? 0),
    cochees: Number(l.cochees ?? 0),
    score: l.score === null ? null : Number(l.score),
  }))
})

/** Le score du jour courant, ou `null` si rien n'était programmé. */
export const scoreDuJour = cache(async (): Promise<ScoreJour | null> => {
  const jour = aujourdhui()
  const { data, error } = await supabase()
    .from('score_habitude_jour')
    .select('date, attendues, cochees, score')
    .eq('date', jour)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    jour,
    attendues: Number(data.attendues ?? 0),
    cochees: Number(data.cochees ?? 0),
    score: data.score === null ? null : Number(data.score),
  }
})

/** La série globale : nombre de jours consécutifs avec au moins une habitude. */
export const serieGlobale = cache(async (): Promise<number> => {
  const { data, error } = await supabase().rpc('serie_globale')
  if (error) throw error
  return Number(data ?? 0)
})

/** Série en cours par habitude, pour l'écran Habitudes. */
export const seriesParHabitude = cache(async (): Promise<Map<string, number>> => {
  const habitudes = await habitudesActives()

  const series = await Promise.all(
    habitudes.map(async (h) => {
      const { data, error } = await supabase().rpc('serie_habitude', { p_habit_id: h.id })
      if (error) throw error
      return [h.id, Number(data ?? 0)] as const
    }),
  )

  return new Map(series)
})
