'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'

/** Active ou désactive un widget du tableau de bord. */
export async function basculerWidget(cle: string, actif: boolean): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('widget_settings')
    .upsert({ widget_key: cle, enabled: actif }, { onConflict: 'widget_key' })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/reglages')
}

/**
 * Déplace un widget d'un rang.
 *
 * Les positions sont réécrites depuis l'ordre affiché plutôt qu'échangées :
 * un widget absent de la table (ajouté dans le code sans migration) n'a pas de
 * position à échanger, et l'échange le laisserait bloqué.
 */
export async function reordonnerWidgets(cles: string[]): Promise<void> {
  await exigerSession()

  const lignes = cles.map((cle, index) => ({
    widget_key: cle,
    position: (index + 1) * 10,
    enabled: true,
  }))

  const { error } = await supabase()
    .from('widget_settings')
    .upsert(lignes, { onConflict: 'widget_key', ignoreDuplicates: false })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/reglages')
}
