import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { decaler, jourDe, maintenant, plage, type Jour } from '@/lib/date'

/**
 * Lectures de l'agenda.
 *
 * C'est le seul domaine qui manipule des instants et non des jours, d'où
 * `timestamptz` en base. Le regroupement par journée se fait ici, en
 * TypeScript, avec `jourDe()` : la requête ratisse un jour de plus de chaque
 * côté en UTC et le tri se referme sur la journée belge. Calculer des bornes
 * UTC à la main serait juste deux fois par an.
 */

export type Evenement = {
  id: string
  titre: string
  debut: string
  fin: string
  journeeEntiere: boolean
  categorie: string | null
  lieu: string | null
}

export type TacheDatee = {
  id: string
  titre: string
  echeance: Jour
  faite: boolean
}

export type JourDAgenda = {
  jour: Jour
  evenements: Evenement[]
  taches: TacheDatee[]
}

const COLONNES = 'id, title, starts_at, ends_at, all_day, category, location'

const evenementsEntre = cache(async (du: Jour, au: Jour): Promise<Evenement[]> => {
  const { data, error } = await supabase()
    .from('events')
    .select(COLONNES)
    .gte('starts_at', `${decaler(du, -1)}T00:00:00Z`)
    .lt('starts_at', `${decaler(au, 2)}T00:00:00Z`)
    .order('starts_at')

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    titre: l.title,
    debut: l.starts_at,
    fin: l.ends_at,
    journeeEntiere: l.all_day,
    categorie: l.category,
    lieu: l.location,
  }))
})

/**
 * Les tâches datées apparaissent dans l'agenda **en lecture seule**.
 *
 * On les coche depuis l'écran Tâches, pas d'ici : l'agenda répond à « qu'est-ce
 * qui m'attend », pas à « qu'est-ce que je fais maintenant ». Mélanger les deux
 * gestes ferait de l'agenda une seconde liste de tâches, moins bonne que la
 * première.
 */
const tachesEntre = cache(async (du: Jour, au: Jour): Promise<TacheDatee[]> => {
  const { data, error } = await supabase()
    .from('tasks')
    .select('id, title, due_date, status')
    .not('due_date', 'is', null)
    .gte('due_date', du)
    .lte('due_date', au)
    .neq('status', 'annule')

  if (error) throw error

  return (data ?? [])
    .filter((l): l is typeof l & { due_date: string } => l.due_date !== null)
    .map((l) => ({
      id: l.id,
      titre: l.title,
      echeance: l.due_date,
      faite: l.status === 'fait',
    }))
})

/** Une plage de jours, chacun avec ses événements et ses tâches. */
export const agendaEntre = cache(
  async (du: Jour, au: Jour): Promise<JourDAgenda[]> => {
    const [evenements, taches] = await Promise.all([
      evenementsEntre(du, au),
      tachesEntre(du, au),
    ])

    return plage(du, au).map((jour) => ({
      jour,
      evenements: evenements.filter((e) => jourDe(e.debut) === jour),
      taches: taches.filter((t) => t.echeance === jour),
    }))
  },
)

/** Les prochains événements, pour le widget du tableau de bord. */
export const prochainsEvenements = cache(
  async (dansNJours = 7): Promise<Evenement[]> => {
    const instant = maintenant()
    const { data, error } = await supabase()
      .from('events')
      .select(COLONNES)
      // Sur `ends_at` et non `starts_at` : un événement en cours doit rester
      // affiché jusqu'à sa fin. Voir disparaître du tableau de bord la réunion
      // à laquelle on assiste est une petite trahison.
      .gte('ends_at', instant)
      .lt('starts_at', `${decaler(jourDe(instant), dansNJours)}T00:00:00Z`)
      .order('starts_at')
      .limit(20)

    if (error) throw error

    return (data ?? []).map((l) => ({
      id: l.id,
      titre: l.title,
      debut: l.starts_at,
      fin: l.ends_at,
      journeeEntiere: l.all_day,
      categorie: l.category,
      lieu: l.location,
    }))
  },
)
