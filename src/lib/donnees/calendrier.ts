import 'server-only'

import { supabase } from '@/lib/supabase/client'
import { aujourdhui, decaler } from '@/lib/date'
import type { EvenementICS } from '@/lib/ics'

/**
 * Ce que le flux de calendrier expose.
 *
 * Trois sources, et rien d'autre : les événements de l'agenda, les tâches
 * datées encore ouvertes, les échéances de paiement non réglées.
 *
 * Ce qui n'y est **pas**, délibérément : les montants, les notes, les soldes,
 * les habitudes. Le jeton de l'URL protège le flux, mais un lien de calendrier
 * finit toujours par traîner quelque part — dans les réglages d'un téléphone
 * prêté, dans une capture d'écran. Il ne doit donc rien contenir qu'on
 * regretterait d'y avoir mis. Un titre et une date suffisent à faire sonner
 * une alerte, et c'est tout ce qu'on demande à ce flux.
 *
 * Les échéances de paiement font exception à moitié : leur nom apparaît
 * (« Loyer »), leur montant non.
 */

/** Un mois en arrière suffit à garder le contexte, un an en avant à couvrir l'agenda. */
const JOURS_PASSES = 30
const JOURS_FUTURS = 365

export async function evenementsDuFlux(): Promise<EvenementICS[]> {
  const debut = decaler(aujourdhui(), -JOURS_PASSES)
  const fin = decaler(aujourdhui(), JOURS_FUTURS)

  const [evenements, taches, echeances] = await Promise.all([
    supabase()
      .from('events')
      .select('id, title, starts_at, ends_at, all_day, category, location')
      .gte('starts_at', `${debut}T00:00:00Z`)
      .lte('starts_at', `${fin}T00:00:00Z`)
      .order('starts_at'),
    supabase()
      .from('tasks')
      .select('id, title, due_date, status')
      .not('due_date', 'is', null)
      .in('status', ['a_faire', 'en_cours'])
      .gte('due_date', debut)
      .lte('due_date', fin),
    supabase()
      .from('upcoming_payments')
      .select('id, name, due_date, paid_at')
      .is('paid_at', null)
      .gte('due_date', debut)
      .lte('due_date', fin),
  ])

  if (evenements.error) throw evenements.error
  if (taches.error) throw taches.error
  if (echeances.error) throw echeances.error

  const flux: EvenementICS[] = []

  for (const e of evenements.data ?? []) {
    flux.push({
      id: `evenement-${e.id}`,
      titre: e.title,
      debut: e.all_day ? null : e.starts_at,
      fin: e.all_day ? null : e.ends_at,
      jour: e.all_day ? e.starts_at.slice(0, 10) : undefined,
      lieu: e.location,
      categorie: e.category,
      // Un quart d'heure : le temps de ranger ses affaires, pas celui de
      // recevoir une alerte qu'on aura oubliée avant l'heure.
      alerteMinutes: e.all_day ? null : 15,
    })
  }

  for (const t of taches.data ?? []) {
    if (!t.due_date) continue
    flux.push({
      id: `tache-${t.id}`,
      titre: `☐ ${t.title}`,
      debut: null,
      fin: null,
      jour: t.due_date,
      categorie: 'Tâche',
      // Pas d'alerte sur une tâche datée : elle sonnerait à minuit, et une
      // journée entière n'a pas d'heure à laquelle prévenir. La tâche se coche
      // dans l'application, le calendrier ne fait que la montrer.
      alerteMinutes: null,
    })
  }

  for (const e of echeances.data ?? []) {
    flux.push({
      id: `echeance-${e.id}`,
      // Le nom, jamais le montant : ce flux peut être lu par qui a l'URL.
      titre: `€ ${e.name}`,
      debut: null,
      fin: null,
      jour: e.due_date,
      categorie: 'Échéance',
      alerteMinutes: null,
    })
  }

  return flux
}
