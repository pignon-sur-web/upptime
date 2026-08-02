'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'

/**
 * Écritures du domaine « objectifs ».
 *
 * Les valeurs des résultats clés sont des `numeric` et non de l'argent : ce
 * sont des kilos, des pages, des heures. La règle des centimes ne s'y applique
 * pas — elle ne concerne que les colonnes suffixées `_cents`.
 */

function rafraichir(id?: string) {
  revalidatePath('/', 'layout')
  revalidatePath('/objectifs')
  if (id) revalidatePath(`/objectifs/${id}`)
}

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? '').trim()
}

function nombre(donnees: FormData, cle: string, defaut = 0): number {
  const valeur = Number(texte(donnees, cle).replace(',', '.'))
  return Number.isFinite(valeur) ? valeur : defaut
}

function lireObjectif(donnees: FormData) {
  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom est obligatoire.')

  const statutBrut = texte(donnees, 'statut')
  const statuts = ['active', 'pause', 'termine', 'abandonne']

  const prioriteBrute = Number(texte(donnees, 'priorite'))
  const priorite =
    Number.isInteger(prioriteBrute) && prioriteBrute >= 0 && prioriteBrute <= 3
      ? prioriteBrute
      : null

  return {
    name: nom,
    category: texte(donnees, 'categorie') || null,
    status: statuts.includes(statutBrut) ? statutBrut : 'active',
    priority: priorite,
    start_date: texte(donnees, 'debut') || null,
    due_date: texte(donnees, 'echeance') || null,
  }
}

export async function creerObjectif(donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('goals').insert(lireObjectif(donnees))
  if (error) throw error

  rafraichir()
}

export async function creerObjectifEtRevenir(donnees: FormData): Promise<void> {
  await creerObjectif(donnees)
  redirect('/objectifs')
}

export async function modifierObjectif(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('goals').update(lireObjectif(donnees)).eq('id', id)
  if (error) throw error

  rafraichir(id)
}

export async function supprimerObjectif(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('goals').delete().eq('id', id)
  if (error) throw error

  rafraichir()
  redirect('/objectifs')
}

/**
 * Ajouter un résultat clé.
 *
 * `depart` est demandé explicitement et n'est pas déduit de la valeur actuelle :
 * c'est lui qui rend la progression juste pour un objectif décroissant. Perdre
 * 8 kg, c'est départ 86, cible 78 — sans le départ, l'application ne pourrait
 * pas distinguer « j'ai perdu la moitié » de « je suis à 105 % de ma cible ».
 */
export async function ajouterResultatCle(
  objectifId: string,
  donnees: FormData,
): Promise<void> {
  await exigerSession()

  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom du résultat clé est obligatoire.')

  const depart = nombre(donnees, 'depart')
  const cible = nombre(donnees, 'cible')

  const { data: dernier } = await supabase()
    .from('key_results')
    .select('position')
    .eq('goal_id', objectifId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase().from('key_results').insert({
    goal_id: objectifId,
    name: nom,
    unit: texte(donnees, 'unite') || null,
    start_value: depart,
    current_value: nombre(donnees, 'actuel', depart),
    target_value: cible,
    position: (dernier?.position ?? 0) + 1,
  })

  if (error) throw error
  rafraichir(objectifId)
}

/** Mettre à jour la valeur du jour. C'est le geste qu'on répète. */
export async function releverResultatCle(
  id: string,
  objectifId: string,
  donnees: FormData,
): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('key_results')
    .update({ current_value: nombre(donnees, 'actuel') })
    .eq('id', id)

  if (error) throw error
  rafraichir(objectifId)
}

export async function supprimerResultatCle(
  id: string,
  objectifId: string,
): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('key_results').delete().eq('id', id)
  if (error) throw error

  rafraichir(objectifId)
}
