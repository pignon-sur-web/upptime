import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { urlSupabase } from '@/lib/env'
import {
  aujourdhui,
  debutDeSemaine,
  decaler,
  ecartJours,
  type Jour,
} from '@/lib/date'

/**
 * Lectures des domaines de la vie personnelle : inbox, sport, lectures,
 * notes, cours, clients.
 *
 * Six petits domaines dans un fichier plutôt que six fichiers de quarante
 * lignes : ils partagent la même forme — une table, une liste, un filtre de
 * statut — et les séparer n'apporterait que des importations.
 */

export const BUCKET_COUVERTURES = 'couvertures'

/**
 * Le bucket est **public**, et les images portent des noms UUID.
 *
 * Un bucket privé imposerait des URL signées, qui expirent : `next/image`
 * mettrait en cache une URL morte et la couverture disparaîtrait au bout d'une
 * heure. Une couverture de livre n'est pas un secret, et un nom UUID la rend
 * indevinable.
 */
export function urlCouverture(chemin: string | null): string | null {
  if (!chemin) return null
  return `${urlSupabase()}/storage/v1/object/public/${BUCKET_COUVERTURES}/${chemin}`
}

// — Inbox —————————————————————————————————————————————————————————

export type ElementInbox = {
  id: string
  contenu: string
  typeDevine: string | null
  traiteLe: string | null
  creeLe: string
}

export const inboxOuverte = cache(async (): Promise<ElementInbox[]> => {
  const { data, error } = await supabase()
    .from('inbox_items')
    .select('id, content, guessed_type, processed_at, created_at')
    .is('processed_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    contenu: l.content,
    typeDevine: l.guessed_type,
    traiteLe: l.processed_at,
    creeLe: l.created_at,
  }))
})

// — Sport —————————————————————————————————————————————————————————

export type Seance = {
  id: string
  jour: Jour
  type: string
  groupes: string[]
  duree: number | null
  ressenti: number | null
  notes: string | null
}

export const seances = cache(async (nbJours = 90): Promise<Seance[]> => {
  const { data, error } = await supabase()
    .from('workouts')
    .select('id, date, type, muscle_groups, duration_min, feeling, notes')
    .gte('date', decaler(aujourdhui(), -nbJours))
    .order('date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    jour: l.date,
    type: l.type,
    groupes: l.muscle_groups,
    duree: l.duration_min,
    ressenti: l.feeling,
    notes: l.notes,
  }))
})

export type VolumeSemaine = { semaine: Jour; seances: number; minutes: number }

/**
 * Le volume des huit dernières semaines.
 *
 * Deux chiffres par semaine — le nombre de séances et les minutes — et rien
 * d'autre : c'est la régularité qu'on surveille, pas la performance.
 */
export const volumeHebdomadaire = cache(async (): Promise<VolumeSemaine[]> => {
  const liste = await seances(56)
  const parSemaine = new Map<string, VolumeSemaine>()

  for (const seance of liste) {
    // Le lundi de la semaine de la séance sert de clé.
    const lundi = debutDeSemaine(seance.jour)
    const courant = parSemaine.get(lundi) ?? { semaine: lundi, seances: 0, minutes: 0 }
    parSemaine.set(lundi, {
      semaine: lundi,
      seances: courant.seances + 1,
      minutes: courant.minutes + (seance.duree ?? 0),
    })
  }

  return [...parSemaine.values()].sort((a, b) => (a.semaine < b.semaine ? -1 : 1))
})

// — Lectures ——————————————————————————————————————————————————————

export type Livre = {
  id: string
  titre: string
  auteur: string | null
  categorie: string | null
  statut: string
  couverture: string | null
  urlCouverture: string | null
  note: number | null
  commenceLe: Jour | null
  finiLe: Jour | null
}

export const livres = cache(async (): Promise<Livre[]> => {
  const { data, error } = await supabase()
    .from('books')
    .select(
      'id, title, author, category, status, cover_path, rating, started_on, finished_on',
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    titre: l.title,
    auteur: l.author,
    categorie: l.category,
    statut: l.status,
    couverture: l.cover_path,
    urlCouverture: urlCouverture(l.cover_path),
    note: l.rating,
    commenceLe: l.started_on,
    finiLe: l.finished_on,
  }))
})

export const lectureEnCours = cache(async (): Promise<Livre | null> => {
  const tous = await livres()
  return tous.find((l) => l.statut === 'en_cours') ?? null
})

// — Notes —————————————————————————————————————————————————————————

export type Note = {
  id: string
  titre: string
  contenu: string
  tags: string[]
  modifieeLe: string
}

const COLONNES_NOTE = 'id, title, content, tags, updated_at'

type LigneNote = {
  id: string
  title: string
  content: string
  tags: string[]
  updated_at: string
}

