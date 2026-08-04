'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, decaler, type Jour } from '@/lib/date'
import { ANCRAGES, RECURRENCES, type Ancrage, type Recurrence } from '@/lib/enums'

function rafraichir() {
  revalidatePath('/')
  revalidatePath('/taches')
  revalidatePath('/projets')
}

/**
 * Marquer fait.
 *
 * Tout passe par la fonction SQL `completer_tache`, jamais par un `update`
 * direct : c'est elle qui porte la génération de l'occurrence suivante d'une
 * tâche récurrente, le verrou de ligne contre la double tape, et le calcul
 * d'échéance depuis l'origine de la série qui évite la dérive de fin de mois.
 * Refaire tout ça côté TypeScript en réintroduirait les trois défauts.
 */
export async function completerTache(tacheId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('completer_tache', { p_task_id: tacheId })
  if (error) throw error

  rafraichir()
}

/** Passer son tour : l'occurrence est annulée, la suivante est créée. */
export async function passerTache(tacheId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('passer_tache', { p_task_id: tacheId })
  if (error) throw error

  rafraichir()
}

/** Rouvrir une tâche terminée. Ne touche pas aux occurrences déjà générées. */
export async function rouvrirTache(tacheId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('tasks')
    .update({ status: 'a_faire', done_at: null })
    .eq('id', tacheId)

  if (error) throw error
  rafraichir()
}

/**
 * Report en un tap.
 *
 * « Demain » se calcule depuis aujourd'hui et non depuis l'échéance : reporter
 * une tâche en retard de trois semaines doit la poser demain, pas il y a vingt
 * jours. « Semaine prochaine » vise le lundi suivant, ce qui est ce qu'on veut
 * dire en pratique — pas « dans sept jours ».
 */
export async function reporterTache(
  tacheId: string,
  vers: 'demain' | 'semaine-prochaine',
): Promise<void> {
  await exigerSession()

  const base = aujourdhui()
  let echeance: Jour

  if (vers === 'demain') {
    echeance = decaler(base, 1)
  } else {
    const jourSemaine = new Date(`${base}T12:00:00Z`).getUTCDay() || 7
    echeance = decaler(base, 8 - jourSemaine)
  }

  const { error } = await supabase()
    .from('tasks')
    .update({ due_date: echeance })
    .eq('id', tacheId)

  if (error) throw error
  rafraichir()
}

function lireRecurrence(donnees: FormData): {
  recurrence: Recurrence | null
  ancrage: Ancrage
} {
  const brute = String(donnees.get('recurrence') ?? '')
  const recurrence = brute in RECURRENCES ? (brute as Recurrence) : null

  const ancrageBrut = String(donnees.get('ancrage') ?? 'schedule')
  const ancrage = ancrageBrut in ANCRAGES ? (ancrageBrut as Ancrage) : 'schedule'

  return { recurrence, ancrage }
}

export async function creerTache(donnees: FormData): Promise<void> {
  await exigerSession()

  const titre = String(donnees.get('titre') ?? '').trim()
  if (!titre) throw new Error('Le titre est obligatoire.')

  const echeanceBrute = String(donnees.get('echeance') ?? '').trim()
  const { recurrence, ancrage } = lireRecurrence(donnees)

  // La contrainte tasks_recurrence_exige_echeance refuserait l'insertion :
  // autant le dire ici, avec un message compréhensible.
  if (recurrence && !echeanceBrute) {
    throw new Error('Une tâche récurrente a besoin d’une première échéance.')
  }

  const prioriteBrute = Number(donnees.get('priorite'))
  const contexteBrut = String(donnees.get('contexte') ?? '')
  const projetBrut = String(donnees.get('projetId') ?? '')
  const parentBrut = String(donnees.get('tacheParenteId') ?? '')

  const { error } = await supabase().from('tasks').insert({
    title: titre,
    priority: prioriteBrute >= 1 && prioriteBrute <= 3 ? prioriteBrute : null,
    due_date: echeanceBrute || null,
    context: contexteBrut === 'pro' || contexteBrut === 'perso' ? contexteBrut : null,
    note: String(donnees.get('note') ?? '').trim() || null,
    project_id: projetBrut || null,
    parent_task_id: parentBrut || null,
    recurrence,
    recurrence_anchor: ancrage,
  })

  if (error) throw error
  rafraichir()
}

export async function modifierTache(tacheId: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const titre = String(donnees.get('titre') ?? '').trim()
  if (!titre) throw new Error('Le titre est obligatoire.')

  const echeanceBrute = String(donnees.get('echeance') ?? '').trim()
  const { recurrence, ancrage } = lireRecurrence(donnees)

  if (recurrence && !echeanceBrute) {
    throw new Error('Une tâche récurrente a besoin d’une échéance.')
  }

  const prioriteBrute = Number(donnees.get('priorite'))
  const contexteBrut = String(donnees.get('contexte') ?? '')
  const projetBrut = String(donnees.get('projetId') ?? '')

  const { error } = await supabase()
    .from('tasks')
    .update({
      title: titre,
      priority: prioriteBrute >= 1 && prioriteBrute <= 3 ? prioriteBrute : null,
      due_date: echeanceBrute || null,
      context: contexteBrut === 'pro' || contexteBrut === 'perso' ? contexteBrut : null,
      note: String(donnees.get('note') ?? '').trim() || null,
      project_id: projetBrut || null,
      recurrence,
      recurrence_anchor: ancrage,
    })
    .eq('id', tacheId)

  if (error) throw error
  rafraichir()
}

/**
 * Supprimer une tâche.
 *
 * `on delete cascade` sur `parent_task_id` emporte les sous-tâches, ce qui est
 * le comportement attendu. Pour une tâche récurrente, la suppression met fin à
 * la série : c'est une limite assumée du modèle « génération à la complétion »,
 * signalée dans l'interface.
 */
export async function supprimerTache(tacheId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('tasks').delete().eq('id', tacheId)
  if (error) throw error

  rafraichir()
}
