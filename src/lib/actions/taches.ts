'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, decaler, type Jour } from '@/lib/date'
import {
  MOTIF_RECURRENCE,
  STATUTS_TACHE,
  type Ancrage,
  type StatutTache,
} from '@/lib/enums'

/**
 * Écritures du domaine « tâches ».
 *
 * Les opérations à conséquence — compléter, passer son tour — ne sont pas
 * écrites ici mais appelées comme RPC : elles doivent tenir dans une seule
 * transaction avec la génération de l'occurrence suivante, et un verrou de
 * ligne. Reproduire cette logique en TypeScript la rendrait sensible à la
 * double tape sur un réseau lent, qui est exactement le cas qu'elle traite.
 */

/** Les écrans qui montrent des tâches. Une complétion les touche tous. */
function rafraichir() {
  revalidatePath('/')
  revalidatePath('/taches')
  revalidatePath('/projets')
  revalidatePath('/agenda')
}

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? '').trim()
}

function texteOuNull(donnees: FormData, cle: string): string | null {
  return texte(donnees, cle) || null
}

/**
 * Lit les champs communs aux formulaires de création et de modification.
 *
 * Tout ce qui n'est pas reconnu devient `null` plutôt que d'être écrit tel
 * quel : une action serveur est un point d'entrée HTTP public, la valeur d'un
 * `<select>` n'est pas une garantie.
 */
function lireChamps(donnees: FormData) {
  const titre = texte(donnees, 'titre')
  if (!titre) throw new Error('Le titre est obligatoire.')

  const prioriteBrute = Number(texte(donnees, 'priorite'))
  const priorite =
    Number.isInteger(prioriteBrute) && prioriteBrute >= 0 && prioriteBrute <= 3
      ? prioriteBrute
      : null

  const contexteBrut = texte(donnees, 'contexte')
  const contexte = contexteBrut === 'pro' || contexteBrut === 'perso' ? contexteBrut : null

  const recurrenceBrute = texte(donnees, 'recurrence')
  const recurrence = MOTIF_RECURRENCE.test(recurrenceBrute) ? recurrenceBrute : null

  const ancrageBrut = texte(donnees, 'ancrage')
  const ancrage: Ancrage = ancrageBrut === 'completion' ? 'completion' : 'schedule'

  const echeance = texteOuNull(donnees, 'echeance')

  // La contrainte tasks_recurrence_exige_echeance refuserait l'insertion ;
  // autant le dire en français plutôt que de laisser remonter une erreur
  // Postgres.
  if (recurrence && !echeance) {
    throw new Error('Une tâche récurrente a besoin d’une première échéance.')
  }

  return {
    title: titre,
    priority: priorite,
    due_date: echeance,
    context: contexte,
    note: texteOuNull(donnees, 'note'),
    project_id: texteOuNull(donnees, 'projet'),
    recurrence,
    recurrence_anchor: ancrage,
  }
}

export async function creerTache(donnees: FormData): Promise<void> {
  await exigerSession()

  const champs = lireChamps(donnees)
  const parent = texteOuNull(donnees, 'parent')

  const { error } = await supabase()
    .from('tasks')
    .insert({ ...champs, parent_task_id: parent })

  if (error) throw error
  rafraichir()
}

/**
 * Création depuis un écran dédié : on repart vers la liste.
 *
 * `redirect()` lève une exception que Next intercepte, donc il ne doit jamais
 * se trouver dans le même `try` que l'écriture — d'où deux fonctions plutôt
 * qu'un drapeau.
 */
export async function creerTacheEtRevenir(donnees: FormData): Promise<void> {
  await creerTache(donnees)
  redirect('/taches')
}

export async function modifierTache(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('tasks').update(lireChamps(donnees)).eq('id', id)
  if (error) throw error

  rafraichir()
  revalidatePath(`/taches/${id}`)
}

/**
 * Compléter une tâche.
 *
 * Tout est dans la RPC : verrou de ligne, retour immédiat si c'était déjà
 * fait, et génération de l'occurrence suivante sans dérive de fin de mois ni
 * arriéré. Ici on ne fait qu'appeler et rafraîchir.
 */
export async function completerTache(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('completer_tache', { p_task_id: id })
  if (error) throw error

  rafraichir()
  revalidatePath(`/taches/${id}`)
}

/** Rouvrir une tâche. Sans effet sur la série : rien n'est régénéré. */
export async function rouvrirTache(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('tasks')
    .update({ status: 'a_faire', done_at: null })
    .eq('id', id)

  if (error) throw error
  rafraichir()
  revalidatePath(`/taches/${id}`)
}

/**
 * Passer son tour sur une occurrence récurrente : celle-ci est annulée, la
 * suivante est créée. Sans ce geste, « sauté » serait indiscernable de « en
 * retard » et la liste se remplirait de reproches.
 */
export async function passerTache(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('passer_tache', { p_task_id: id })
  if (error) throw error

  rafraichir()
}

/**
 * Le report en un tap, geste central de l'écran Aujourd'hui.
 *
 * Il déplace l'échéance de l'occurrence courante et ne touche pas à
 * `series_origin_date` : reporter le loyer de deux jours ne doit pas déplacer
 * tous les loyers à venir. La série reste ancrée à son origine.
 */
export async function reporterTache(id: string, jours = 1): Promise<void> {
  await exigerSession()

  const { data, error } = await supabase()
    .from('tasks')
    .select('due_date')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  // Une tâche en retard se reporte depuis aujourd'hui, pas depuis son ancienne
  // échéance : « demain » doit vouloir dire demain, même sur une tâche oubliée
  // depuis trois semaines.
  const base: Jour =
    data.due_date && data.due_date > aujourdhui() ? data.due_date : aujourdhui()

  const { error: erreurReport } = await supabase()
    .from('tasks')
    .update({ due_date: decaler(base, jours) })
    .eq('id', id)

  if (erreurReport) throw erreurReport
  rafraichir()
}

/** Donner une échéance, ou la retirer, depuis la vue « Toutes ». */
export async function daterTache(id: string, jour: Jour | null): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('tasks').update({ due_date: jour }).eq('id', id)
  if (error) throw error
  rafraichir()
}

export async function changerStatutTache(id: string, statut: string): Promise<void> {
  await exigerSession()

  if (!STATUTS_TACHE.includes(statut as StatutTache)) {
    throw new Error(`Statut inconnu : ${statut}`)
  }

  // « Fait » passe par la RPC, qui seule sait générer l'occurrence suivante.
  if (statut === 'fait') return completerTache(id)

  const { error } = await supabase()
    .from('tasks')
    .update({ status: statut, done_at: null })
    .eq('id', id)

  if (error) throw error
  rafraichir()
  revalidatePath(`/taches/${id}`)
}

/**
 * Supprimer. Les sous-tâches partent avec (cascade déclarée dans le schéma) —
 * l'écran de détail le dit avant de proposer le bouton.
 */
export async function supprimerTache(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('tasks').delete().eq('id', id)
  if (error) throw error

  rafraichir()
}

/** Suppression depuis l'écran de détail : il faut ensuite quitter l'écran. */
export async function supprimerTacheEtRevenir(id: string): Promise<void> {
  await supprimerTache(id)
  redirect('/taches')
}
