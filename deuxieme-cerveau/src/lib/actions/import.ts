'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import type { LigneImport } from '@/lib/csv'

export type ResultatImport = {
  batchId: string
  tachesCreees: number
  projetsCrees: number
  ignorees: number
}

/**
 * Importe un lot de tâches.
 *
 * Les lignes fautives sont écartées ici plutôt qu'en base : l'aperçu les a déjà
 * montrées à l'utilisateur avec leur motif, et l'import ne doit pas échouer en
 * bloc parce qu'une date sur deux cents était illisible.
 */
export async function importerTaches(
  lignes: LigneImport[],
  source: string | null,
): Promise<ResultatImport> {
  await exigerSession()

  const valides = lignes.filter((l) => l.erreur === null)
  if (valides.length === 0) {
    throw new Error('Aucune ligne importable.')
  }

  const charge = valides.map((l) => ({
    titre: l.titre,
    priorite: l.priorite === null ? '' : String(l.priorite),
    echeance: l.echeance ?? '',
    contexte: l.contexte ?? '',
    projet: l.projet ?? '',
    statut: l.statut,
    note: l.note ?? '',
  }))

  const { data, error } = await supabase().rpc('importer_taches', {
    p_lignes: charge,
    // Le paramètre SQL a une valeur par défaut : on l'omet plutôt que de
    // passer null, que le type généré n'accepte pas.
    ...(source === null ? {} : { p_source: source }),
  })

  if (error) throw error

  const resultat = data?.[0]
  if (!resultat?.batch_id) throw new Error("L'import n'a rien renvoyé.")

  revalidatePath('/')
  revalidatePath('/taches')
  revalidatePath('/projets')

  return {
    batchId: resultat.batch_id,
    tachesCreees: Number(resultat.taches_creees ?? 0),
    projetsCrees: Number(resultat.projets_crees ?? 0),
    ignorees: lignes.length - valides.length,
  }
}

/**
 * Défait un import entier.
 *
 * C'est ce qui rend l'écran d'import sans risque : se tromper de colonne sur
 * trois cents lignes se répare d'une tape au lieu d'une suppression manuelle.
 */
export async function annulerImport(batchId: string): Promise<number> {
  await exigerSession()

  const { data, error } = await supabase().rpc('annuler_import', {
    p_batch_id: batchId,
  })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/taches')
  revalidatePath('/projets')

  return Number(data ?? 0)
}
