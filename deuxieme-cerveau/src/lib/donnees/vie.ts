import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, debutDeSemaine, decaler, type Jour } from '@/lib/date'
import type { StatutObjectif } from '@/lib/enums'

// — Objectifs et résultats clés ————————————————————————————————

export type ResultatCle = {
  id: string
  nom: string
  unite: string | null
  depart: number
  actuel: number
  cible: number
  progression: number
}

export type Objectif = {
  id: string
  nom: string
  categorie: string | null
  statut: StatutObjectif
  echeance: Jour | null
  /** `null` quand l'objectif n'a aucun résultat clé : indéterminé, pas 0 %. */
  progression: number | null
  resultats: ResultatCle[]
}

export const objectifs = cache(async (): Promise<Objectif[]> => {
  const [buts, resultats, progressions] = await Promise.all([
    supabase()
      .from('goals')
      .select('id, name, category, status, due_date, priority')
      .order('status')
      .order('priority', { nullsFirst: false }),
    supabase()
      .from('progression_resultat_cle')
      .select('id, goal_id, name, unit, start_value, current_value, target_value, position, progression')
      .order('position'),
    supabase().from('progression_objectif').select('goal_id, progression, nb_resultats'),
  ])

  if (buts.error) throw buts.error
  if (resultats.error) throw resultats.error
  if (progressions.error) throw progressions.error

  const parObjectif = new Map((progressions.data ?? []).map((p) => [p.goal_id, p]))

  return (buts.data ?? []).map((but) => ({
    id: but.id,
    nom: but.name,
    categorie: but.category,
    statut: but.status as StatutObjectif,
    echeance: but.due_date,
    progression: (() => {
      const p = parObjectif.get(but.id)?.progression
      return p === null || p === undefined ? null : Number(p)
    })(),
    resultats: (resultats.data ?? [])
      .filter((r) => r.goal_id === but.id)
      .map((r) => ({
        id: r.id as string,
        nom: r.name ?? '',
        unite: r.unit,
        depart: Number(r.start_value ?? 0),
        actuel: Number(r.current_value ?? 0),
        cible: Number(r.target_value ?? 0),
        progression: Number(r.progression ?? 0),
      })),
  }))
})

export const objectifsEnCours = cache(async (): Promise<Objectif[]> => {
  return (await objectifs()).filter((o) => o.statut === 'active')
})

// — Agenda ————————————————————————————————————————————————————————

export type Evenement = {
  id: string
  titre: string
  debut: string
  fin: string
  journeeEntiere: boolean
  categorie: string | null
  lieu: string | null
}

export const evenementsEntre = cache(async (du: Jour, au: Jour): Promise<Evenement[]> => {
  const { data, error } = await supabase()
    .from('events')
    .select('id, title, starts_at, ends_at, all_day, category, location')
    .gte('starts_at', `${du}T00:00:00Z`)
    .lte('starts_at', `${au}T23:59:59Z`)
    .order('starts_at')

  if (error) throw error

  return (data ?? []).map((e) => ({
    id: e.id,
    titre: e.title,
    debut: e.starts_at,
    fin: e.ends_at,
    journeeEntiere: e.all_day,
    categorie: e.category,
    lieu: e.location,
  }))
})

export const prochainsEvenements = cache(async (combien = 3): Promise<Evenement[]> => {
  const { data, error } = await supabase()
    .from('events')
    .select('id, title, starts_at, ends_at, all_day, category, location')
    .gte('starts_at', `${aujourdhui()}T00:00:00Z`)
    .order('starts_at')
    .limit(combien)

  if (error) throw error

  return (data ?? []).map((e) => ({
    id: e.id,
    titre: e.title,
    debut: e.starts_at,
    fin: e.ends_at,
    journeeEntiere: e.all_day,
    categorie: e.category,
    lieu: e.location,
  }))
})

// — Inbox ————————————————————————————————————————————————————————

export type ElementInbox = {
  id: string
  contenu: string
  typeDevine: string | null
  creeLe: string
}

export const inboxNonTriee = cache(async (): Promise<ElementInbox[]> => {
  const { data, error } = await supabase()
    .from('inbox_items')
    .select('id, content, guessed_type, created_at')
    .is('processed_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((i) => ({
    id: i.id,
    contenu: i.content,
    typeDevine: i.guessed_type,
    creeLe: i.created_at,
  }))
})

// — Sport ————————————————————————————————————————————————————————

export type Seance = {
  id: string
  jour: Jour
  type: string
  groupes: string[]
  minutes: number | null
  ressenti: number | null
  notes: string | null
}

