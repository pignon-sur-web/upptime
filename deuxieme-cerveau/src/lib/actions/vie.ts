'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { versCents } from '@/lib/argent'
import { aujourdhui, type Jour } from '@/lib/date'

function rafraichir(...chemins: string[]) {
  revalidatePath('/')
  for (const chemin of chemins) revalidatePath(chemin)
}

// — Journal ————————————————————————————————————————————————————

/**
 * L'entrée du jour, en upsert sur la date.
 *
 * `journal_entries.date` est unique : une entrée par jour, et enregistrer deux
 * fois le même jour corrige au lieu d'empiler.
 */
export async function enregistrerJournal(jour: Jour, donnees: FormData): Promise<void> {
  await exigerSession()

  const humeur = Number(donnees.get('humeur'))

  const { error } = await supabase().from('journal_entries').upsert(
    {
      date: jour,
      mood: humeur >= 1 && humeur <= 5 ? humeur : null,
      done_text: String(donnees.get('fait') ?? '').trim() || null,
      carry_over_text: String(donnees.get('reporte') ?? '').trim() || null,
      free_note: String(donnees.get('note') ?? '').trim() || null,
    },
    { onConflict: 'date' },
  )

  if (error) throw error
  rafraichir('/journal')
}

// — Objectifs ————————————————————————————————————————————————————

