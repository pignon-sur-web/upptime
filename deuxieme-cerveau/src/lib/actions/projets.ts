'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { STATUTS_PROJET, type StatutProjet } from '@/lib/enums'

function rafraichir() {
  revalidatePath('/')
  revalidatePath('/projets')
  revalidatePath('/taches')
}

function lireChamps(donnees: FormData) {
  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const statutBrut = String(donnees.get('statut') ?? '').trim()
  const statut: StatutProjet = STATUTS_PROJET.includes(statutBrut as StatutProjet)
    ? (statutBrut as StatutProjet)
    : 'active'

  const prioriteBrute = Number(String(donnees.get('priorite') ?? '').trim())
  const priorite =
    Number.isInteger(prioriteBrute) && prioriteBrute >= 0 && prioriteBrute <= 3
      ? prioriteBrute
      : null

  return {
    name: nom,
    status: statut,
    priority: priorite,
    start_date: String(donnees.get('debut') ?? '').trim() || null,
    due_date: String(donnees.get('echeance') ?? '').trim() || null,
  }
}

export async function creerProjet(donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('projects').insert(lireChamps(donnees))
  if (error) throw error

  rafraichir()
}

/** Création depuis l'écran dédié : on repart vers la liste. */
export async function creerProjetEtRevenir(donnees: FormData): Promise<void> {
  await creerProjet(donnees)
  redirect('/projets')
}

export async function modifierProjet(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('projects').update(lireChamps(donnees)).eq('id', id)
  if (error) throw error

  rafraichir()
  revalidatePath(`/projets/${id}`)
}

/**
 * Supprimer un projet ne supprime pas ses tâches : la clé étrangère est en
 * `on delete set null`. C'est délibéré — ranger du travail dans un projet ne
 * doit jamais devenir un moyen de le perdre en une tape.
 */
export async function supprimerProjet(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('projects').delete().eq('id', id)
  if (error) throw error

  rafraichir()
  redirect('/projets')
}
