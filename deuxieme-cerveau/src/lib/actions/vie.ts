'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, maintenant } from '@/lib/date'
import { BUCKET_COUVERTURES } from '@/lib/donnees/vie'

/**
 * Écritures des domaines de la vie personnelle.
 *
 * Rien d'exotique ici : des insertions et des mises à jour. Les deux seuls
 * endroits qui méritent une explication sont la conversion d'un élément
 * d'inbox et le téléversement d'une couverture.
 */

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? '').trim()
}

function liste(brut: string): string[] {
  return brut
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// — Inbox —————————————————————————————————————————————————————————

/**
 * Capturer, sans rien décider.
 *
 * L'inbox existe pour qu'une idée puisse être notée en trois secondes sans
 * choisir si c'est une tâche, une note ou une dépense. Le tri vient après ;
 * l'exiger au moment de la capture, c'est garantir qu'on ne capture pas.
 */
export async function capturer(donnees: FormData): Promise<void> {
  await exigerSession()

  const contenu = texte(donnees, 'contenu')
  if (!contenu) return

  const typeBrut = texte(donnees, 'type')
  const types = ['tache', 'note', 'depense', 'evenement']

  const { error } = await supabase().from('inbox_items').insert({
    content: contenu,
    guessed_type: types.includes(typeBrut) ? typeBrut : null,
  })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/inbox')
}

/**
 * Convertir un élément d'inbox en tâche ou en note.
 *
 * L'élément est marqué traité plutôt que supprimé : on garde la trace de ce
 * qui a été capturé, et « traité » se distingue de « jamais existé ».
 */
export async function convertirInbox(
  id: string,
  vers: 'tache' | 'note',
): Promise<void> {
  await exigerSession()

  const { data, error } = await supabase()
    .from('inbox_items')
    .select('content, processed_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data || data.processed_at) return // idempotent

  if (vers === 'tache') {
    const { error: erreurTache } = await supabase()
      .from('tasks')
      .insert({ title: data.content.slice(0, 200) })
    if (erreurTache) throw erreurTache
  } else {
    const premiereLigne = data.content.split('\n')[0] ?? ''
    const { error: erreurNote } = await supabase().from('notes').insert({
      title: premiereLigne.slice(0, 120),
      content: data.content,
    })
    if (erreurNote) throw erreurNote
  }

  const { error: erreurMarquage } = await supabase()
    .from('inbox_items')
    .update({ processed_at: maintenant() })
    .eq('id', id)

  if (erreurMarquage) throw erreurMarquage

  revalidatePath('/')
  revalidatePath('/inbox')
  revalidatePath(vers === 'tache' ? '/taches' : '/notes')
}

export async function supprimerInbox(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('inbox_items').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/inbox')
}

// — Sport —————————————————————————————————————————————————————————

export async function enregistrerSeance(donnees: FormData): Promise<void> {
  await exigerSession()

  const type = texte(donnees, 'type')
  if (!type) throw new Error('Le type de séance est obligatoire.')

  const duree = Number(texte(donnees, 'duree'))
  const ressenti = Number(texte(donnees, 'ressenti'))

  const { error } = await supabase().from('workouts').insert({
    date: texte(donnees, 'date') || aujourdhui(),
    type,
    muscle_groups: liste(texte(donnees, 'groupes')),
    duration_min: Number.isInteger(duree) && duree > 0 && duree <= 600 ? duree : null,
    feeling: Number.isInteger(ressenti) && ressenti >= 1 && ressenti <= 5 ? ressenti : null,
    notes: texte(donnees, 'notes') || null,
  })

  if (error) throw error
  revalidatePath('/sport')
}

export async function supprimerSeance(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('workouts').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/sport')
}

// — Lectures ——————————————————————————————————————————————————————

const STATUTS_LIVRE = ['a_lire', 'en_cours', 'lu', 'abandonne']

/**
 * Créer ou mettre à jour un livre, couverture comprise.
 *
 * L'image est téléversée sous un nom UUID dans un bucket public. Un bucket
 * privé imposerait des URL signées, qui expirent : `next/image` mettrait en
 * cache une URL morte et la couverture disparaîtrait au bout d'une heure. Une
 * couverture de livre n'est pas un secret.
 */
async function televerserCouverture(fichier: File | null): Promise<string | null> {
  if (!fichier || fichier.size === 0) return null

  if (!fichier.type.startsWith('image/')) {
    throw new Error('La couverture doit être une image.')
  }
  if (fichier.size > 5_000_000) {
    throw new Error('La couverture ne doit pas dépasser 5 Mo.')
  }

  const extension = fichier.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const chemin = `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, '') || 'jpg'}`

  const { error } = await supabase()
    .storage.from(BUCKET_COUVERTURES)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

  if (error) throw new Error(`Téléversement impossible : ${error.message}`)
  return chemin
}

export async function enregistrerLivre(donnees: FormData): Promise<void> {
  await exigerSession()

  const titre = texte(donnees, 'titre')
  if (!titre) throw new Error('Le titre est obligatoire.')

  const statutBrut = texte(donnees, 'statut')
  const statut = STATUTS_LIVRE.includes(statutBrut) ? statutBrut : 'a_lire'

  const noteBrute = Number(texte(donnees, 'note'))
  const note = Number.isInteger(noteBrute) && noteBrute >= 1 && noteBrute <= 5 ? noteBrute : null

  const fichier = donnees.get('couverture')
  const chemin = await televerserCouverture(fichier instanceof File ? fichier : null)

  const champs = {
    title: titre,
    author: texte(donnees, 'auteur') || null,
    category: texte(donnees, 'categorie') || null,
    status: statut,
    rating: note,
    started_on: texte(donnees, 'commence') || null,
    finished_on: texte(donnees, 'fini') || null,
    ...(chemin ? { cover_path: chemin } : {}),
  }

  const id = texte(donnees, 'id')
  const { error } = id
    ? await supabase().from('books').update(champs).eq('id', id)
    : await supabase().from('books').insert(champs)

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/lectures')
}

export async function supprimerLivre(id: string): Promise<void> {
  await exigerSession()

  // La ligne part, l'image reste dans le bucket. C'est délibéré : le
  // stockage est gratuit à cette échelle, et une suppression ratée côté
  // Storage ne doit pas empêcher la suppression côté base.
  const { error } = await supabase().from('books').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/lectures')
}

// — Notes —————————————————————————————————————————————————————————

export async function enregistrerNote(donnees: FormData): Promise<void> {
  await exigerSession()

  const champs = {
    title: texte(donnees, 'titre'),
    content: texte(donnees, 'contenu'),
    tags: liste(texte(donnees, 'tags')),
  }

  if (!champs.title && !champs.content) return

  const id = texte(donnees, 'id')
  const { error } = id
    ? await supabase().from('notes').update(champs).eq('id', id)
    : await supabase().from('notes').insert(champs)

  if (error) throw error
  revalidatePath('/notes')
  if (id) revalidatePath(`/notes/${id}`)
}

export async function enregistrerNoteEtRevenir(donnees: FormData): Promise<void> {
  await enregistrerNote(donnees)
  redirect('/notes')
}

export async function supprimerNote(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('notes').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/notes')
  redirect('/notes')
}

// — Cours —————————————————————————————————————————————————————————

const STATUTS_COURS = ['prevu', 'en_cours', 'termine', 'abandonne']

export async function enregistrerCours(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom est obligatoire.')

  const statutBrut = texte(donnees, 'statut')
  const avancementBrut = Number(texte(donnees, 'avancement'))
  const avancement =
    Number.isFinite(avancementBrut) && avancementBrut >= 0 && avancementBrut <= 100
      ? Math.round(avancementBrut)
      : 0

  const champs = {
    name: nom,
    subject: texte(donnees, 'matiere') || null,
    status: STATUTS_COURS.includes(statutBrut) ? statutBrut : 'prevu',
    resource_url: texte(donnees, 'url') || null,
    progress: avancement,
  }

  const id = texte(donnees, 'id')
  const { error } = id
    ? await supabase().from('courses').update(champs).eq('id', id)
    : await supabase().from('courses').insert(champs)

  if (error) throw error
  revalidatePath('/cours')
}

export async function supprimerCours(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('courses').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/cours')
}

// — Clients ———————————————————————————————————————————————————————

const STATUTS_CLIENT = ['piste', 'actif', 'pause', 'gagne', 'perdu']

export async function enregistrerClient(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom est obligatoire.')

  const statutBrut = texte(donnees, 'statut')
  const valeurBrute = Number(texte(donnees, 'valeur').replace(',', '.'))

  const champs = {
    name: nom,
    status: STATUTS_CLIENT.includes(statutBrut) ? statutBrut : 'piste',
    last_contact: texte(donnees, 'dernierContact') || null,
    next_followup: texte(donnees, 'relance') || null,
    email: texte(donnees, 'email') || null,
    phone: texte(donnees, 'telephone') || null,
    estimated_value_cents: Number.isFinite(valeurBrute)
      ? Math.round(valeurBrute * 100)
      : null,
    notes: texte(donnees, 'notes') || null,
  }

  const id = texte(donnees, 'id')
  const { error } = id
    ? await supabase().from('clients').update(champs).eq('id', id)
    : await supabase().from('clients').insert(champs)

  if (error) throw error
  revalidatePath('/clients')
}

/**
 * « Contacté aujourd'hui » en une tape.
 *
 * C'est le geste qui fait vivre l'alerte de relance : sans lui, il faudrait
 * ouvrir un formulaire et choisir une date, ce qu'on ne fait pas, et l'alerte
 * finirait par crier sur tout le monde en permanence.
 */
export async function marquerContacte(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('clients')
    .update({ last_contact: aujourdhui() })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/clients')
}

export async function supprimerClient(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('clients').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/clients')
}