export async function creerObjectif(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const { error } = await supabase().from('goals').insert({
    name: nom,
    category: String(donnees.get('categorie') ?? '').trim() || null,
    due_date: String(donnees.get('echeance') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir('/objectifs')
}

export async function creerResultatCle(objectifId: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const depart = Number(donnees.get('depart') ?? 0)
  const cible = Number(donnees.get('cible'))
  if (!Number.isFinite(cible)) throw new Error('La cible est obligatoire.')

  const { error } = await supabase().from('key_results').insert({
    goal_id: objectifId,
    name: nom,
    unit: String(donnees.get('unite') ?? '').trim() || null,
    start_value: depart,
    current_value: depart,
    target_value: cible,
  })

  if (error) throw error
  rafraichir('/objectifs')
}

/** Met à jour la valeur atteinte. La progression est recalculée par la vue. */
export async function majResultatCle(resultatId: string, valeur: number): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('key_results')
    .update({ current_value: valeur })
    .eq('id', resultatId)

  if (error) throw error
  rafraichir('/objectifs')
}

// — Agenda ————————————————————————————————————————————————————

export async function creerEvenement(donnees: FormData): Promise<void> {
  await exigerSession()

  const titre = String(donnees.get('titre') ?? '').trim()
  if (!titre) throw new Error('Le titre est obligatoire.')

  const debut = String(donnees.get('debut') ?? '')
  const fin = String(donnees.get('fin') ?? '') || debut
  if (!debut) throw new Error('La date de début est obligatoire.')

  const { error } = await supabase().from('events').insert({
    title: titre,
    starts_at: new Date(debut).toISOString(),
    ends_at: new Date(fin).toISOString(),
    all_day: donnees.get('journeeEntiere') === 'on',
    category: String(donnees.get('categorie') ?? '').trim() || null,
    location: String(donnees.get('lieu') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir('/agenda')
}

export async function supprimerEvenement(id: string): Promise<void> {
  await exigerSession()
  const { error } = await supabase().from('events').delete().eq('id', id)
  if (error) throw error
  rafraichir('/agenda')
}

// — Inbox ————————————————————————————————————————————————————————

/**
 * Capture. Un champ, un bouton, rien d'autre.
 *
 * Le type est deviné mais jamais imposé : la devinette ne sert qu'à
 * pré-sélectionner le bouton de conversion. Se tromper doit être sans
 * conséquence, sinon la capture cesse d'être rapide.
 */
export async function capturer(donnees: FormData): Promise<void> {
  await exigerSession()

  const contenu = String(donnees.get('contenu') ?? '').trim()
  if (!contenu) return

  const { error } = await supabase().from('inbox_items').insert({
    content: contenu,
    guessed_type: deviner(contenu),
  })

  if (error) throw error
  rafraichir('/inbox')
}

function deviner(contenu: string): 'tache' | 'note' | 'depense' | 'evenement' | null {
  const texte = contenu.toLowerCase()
  if (/\d+[.,]?\d*\s*(€|eur|euros)/.test(texte)) return 'depense'
  if (/\b(rdv|rendez-vous|réunion|reunion|à \d{1,2}h|le \d{1,2}\/\d{1,2})\b/.test(texte)) return 'evenement'
  if (/^(appeler|faire|acheter|envoyer|relancer|préparer|prevoir|prévoir|répondre)/.test(texte)) return 'tache'
  return contenu.length > 120 ? 'note' : null
}

/** Convertit un élément capturé, puis le marque traité. */
export async function convertirInbox(
  elementId: string,
  vers: 'tache' | 'note' | 'depense' | 'evenement',
  contexte: { compteId?: string; montant?: string } = {},
): Promise<void> {
  await exigerSession()

  const { data, error: lecture } = await supabase()
    .from('inbox_items')
    .select('id, content')
    .eq('id', elementId)
    .maybeSingle()

  if (lecture) throw lecture
  if (!data) throw new Error('Élément introuvable.')

  const contenu = data.content

  if (vers === 'tache') {
    const { error } = await supabase().from('tasks').insert({ title: contenu })
    if (error) throw error
  } else if (vers === 'note') {
    const { error } = await supabase()
      .from('notes')
      .insert({ title: contenu.slice(0, 80), content: contenu })
    if (error) throw error
  } else if (vers === 'evenement') {
    const debut = new Date(`${aujourdhui()}T09:00:00`)
    const { error } = await supabase().from('events').insert({
      title: contenu,
      starts_at: debut.toISOString(),
      ends_at: new Date(debut.getTime() + 3_600_000).toISOString(),
      all_day: false,
    })
    if (error) throw error
  } else {
    const cents = versCents(contexte.montant ?? '')
    if (cents === null || cents === 0) {
      throw new Error('Indiquez le montant de la dépense.')
    }
    if (!contexte.compteId) throw new Error('Choisissez un compte.')

    const { error } = await supabase().from('transactions').insert({
      account_id: contexte.compteId,
      label: contenu,
      amount_cents: -Math.abs(cents),
      kind: 'depense',
    })
    if (error) throw error
  }

  const { error } = await supabase()
    .from('inbox_items')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', elementId)

  if (error) throw error
  rafraichir('/inbox', '/taches', '/notes', '/agenda', '/argent')
}

export async function jeterInbox(elementId: string): Promise<void> {
  await exigerSession()
  const { error } = await supabase().from('inbox_items').delete().eq('id', elementId)
  if (error) throw error
  rafraichir('/inbox')
}

// — Sport ————————————————————————————————————————————————————————

export async function creerSeance(donnees: FormData): Promise<void> {
  await exigerSession()

  const type = String(donnees.get('type') ?? '').trim()
  if (!type) throw new Error('Le type est obligatoire.')

  const groupes = String(donnees.get('groupes') ?? '')
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean)

  const minutes = Number(donnees.get('minutes'))
  const ressenti = Number(donnees.get('ressenti'))

  const { error } = await supabase().from('workouts').insert({
    date: String(donnees.get('jour') ?? '').trim() || aujourdhui(),
    type,
    muscle_groups: [...new Set(groupes)],
    duration_min: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    feeling: ressenti >= 1 && ressenti <= 5 ? ressenti : null,
    notes: String(donnees.get('notes') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir('/sport')
}

// — Lectures ————————————————————————————————————————————————————

export async function creerLivre(donnees: FormData): Promise<void> {
  await exigerSession()

  const titre = String(donnees.get('titre') ?? '').trim()
  if (!titre) throw new Error('Le titre est obligatoire.')

  const { error } = await supabase().from('books').insert({
    title: titre,
    author: String(donnees.get('auteur') ?? '').trim() || null,
    status: String(donnees.get('statut') ?? 'a_lire'),
  })

  if (error) throw error
  rafraichir('/lectures')
}

export async function majLivre(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const note = Number(donnees.get('note'))

  const { error } = await supabase()
    .from('books')
    .update({
      status: String(donnees.get('statut') ?? 'a_lire'),
      rating: note >= 1 && note <= 5 ? note : null,
    })
    .eq('id', id)

  if (error) throw error
  rafraichir('/lectures')
}

/**
 * Envoi d'une couverture vers le Storage.
 *
 * Le bucket est public et les objets portent un nom aléatoire : sans rôle
 * `authenticated`, des URL signées expireraient et casseraient le cache des
 * images. Une couverture de livre n'est pas un secret.
 */
export async function envoyerCouverture(livreId: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const fichier = donnees.get('couverture')
  if (!(fichier instanceof File) || fichier.size === 0) return
  if (fichier.size > 4_000_000) {
    throw new Error('Image trop lourde : 4 Mo maximum.')
  }

  const extension = fichier.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const chemin = `${crypto.randomUUID()}.${extension}`

  const { error: envoi } = await supabase()
    .storage.from('couvertures')
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false })

  if (envoi) throw envoi

  const { error } = await supabase()
    .from('books')
    .update({ cover_path: chemin })
    .eq('id', livreId)

  if (error) throw error
  rafraichir('/lectures')
}

// — Notes ————————————————————————————————————————————————————————

export async function creerNote(donnees: FormData): Promise<void> {
  await exigerSession()

  const contenu = String(donnees.get('contenu') ?? '').trim()
  const titre = String(donnees.get('titre') ?? '').trim()
  if (!contenu && !titre) throw new Error('Une note vide ne sert à rien.')

  const tags = String(donnees.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const { error } = await supabase().from('notes').insert({
    title: titre || contenu.slice(0, 80),
    content: contenu,
    tags: [...new Set(tags)],
  })

  if (error) throw error
  rafraichir('/notes')
}

export async function majNote(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const tags = String(donnees.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const { error } = await supabase()
    .from('notes')
    .update({
      title: String(donnees.get('titre') ?? '').trim(),
      content: String(donnees.get('contenu') ?? ''),
      tags: [...new Set(tags)],
    })
    .eq('id', id)

  if (error) throw error
  rafraichir('/notes')
}

export async function supprimerNote(id: string): Promise<void> {
  await exigerSession()
  const { error } = await supabase().from('notes').delete().eq('id', id)
  if (error) throw error
  rafraichir('/notes')
}

// — Cours ————————————————————————————————————————————————————————

export async function creerCours(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const { error } = await supabase().from('courses').insert({
    name: nom,
    subject: String(donnees.get('matiere') ?? '').trim() || null,
    resource_url: String(donnees.get('lien') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir('/cours')
}

export async function majProgressionCours(id: string, progression: number): Promise<void> {
  await exigerSession()

  const borne = Math.max(0, Math.min(100, Math.round(progression)))

  const { error } = await supabase()
    .from('courses')
    .update({
      progress: borne,
      // Arriver à 100 % vaut terminé : le dire deux fois serait une occasion
      // de se contredire.
      status: borne === 100 ? 'termine' : borne > 0 ? 'en_cours' : 'prevu',
    })
    .eq('id', id)

  if (error) throw error
  rafraichir('/cours')
}

// — Clients ————————————————————————————————————————————————————

export async function creerClient(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const valeur = versCents(String(donnees.get('valeur') ?? ''))

  const { error } = await supabase().from('clients').insert({
    name: nom,
    email: String(donnees.get('email') ?? '').trim() || null,
    phone: String(donnees.get('telephone') ?? '').trim() || null,
    estimated_value_cents: valeur,
    notes: String(donnees.get('notes') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir('/clients')
}

/** Marque un contact aujourd'hui, et fixe éventuellement la prochaine relance. */
export async function contacterClient(id: string, relance?: Jour): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('clients')
    .update({
      last_contact: aujourdhui(),
      ...(relance ? { next_followup: relance } : {}),
    })
    .eq('id', id)

  if (error) throw error
  rafraichir('/clients')
}
