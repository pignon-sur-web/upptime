'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { versCents } from '@/lib/argent'
import { aujourdhui } from '@/lib/date'

function rafraichir() {
  revalidatePath('/')
  revalidatePath('/argent')
}

function lireMontant(donnees: FormData, champ = 'montant'): number {
  const cents = versCents(String(donnees.get(champ) ?? ''))
  if (cents === null) {
    throw new Error('Montant illisible. Exemples : 12,34 ou 1 234,56')
  }
  return cents
}

/**
 * Saisie d'une transaction.
 *
 * Le signe est déduit du genre, jamais demandé : personne ne tape « -12,34 »
 * pour une dépense. La contrainte `tx_signe_coherent` en base refuserait de
 * toute façon une dépense positive.
 */
export async function creerTransaction(donnees: FormData): Promise<void> {
  await exigerSession()

  const compteId = String(donnees.get('compteId') ?? '')
  if (!compteId) throw new Error('Choisissez un compte.')

  const libelle = String(donnees.get('libelle') ?? '').trim()
  if (!libelle) throw new Error('Le libellé est obligatoire.')

  const genre = String(donnees.get('genre') ?? 'depense')
  if (genre !== 'depense' && genre !== 'revenu') {
    throw new Error('Genre invalide.')
  }

  const montant = Math.abs(lireMontant(donnees))
  if (montant === 0) throw new Error('Le montant ne peut pas être nul.')

  const jour = String(donnees.get('jour') ?? '').trim() || aujourdhui()

  const { error } = await supabase().from('transactions').insert({
    account_id: compteId,
    date: jour,
    label: libelle,
    amount_cents: genre === 'depense' ? -montant : montant,
    kind: genre,
    category: String(donnees.get('categorie') ?? '').trim() || null,
    note: String(donnees.get('note') ?? '').trim() || null,
  })

  if (error) throw error
  rafraichir()
}

export async function supprimerTransaction(id: string): Promise<void> {
  await exigerSession()

  // Une jambe de virement ne se supprime jamais seule : l'argent quitterait un
  // compte sans arriver nulle part. L'interface n'offre d'ailleurs pas
  // l'affordance, mais l'action est un point d'entrée public.
  const { data, error: lecture } = await supabase()
    .from('transactions')
    .select('transfer_group_id')
    .eq('id', id)
    .maybeSingle()

  if (lecture) throw lecture
  if (data?.transfer_group_id) {
    throw new Error('Utilisez « Supprimer le virement » : les deux écritures partent ensemble.')
  }

  const { error } = await supabase().from('transactions').delete().eq('id', id)
  if (error) throw error

  rafraichir()
}

/**
 * Virement entre comptes.
 *
 * Tout passe par la fonction SQL : deux insertions depuis ici pourraient
 * réussir à moitié, et un virement à une seule jambe fausse le solde en
 * silence. On ne le découvrirait que des semaines plus tard, sans savoir
 * quelle ligne est orpheline.
 */
export async function creerVirement(donnees: FormData): Promise<void> {
  await exigerSession()

  const source = String(donnees.get('source') ?? '')
  const destination = String(donnees.get('destination') ?? '')
  if (!source || !destination) throw new Error('Choisissez les deux comptes.')
  if (source === destination) {
    throw new Error('Les comptes source et destination doivent différer.')
  }

  const montant = Math.abs(lireMontant(donnees))
  if (montant === 0) throw new Error('Le montant ne peut pas être nul.')

  const { error } = await supabase().rpc('enregistrer_virement', {
    p_compte_source: source,
    p_compte_destination: destination,
    p_montant_cents: montant,
    p_date: String(donnees.get('jour') ?? '').trim() || aujourdhui(),
    p_libelle: String(donnees.get('libelle') ?? '').trim() || 'Virement',
  })

  if (error) throw error
  rafraichir()
}

export async function supprimerVirement(groupeId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('supprimer_virement', { p_groupe: groupeId })
  if (error) throw error

  rafraichir()
}

export type ResultatAjustement = {
  calculeCents: number
  ecartCents: number
  creee: boolean
}

/**
 * Rapprochement : on saisit le solde réel lu sur l'application bancaire, la
 * base crée l'écriture d'écart.
 *
 * Le calcul est en SQL pour que le solde calculé et l'écart inséré viennent du
 * même instantané. L'aperçu affiché pendant la saisie n'est qu'une indication ;
 * c'est ce retour-ci qui fait foi, et l'interface montre l'écart réel même
 * s'il diffère de l'aperçu.
 */
export async function rapprocherSolde(
  compteId: string,
  saisie: string,
): Promise<ResultatAjustement> {
  await exigerSession()

  const reel = versCents(saisie)
  if (reel === null) {
    throw new Error('Solde illisible. Exemples : 1 234,56 ou -42,10')
  }

  const { data, error } = await supabase().rpc('enregistrer_ajustement', {
    p_compte_id: compteId,
    p_solde_reel_cents: reel,
  })

  if (error) throw error

  const resultat = data?.[0]
  if (!resultat) throw new Error("Le rapprochement n'a rien renvoyé.")

  rafraichir()

  return {
    calculeCents: Number(resultat.calcule_cents ?? 0),
    ecartCents: Number(resultat.ecart_cents ?? 0),
    creee: resultat.transaction_id !== null,
  }
}

/** Marquer une échéance payée : la fonction SQL crée l'écriture correspondante. */
export async function payerEcheance(echeanceId: string, compteId?: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('payer_echeance', {
    p_echeance_id: echeanceId,
    ...(compteId ? { p_compte_id: compteId } : {}),
  })

  if (error) throw error
  rafraichir()
}

export async function creerCompte(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const type = String(donnees.get('type') ?? 'courant')
  const ouverture = versCents(String(donnees.get('ouverture') ?? '0')) ?? 0

  const { data: dernier } = await supabase()
    .from('accounts')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase().from('accounts').insert({
    name: nom,
    type,
    opening_balance_cents: ouverture,
    position: (dernier?.position ?? 0) + 1,
  })

  if (error) throw error
  rafraichir()
}

export async function creerEcheance(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const jour = String(donnees.get('jour') ?? '').trim()
  if (!jour) throw new Error("L'échéance est obligatoire.")

  const montant = Math.abs(lireMontant(donnees))
  if (montant === 0) throw new Error('Le montant ne peut pas être nul.')

  const recurrence = String(donnees.get('recurrence') ?? '').trim() || null

  const { error } = await supabase().from('upcoming_payments').insert({
    name: nom,
    due_date: jour,
    amount_cents: montant,
    category: String(donnees.get('categorie') ?? '').trim() || null,
    account_id: String(donnees.get('compteId') ?? '') || null,
    recurrence,
  })

  if (error) throw error
  rafraichir()
}