function convertirNotes(lignes: readonly LigneNote[]): Note[] {
  return lignes.map((l) => ({
    id: l.id,
    titre: l.title,
    contenu: l.content,
    tags: l.tags,
    modifieeLe: l.updated_at,
  }))
}

/**
 * Les notes, avec recherche plein texte française et filtre par tag.
 *
 * La recherche passe par `websearch_to_tsquery` sur la configuration
 * `fr_unaccent` : chercher « resume » trouve « résumé », et les guillemets
 * comme les `-exclusions` tapés au pouce sont tolérés au lieu de provoquer une
 * erreur de syntaxe.
 *
 * Les tags sont volontairement hors du vecteur de recherche — `array_to_string`
 * n'est que STABLE et ne peut pas figurer dans une colonne générée. Ils ont
 * leur propre index GIN, et la combinaison se fait ici.
 */
export const chercherNotes = cache(
  async (recherche?: string, tag?: string): Promise<Note[]> => {
    let requete = supabase().from('notes').select(COLONNES_NOTE)

    if (recherche && recherche.trim()) {
      requete = requete.textSearch('search_vector', recherche.trim(), {
        type: 'websearch',
        config: 'public.fr_unaccent',
      })
    }
    if (tag) requete = requete.contains('tags', [tag])

    const { data, error } = await requete
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return convertirNotes(data ?? [])
  },
)

export const detailNote = cache(async (id: string): Promise<Note | null> => {
  const { data, error } = await supabase()
    .from('notes')
    .select(COLONNES_NOTE)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return convertirNotes([data])[0] ?? null
})

/** Le nuage de tags : chaque tag et son nombre d'occurrences. */
export const tagsDeNotes = cache(async (): Promise<{ tag: string; nb: number }[]> => {
  const { data, error } = await supabase().from('notes').select('tags').limit(1000)
  if (error) throw error

  const comptes = new Map<string, number>()
  for (const ligne of data ?? []) {
    for (const tag of ligne.tags) comptes.set(tag, (comptes.get(tag) ?? 0) + 1)
  }

  return [...comptes.entries()]
    .map(([tag, nb]) => ({ tag, nb }))
    .sort((a, b) => b.nb - a.nb || a.tag.localeCompare(b.tag, 'fr'))
})

// — Cours —————————————————————————————————————————————————————————

export type Cours = {
  id: string
  nom: string
  matiere: string | null
  statut: string
  url: string | null
  avancement: number
}

export const cours = cache(async (): Promise<Cours[]> => {
  const { data, error } = await supabase()
    .from('courses')
    .select('id, name, subject, status, resource_url, progress')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    nom: l.name,
    matiere: l.subject,
    statut: l.status,
    url: l.resource_url,
    avancement: l.progress,
  }))
})

// — Clients ———————————————————————————————————————————————————————

export const SEUIL_RELANCE_JOURS = 30

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
  /** Jours écoulés depuis le dernier contact. `null` s'il n'y en a jamais eu. */
  joursSansContact: number | null
  /** Vrai au-delà de 30 jours sans contact, ou si la relance est échue. */
  aRelancer: boolean
}

/**
 * Les clients, avec l'alerte de relance.
 *
 * Deux façons de mériter une relance : une date de relance échue, ou plus de
 * trente jours sans contact. La seconde attrape ce que la première rate — on
 * oublie de poser une date bien plus souvent qu'on oublie de rappeler.
 */
export const clients = cache(async (tousLesStatuts = false): Promise<Client[]> => {
  let requete = supabase()
    .from('clients')
    .select(
      'id, name, status, last_contact, next_followup, email, phone, estimated_value_cents, notes',
    )

  if (!tousLesStatuts) requete = requete.in('status', ['piste', 'actif', 'pause'])

  const { data, error } = await requete
  if (error) throw error

  const jour = aujourdhui()

  return (data ?? [])
    .map((l) => {
      const joursSansContact =
        l.last_contact === null ? null : ecartJours(l.last_contact, jour)
      const relanceEchue = l.next_followup !== null && l.next_followup <= jour
      const vivant = l.status === 'piste' || l.status === 'actif'

      return {
        id: l.id,
        nom: l.name,
        statut: l.status,
        dernierContact: l.last_contact,
        prochaineRelance: l.next_followup,
        email: l.email,
        telephone: l.phone,
        valeurCents: l.estimated_value_cents,
        notes: l.notes,
        joursSansContact,
        aRelancer:
          vivant &&
          (relanceEchue ||
            joursSansContact === null ||
            joursSansContact > SEUIL_RELANCE_JOURS),
      }
    })
    .sort((a, b) => {
      if (a.aRelancer !== b.aRelancer) return a.aRelancer ? -1 : 1
      return (b.joursSansContact ?? 9999) - (a.joursSansContact ?? 9999)
    })
})
