'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import {
  analyserCSV,
  preparerLignes,
  type Association,
  type FormatDate,
  type Separateur,
} from '@/lib/csv'

/**
 * L'import CSV, côté serveur.
 *
 * Le navigateur envoie le texte brut du fichier et les décisions de
 * l'assistant — séparateur, association des colonnes, format de date — mais
 * jamais les lignes déjà transformées. Le serveur ré-analyse tout : c'est ce
 * qui garantit que ce qui est écrit correspond à l'aperçu, et qu'un appel
 * fabriqué à la main ne peut pas insérer autre chose.
 *
 * L'insertion elle-même est la RPC `importer_taches`, donc une transaction :
 * trois cents lignes passent toutes ou aucune.
 */

export type ResultatImport = {
  lotId: string
  nbTaches: number
  nbProjets: number
  nbRejetees: number
}

export async function importerTaches(entree: {
  texte: string
  separateur: Separateur
  association: Association
  format: FormatDate
  avecEntete: boolean
  source: string | null
}): Promise<ResultatImport> {
  await exigerSession()

  const lignes = analyserCSV(entree.texte, entree.separateur)
  const corps = entree.avecEntete ? lignes.slice(1) : lignes

  const { retenues, rejetees } = preparerLignes(
    corps,
    entree.association,
    entree.format,
    entree.avecEntete,
  )

  if (retenues.length === 0) {
    throw new Error('Aucune ligne exploitable dans ce fichier.')
  }

  // Les clés du JSON sont celles qu'attend la fonction SQL. Les valeurs
  // partent en texte : la conversion en date, en smallint et en statut se
  // fait dans la migration, au plus près des contraintes qui les valident.
  const charge = retenues.map((l) => ({
    titre: l.titre,
    priorite: l.priorite === null ? null : String(l.priorite),
    echeance: l.echeance,
    contexte: l.contexte,
    projet: l.projet,
    statut: l.statut,
    note: l.note,
  }))

  const { data, error } = await supabase().rpc('importer_taches', {
    p_lignes: charge,
    p_source: entree.source ?? undefined,
  })

  if (error) throw error

  const resultat = Array.isArray(data) ? data[0] : null
  if (!resultat?.batch_id) throw new Error("L'import n'a rien renvoyé.")

  revalidatePath('/', 'layout')
  revalidatePath('/taches')
  revalidatePath('/projets')

  return {
    lotId: resultat.batch_id,
    nbTaches: Number(resultat.nb_taches ?? 0),
    nbProjets: Number(resultat.nb_projets ?? 0),
    nbRejetees: rejetees.length,
  }
}

/**
 * Défaire un lot. C'est le filet de sécurité de tout l'écran : on vient
 * d'insérer trois cents lignes de travers, et il faut que ça se rattrape en
 * une tape plutôt qu'en une heure de ménage.
 */
export async function annulerImport(lotId: string): Promise<number> {
  await exigerSession()

  const { data, error } = await supabase().rpc('annuler_import', { p_batch: lotId })
  if (error) throw error

  revalidatePath('/', 'layout')
  revalidatePath('/taches')
  revalidatePath('/projets')

  return Number(data ?? 0)
}
