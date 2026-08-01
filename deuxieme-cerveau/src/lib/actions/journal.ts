'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, ecartJours, type Jour } from '@/lib/date'

/**
 * Écritures du journal.
 *
 * Une seule entrée par jour — la colonne `date` est unique — donc l'écriture
 * est un upsert sur cette contrainte. Revenir sur l'entrée du soir pour
 * ajouter une phrase ne doit pas créer une seconde ligne du même jour.
 */

/**
 * On peut compléter les jours passés, mais pas écrire dans le futur : un
 * journal antidaté reste un journal, un journal postdaté est de la fiction.
 */
function verifierJour(jour: Jour) {
  if (ecartJours(jour, aujourdhui()) < 0) {
    throw new Error("On n'écrit pas le journal d'un jour à venir.")
  }
}

export async function enregistrerEntree(jour: Jour, donnees: FormData): Promise<void> {
  await exigerSession()
  verifierJour(jour)

  const humeurBrute = Number(String(donnees.get('humeur') ?? '').trim())
  const humeur =
    Number.isInteger(humeurBrute) && humeurBrute >= 1 && humeurBrute <= 5
      ? humeurBrute
      : null

  const { error } = await supabase().from('journal_entries').upsert(
    {
      date: jour,
      mood: humeur,
      done_text: String(donnees.get('fait') ?? '').trim() || null,
      carry_over_text: String(donnees.get('reporte') ?? '').trim() || null,
      free_note: String(donnees.get('libre') ?? '').trim() || null,
    },
    { onConflict: 'date' },
  )

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/journal')
}

export async function supprimerEntree(jour: Jour): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('journal_entries').delete().eq('date', jour)
  if (error) throw error

  revalidatePath('/journal')
}