export const seances = cache(async (limite = 60): Promise<Seance[]> => {
  const { data, error } = await supabase()
    .from('workouts')
    .select('id, date, type, muscle_groups, duration_min, feeling, notes')
    .order('date', { ascending: false })
    .limit(limite)

  if (error) throw error

  return (data ?? []).map((s) => ({
    id: s.id,
    jour: s.date,
    type: s.type,
    groupes: s.muscle_groups,
    minutes: s.duration_min,
    ressenti: s.feeling,
    notes: s.notes,
  }))
})

/** Le volume de la semaine en cours : nombre de séances et minutes totales. */
export const volumeHebdomadaire = cache(
  async (): Promise<{ seances: number; minutes: number }> => {
    const lundi = debutDeSemaine(aujourdhui())

    const { data, error } = await supabase()
      .from('workouts')
      .select('duration_min')
      .gte('date', lundi)
      .lte('date', aujourdhui())

    if (error) throw error

    return {
      seances: data?.length ?? 0,
      minutes: (data ?? []).reduce((total, s) => total + (s.duration_min ?? 0), 0),
    }
  },
)

// — Lectures ————————————————————————————————————————————————————

export type Livre = {
  id: string
  titre: string
  auteur: string | null
  statut: string
  couverture: string | null
  note: number | null
}

export const livres = cache(async (): Promise<Livre[]> => {
  const { data, error } = await supabase()
    .from('books')
    .select('id, title, author, status, cover_path, rating')
    .order('status')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    titre: l.title,
    auteur: l.author,
    statut: l.status,
    couverture: l.cover_path,
    note: l.rating,
  }))
})

export const livresEnCours = cache(async (): Promise<Livre[]> => {
  return (await livres()).filter((l) => l.statut === 'en_cours')
})

// — Notes ————————————————————————————————————————————————————————

export type Note = {
  id: string
  titre: string
  contenu: string
  tags: string[]
  modifieeLe: string
}

export const notes = cache(async (limite = 100): Promise<Note[]> => {
  const { data, error } = await supabase()
    .from('notes')
    .select('id, title, content, tags, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limite)

  if (error) throw error

  return (data ?? []).map((n) => ({
    id: n.id,
    titre: n.title,
    contenu: n.content,
    tags: n.tags,
    modifieeLe: n.updated_at,
  }))
})

/**
 * Recherche plein texte française.
 *
 * `websearch_to_tsquery` plutôt que `plainto_tsquery` : il tolère les
 * guillemets et les exclusions en `-mot` qu'on tape naturellement, là où
 * l'autre échoue sur une apostrophe. La configuration `fr_unaccent` fait que
 * chercher « resume » trouve « résumé ».
 */
export const chercherNotes = cache(async (question: string): Promise<Note[]> => {
  const propre = question.trim()
  if (!propre) return notes(30)

  const { data, error } = await supabase()
    .from('notes')
    .select('id, title, content, tags, updated_at')
    .textSearch('search_vector', propre, {
      config: 'public.fr_unaccent',
      type: 'websearch',
    })
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map((n) => ({
    id: n.id,
    titre: n.title,
    contenu: n.content,
    tags: n.tags,
    modifieeLe: n.updated_at,
  }))
})

// — Cours ————————————————————————————————————————————————————————

export type Cours = {
  id: string
  nom: string
  matiere: string | null
  statut: string
  lien: string | null
  progression: number
}

export const cours = cache(async (): Promise<Cours[]> => {
  const { data, error } = await supabase()
    .from('courses')
    .select('id, name, subject, status, resource_url, progress')
    .order('status')
    .order('name')

  if (error) throw error

  return (data ?? []).map((c) => ({
    id: c.id,
    nom: c.name,
    matiere: c.subject,
    statut: c.status,
    lien: c.resource_url,
    progression: c.progress,
  }))
})

// — Clients ————————————————————————————————————————————————————

export type Client = {
  id: string
  nom: string
  statut: string
  dernierContact: Jour | null
  prochaineRelance: Jour | null
  email: string | null
  telephone: string | null
  valeurCents: number | null
  notes: string | null
  /** Vrai au-delà de 30 jours sans contact : l'alerte visuelle du cahier des charges. */
  aRelancer: boolean
}

export const clients = cache(async (): Promise<Client[]> => {
  const { data, error } = await supabase()
    .from('clients')
    .select('id, name, status, last_contact, next_followup, email, phone, estimated_value_cents, notes')
    .order('status')
    .order('next_followup', { nullsFirst: false })

  if (error) throw error

  const limite = decaler(aujourdhui(), -30)

  return (data ?? []).map((c) => ({
    id: c.id,
    nom: c.name,
    statut: c.status,
    dernierContact: c.last_contact,
    prochaineRelance: c.next_followup,
    email: c.email,
    telephone: c.phone,
    valeurCents: c.estimated_value_cents,
    notes: c.notes,
    aRelancer:
      (c.status === 'piste' || c.status === 'actif') &&
      (c.last_contact === null || c.last_contact < limite),
  }))
})
