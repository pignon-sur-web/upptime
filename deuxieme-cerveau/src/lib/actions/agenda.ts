'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { instantDepuisLocal } from '@/lib/date'

/**
 * Écritures de l'agenda.
 *
 * La seule subtilité est la conversion : un `<input type="datetime-local">`
 * rend une heure de pendule, sans fuseau. Stockée telle quelle dans un
 * `timestamptz`, elle serait interprétée en UTC et le rendez-vous de 14h30
 * s'afficherait à 16h30 en été. `instantDepuisLocal()` fait la traduction, et
 * c'est le seul endroit de l'application qui en a besoin.
 */

function rafraichir() {
  revalidatePath('/')
  revalidatePath('/agenda')
}

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? '').trim()
}

function lireChamps(donnees: FormData) {
  const titre = texte(donnees, 'titre')
  if (!titre) throw new Error('Le titre est obligatoire.')

  const journeeEntiere = donnees.get('journee') === 'on'
  const debutBrut = texte(donnees, 'debut')
  if (!debutBrut) throw new Error('La date de début est obligatoire.')

  // Une journée entière va de minuit à minuit moins une minute, heure belge :
  // c'est ce qui la fait tomber dans la bonne case du calendrier plutôt que de
  // déborder sur le lendemain.
  const debut = journeeEntiere
    ? instantDepuisLocal(`${debutBrut.slice(0, 10)}T00:00`)
    : instantDepuisLocal(debutBrut)

  const finBrute = texte(donnees, 'fin')
  const fin = journeeEntiere
    ? instantDepuisLocal(`${(finBrute || debutBrut).slice(0, 10)}T23:59`)
    : finBrute
      ? instantDepuisLocal(finBrute)
      : debut

  if (fin < debut) throw new Error('La fin ne peut pas précéder le début.')

  const categorieBrute = texte(donnees, 'categorie')
  const categories = ['pro', 'perso', 'sport']

  return {
    title: titre,
    starts_at: debut,
    ends_at: fin,
    all_day: journeeEntiere,
    category: categories.includes(categorieBrute) ? categorieBrute : null,
    location: texte(donnees, 'lieu') || null,
  }
}

export async function creerEvenement(donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('events').insert(lireChamps(donnees))
  if (error) throw error

  rafraichir()
}

export async function modifierEvenement(id: string, donnees: FormData): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('events').update(lireChamps(donnees)).eq('id', id)
  if (error) throw error

  rafraichir()
}

export async function supprimerEvenement(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('events').delete().eq('id', id)
  if (error) throw error

  rafraichir()
}
