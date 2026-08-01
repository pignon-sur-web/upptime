import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { debutDeSemaine, debutDuMois, decaler, moisSuivant, type Jour } from '@/lib/date'
import { scoresDepuis } from '@/lib/donnees/habitudes'
import { tachesFaitesLe } from '@/lib/donnees/taches'
import { aujourdhui, ecartJours } from '@/lib/date'

/**
 * Lectures du journal.
 *
 * L'entrée du jour est **préremplie** par ce que l'application sait déjà : le
 * score d'habitudes et les tâches terminées. Devant une page blanche, on
 * n'écrit pas ; devant une page qui commence par « aujourd'hui : 4/5 aux
 * habitudes, trois tâches faites », on complète. C'est la seule différence
 * entre un journal tenu et un journal abandonné.
 *
 * Le préremplissage n'est jamais enregistré tel quel : il sert de suggestion
 * dans le champ, et ce qui part en base est ce qui a été validé.
 */

export type EntreeJournal = {
  id: string | null
  jour: Jour
  humeur: number | null
  fait: string
  reporte: string
  libre: string
}

export const entreeDuJour = cache(async (jour: Jour): Promise<EntreeJournal> => {
  const { data, error } = await supabase()
    .from('journal_entries')
    .select('id, date, mood, done_text, carry_over_text, free_note')
    .eq('date', jour)
    .maybeSingle()

  if (error) throw error

  return {
    id: data?.id ?? null,
    jour,
    humeur: data?.mood ?? null,
    fait: data?.done_text ?? '',
    reporte: data?.carry_over_text ?? '',
    libre: data?.free_note ?? '',
  }
})

/**
 * La suggestion pour le champ « ce que j'ai fait », construite à partir des
 * tâches réellement terminées ce jour-là et du score d'habitudes.
 */
export const suggestionDuJour = cache(async (jour: Jour): Promise<string> => {
  const [taches, scores] = await Promise.all([
    tachesFaitesLe(jour),
    // Assez de jours pour couvrir la journée demandée, sans plus.
    scoresDepuis(Math.max(1, ecartJours(jour, aujourdhui()) + 1)),
  ])

  const score = scores.find((s) => s.jour === jour)
  const lignes: string[] = []

  if (score && score.attendues > 0) {
    lignes.push(
      `Habitudes : ${score.cochees}/${score.attendues}` +
        (score.score === null ? '' : ` (${Math.round(score.score * 100)} %)`),
    )
  }

  for (const tache of taches) lignes.push(`— ${tache.titre}`)

  return lignes.join('\n')
})

export const entreesRecentes = cache(
  async (nbJours = 30): Promise<EntreeJournal[]> => {
    const debut = decaler(aujourdhui(), -(nbJours - 1))

    const { data, error } = await supabase()
      .from('journal_entries')
      .select('id, date, mood, done_text, carry_over_text, free_note')
      .gte('date', debut)
      .order('date', { ascending: false })

    if (error) throw error

    return (data ?? []).map((l) => ({
      id: l.id,
      jour: l.date,
      humeur: l.mood,
      fait: l.done_text ?? '',
      reporte: l.carry_over_text ?? '',
      libre: l.free_note ?? '',
    }))
  },
)

export type Bilan = {
  du: Jour
  au: Jour
  /** Moyenne des scores des jours où quelque chose était programmé. */
  scoreMoyen: number | null
  joursRenseignes: number
  tachesFaites: number
  humeurMoyenne: number | null
}

/**
 * Bilan d'une période.
 *
 * Le score moyen ignore les jours sans habitude programmée. Les inclure comme
 * des zéros ferait chuter la moyenne d'une semaine de vacances, ce qui
 * transformerait un repos en échec — exactement l'inverse de ce qu'un bilan
 * doit dire.
 */
async function bilan(du: Jour, au: Jour): Promise<Bilan> {
  const nbJours = ecartJours(du, aujourdhui()) + 1

  const [scores, entrees, taches] = await Promise.all([
    scoresDepuis(Math.max(1, nbJours)),
    entreesRecentes(Math.max(1, nbJours)),
    supabase()
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'fait')
      .gte('done_at', `${decaler(du, -1)}T00:00:00Z`)
      .lt('done_at', `${decaler(au, 2)}T00:00:00Z`),
  ])

  const dansLaPeriode = scores.filter(
    (s) => s.jour >= du && s.jour <= au && s.score !== null,
  )
  const humeurs = entrees
    .filter((e) => e.jour >= du && e.jour <= au && e.humeur !== null)
    .map((e) => e.humeur as number)

  return {
    du,
    au,
    scoreMoyen:
      dansLaPeriode.length === 0
        ? null
        : dansLaPeriode.reduce((somme, s) => somme + (s.score ?? 0), 0) /
          dansLaPeriode.length,
    joursRenseignes: entrees.filter((e) => e.jour >= du && e.jour <= au).length,
    tachesFaites: taches.count ?? 0,
    humeurMoyenne:
      humeurs.length === 0
        ? null
        : humeurs.reduce((somme, h) => somme + h, 0) / humeurs.length,
  }
}

export const bilanHebdo = cache(async (jour: Jour = aujourdhui()): Promise<Bilan> => {
  const lundi = debutDeSemaine(jour)
  return bilan(lundi, decaler(lundi, 6))
})

export const bilanMensuel = cache(async (jour: Jour = aujourdhui()): Promise<Bilan> => {
  const premier = debutDuMois(jour)
  return bilan(premier, decaler(moisSuivant(premier), -1))
})
