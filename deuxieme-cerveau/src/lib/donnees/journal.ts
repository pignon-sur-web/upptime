import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, debutDeSemaine, debutDuMois, decaler, moisSuivant, type Jour } from '@/lib/date'
import { scoresDepuis } from './habitudes'
import { tachesTermineesLe } from './taches'

export type EntreeJournal = {
  jour: Jour
  humeur: number | null
  fait: string | null
  reporte: string | null
  note: string | null
}

export const entreeDuJour = cache(
  async (jour: Jour = aujourdhui()): Promise<EntreeJournal | null> => {
    const { data, error } = await supabase()
      .from('journal_entries')
      .select('date, mood, done_text, carry_over_text, free_note')
      .eq('date', jour)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      jour: data.date,
      humeur: data.mood,
      fait: data.done_text,
      reporte: data.carry_over_text,
      note: data.free_note,
    }
  },
)

/**
 * Le prégarnissage de l'entrée du jour.
 *
 * Le score d'habitudes et les tâches terminées sont *rapportés*, pas
 * recopiés dans les champs : ce sont des faits déjà enregistrés ailleurs, les
 * dupliquer dans le texte les figerait et les ferait diverger. Le champ
 * « fait » ne reçoit que ce qu'on écrit à la main.
 */
export const contexteDuJour = cache(
  async (jour: Jour = aujourdhui()) => {
    const [scores, taches] = await Promise.all([
      scoresDepuis(1),
      tachesTermineesLe(jour),
    ])

    const score = scores.find((s) => s.jour === jour) ?? null

    return {
      score: score?.score ?? null,
      cochees: score?.cochees ?? 0,
      attendues: score?.attendues ?? 0,
      taches: taches.map((t) => t.titre),
    }
  },
)

export const entreesEntre = cache(async (du: Jour, au: Jour): Promise<EntreeJournal[]> => {
  const { data, error } = await supabase()
    .from('journal_entries')
    .select('date, mood, done_text, carry_over_text, free_note')
    .gte('date', du)
    .lte('date', au)
    .order('date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((e) => ({
    jour: e.date,
    humeur: e.mood,
    fait: e.done_text,
    reporte: e.carry_over_text,
    note: e.free_note,
  }))
})

export type Bilan = {
  du: Jour
  au: Jour
  entrees: EntreeJournal[]
  humeurMoyenne: number | null
  scoreMoyen: number | null
  joursRenseignes: number
}

/**
 * Bilan d'une période, dérivé des entrées quotidiennes.
 *
 * Rien n'est stocké : un bilan est une lecture, pas une donnée. Le
 * matérialiser obligerait à le régénérer chaque fois qu'on corrige une entrée.
 */
async function bilan(du: Jour, au: Jour): Promise<Bilan> {
  const [entrees, scores] = await Promise.all([
    entreesEntre(du, au),
    scoresDepuis(Math.max(1, Math.round((Date.parse(au) - Date.parse(du)) / 86_400_000) + 1)),
  ])

  const humeurs = entrees.map((e) => e.humeur).filter((h): h is number => h !== null)
  const pertinents = scores.filter((s) => s.jour >= du && s.jour <= au && s.score !== null)

  return {
    du,
    au,
    entrees,
    humeurMoyenne:
      humeurs.length > 0 ? humeurs.reduce((t, h) => t + h, 0) / humeurs.length : null,
    scoreMoyen:
      pertinents.length > 0
        ? pertinents.reduce((t, s) => t + (s.score ?? 0), 0) / pertinents.length
        : null,
    joursRenseignes: entrees.length,
  }
}

export const bilanHebdomadaire = cache(async (): Promise<Bilan> => {
  const lundi = debutDeSemaine(aujourdhui())
  return bilan(lundi, aujourdhui())
})

export const bilanMensuel = cache(async (): Promise<Bilan> => {
  const premier = debutDuMois(aujourdhui())
  return bilan(premier, decaler(moisSuivant(aujourdhui()), -1))
})
