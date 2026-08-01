'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, debutDuMois } from '@/lib/date'
import { centsDepuisTexte, signerMontant } from '@/lib/argent'

/**
 * Écritures du domaine « argent ».
 *
 * Trois opérations ne sont pas écrites ici mais appelées comme RPC — virement,
 * rapprochement, paiement d'échéance. Ce n'est pas de la délégation par
 * paresse : chacune doit être atomique, et deux insertions dans une action
 * serveur peuvent réussir à moitié. L'argent quitterait le compte A sans
 * apparaître nulle part, le solde serait faux en silence, et la découverte se
 * ferait trois semaines plus tard sans savoir quelle ligne est orpheline.
 * C'est exactement la classe de défaut que cette application existe pour
 * empêcher.
 */

function rafraichir() {
  revalidatePath('/')
  revalidatePath('/argent')
}

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? '').trim()
}

// — Comptes ———————————————————————————————————————————————————————

export async function creerCompte(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom du compte est obligatoire.')

  const ouverture = centsDepuisTexte(texte(donnees, 'ouverture')) ?? 0
  const typeBrut = texte(donnees, 'type')
  const types = ['courant', 'epargne', 'especes', 'carte', 'investissement']

  const { data: dernier } = await supabase()
    .from('accounts')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase().from('accounts').insert({
    name: nom,
    type: types.includes(typeBrut) ? typeBrut : 'courant',
    opening_balance_cents: ouverture,
    position: (dernier?.position ?? 0) + 1,
  })

  if (error) throw error
  rafraichir()
}

export async function creerCompteEtRevenir(donnees: FormData): Promise<void> {
  await creerCompte(donnees)
  redirect('/argent')
}

export async function archiverCompte(id: string, archive: boolean): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('accounts').update({ archived: archive }).eq('id', id)
  if (error) throw error

  rafraichir()
  revalidatePath(`/argent/comptes/${id}`)
}

// — Saisie ————————————————————————————————————————————————————————

/**
 * La saisie rapide : un montant, un libellé, et c'est écrit.
 *
 * Le signe n'est pas demandé à l'utilisateur, il découle de la nature choisie.
 * `amount_cents` est signé en base — négatif quand l'argent part — ce qui rend
 * le solde calculable par une simple somme, et la contrainte
 * `tx_signe_coherent` refuse de toute façon un revenu négatif.
 */
export async function enregistrerEcriture(donnees: FormData): Promise<void> {
  await exigerSession()

  const compteId = texte(donnees, 'compte')
  if (!compteId) throw new Error('Choisir un compte.')

  const libelle = texte(donnees, 'libelle')
  if (!libelle) throw new Error('Le libellé est obligatoire.')

  const montant = centsDepuisTexte(texte(donnees, 'montant'))
  if (montant === null || montant === 0) {
    throw new Error('Montant illisible. Exemple : 19,99')
  }

  const natureBrute = texte(donnees, 'nature')
  const nature = natureBrute === 'revenu' ? 'revenu' : 'depense'

  const { error } = await supabase().from('transactions').insert({
    account_id: compteId,
    date: texte(donnees, 'date') || aujourdhui(),
    label: libelle,
    amount_cents: signerMontant(nature, montant),
    kind: nature,
    category: texte(donnees, 'categorie') || null,
    note: texte(donnees, 'note') || null,
  })

  if (error) throw error
  rafraichir()
}

/**
 * Supprimer une écriture. Une jambe de virement n'a pas de suppression
 * individuelle : l'interface ne l'offre pas, et cette action la refuse — sans
 * quoi l'argent quitterait un compte sans arriver nulle part.
 */
export async function supprimerEcriture(id: string): Promise<void> {
  await exigerSession()

  const { data, error } = await supabase()
    .from('transactions')
    .select('transfer_group_id')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  if (data.transfer_group_id) {
    throw new Error(
      'Cette ligne fait partie d’un virement. Utiliser « Supprimer le virement ».',
    )
  }

  const { error: erreurSuppression } = await supabase()
    .from('transactions')
    .delete()
    .eq('id', id)

  if (erreurSuppression) throw erreurSuppression
  rafraichir()
}

// — Virements —————————————————————————————————————————————————————

export async function enregistrerVirement(donnees: FormData): Promise<void> {
  await exigerSession()

  const source = texte(donnees, 'source')
  const destination = texte(donnees, 'destination')
  if (!source || !destination) throw new Error('Choisir les deux comptes.')
  if (source === destination) {
    throw new Error('Les comptes source et destination doivent différer.')
  }

  const montant = centsDepuisTexte(texte(donnees, 'montant'))
  if (montant === null || montant <= 0) {
    throw new Error('Le montant doit être strictement positif.')
  }

  const { error } = await supabase().rpc('enregistrer_virement', {
    p_compte_source: source,
    p_compte_destination: destination,
    p_montant_cents: montant,
    p_date: texte(donnees, 'date') || undefined,
    p_libelle: texte(donnees, 'libelle') || undefined,
    p_note: texte(donnees, 'note') || undefined,
  })

  if (error) throw error
  rafraichir()
  redirect('/argent')
}

/** Supprimer un virement, c'est supprimer ses deux jambes. */
export async function supprimerVirement(groupe: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('supprimer_virement', { p_groupe: groupe })
  if (error) throw error

  rafraichir()
}

// — Rapprochement —————————————————————————————————————————————————

export type ResultatAjustement = {
  calculeCents: number
  ecartCents: number
  /** `null` quand l'écart était nul : aucune ligne n'a été créée. */
  transactionId: string | null
}

/**
 * Rapprochement de solde.
 *
 * On saisit le solde réel lu sur l'application bancaire, la fonction SQL crée
 * l'écriture d'écart. Le calcul et l'insertion viennent du même instantané,
 * donc l'application ne peut jamais être en désaccord avec le grand livre sur
 * ce que « calculé » voulait dire. Écart nul : rien n'est créé, et l'écran
 * affiche « Déjà à jour ».
 */
export async function enregistrerAjustement(entree: {
  compteId: string
  soldeReelCents: number
  date?: string
  note?: string
}): Promise<ResultatAjustement> {
  await exigerSession()

  const { data, error } = await supabase().rpc('enregistrer_ajustement', {
    p_compte_id: entree.compteId,
    p_solde_reel_cents: entree.soldeReelCents,
    p_date: entree.date || undefined,
    p_note: entree.note || undefined,
  })

  if (error) throw error

  const ligne = Array.isArray(data) ? data[0] : null
  if (!ligne) throw new Error("Le rapprochement n'a rien renvoyé.")

  rafraichir()
  revalidatePath(`/argent/comptes/${entree.compteId}`)

  return {
    calculeCents: Number(ligne.calcule_cents ?? 0),
    ecartCents: Number(ligne.ecart_cents ?? 0),
    transactionId: ligne.transaction_id ?? null,
  }
}

// — Échéances —————————————————————————————————————————————————————

export async function creerEcheance(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = texte(donnees, 'nom')
  if (!nom) throw new Error('Le nom est obligatoire.')

  const montant = centsDepuisTexte(texte(donnees, 'montant'))
  if (montant === null || montant <= 0) {
    throw new Error('Le montant doit être strictement positif.')
  }

  const echeance = texte(donnees, 'echeance')
  if (!echeance) throw new Error("La date d'échéance est obligatoire.")

  const recurrenceBrute = texte(donnees, 'recurrence')
  const recurrence = /^P[0-9]+[DWMY]$/.test(recurrenceBrute) ? recurrenceBrute : null

  const { error } = await supabase().from('upcoming_payments').insert({
    name: nom,
    due_date: echeance,
    amount_cents: montant,
    category: texte(donnees, 'categorie') || null,
    account_id: texte(donnees, 'compte') || null,
    recurrence,
  })

  if (error) throw error
  rafraichir()
}

/**
 * Marquer une échéance payée crée l'écriture correspondante — c'est la RPC qui
 * s'en charge. Sans ce lien, « payé » serait un booléen flottant à côté de
 * l'argent réel et les soldes dériveraient en silence.
 */
export async function payerEcheance(id: string, compteId?: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().rpc('payer_echeance', {
    p_echeance_id: id,
    p_compte_id: compteId || undefined,
  })

  if (error) throw error
  rafraichir()
}

export async function supprimerEcheance(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('upcoming_payments').delete().eq('id', id)
  if (error) throw error

  rafraichir()
}

// — Budgets ———————————————————————————————————————————————————————

/**
 * Un plafond sans mois vaut pour tous les mois ; avec un mois, il ne vaut que
 * pour celui-là. Ça donne « 80 €/mois de courses, sauf en décembre où c'est
 * 200 € » sans seconde table.
 */
export async function enregistrerBudget(donnees: FormData): Promise<void> {
  await exigerSession()

  const categorie = texte(donnees, 'categorie')
  if (!categorie) throw new Error('La catégorie est obligatoire.')

  const plafond = centsDepuisTexte(texte(donnees, 'plafond'))
  if (plafond === null || plafond <= 0) {
    throw new Error('Le plafond doit être strictement positif.')
  }

  const moisBrut = texte(donnees, 'mois')
  const mois = moisBrut ? debutDuMois(moisBrut) : null

  // Pas d'`upsert` ici : l'unicité repose sur deux index PARTIELS
  // (`where month is null` et `where month is not null`), et Postgres refuse
  // une clause ON CONFLICT qui ne reprend pas le prédicat de l'index. On lit
  // donc avant d'écrire — deux requêtes, mais pas d'erreur cryptique le jour
  // où l'on remonte un plafond.
  const existant = supabase().from('budgets').select('id').eq('category', categorie)
  const { data: deja, error: erreurLecture } = await (mois
    ? existant.eq('month', mois)
    : existant.is('month', null)
  ).maybeSingle()

  if (erreurLecture) throw erreurLecture

  const { error } = deja
    ? await supabase()
        .from('budgets')
        .update({ monthly_cap_cents: plafond })
        .eq('id', deja.id)
    : await supabase()
        .from('budgets')
        .insert({ category: categorie, monthly_cap_cents: plafond, month: mois })

  if (error) throw error
  rafraichir()
}

export async function supprimerBudget(id: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase().from('budgets').delete().eq('id', id)
  if (error) throw error

  rafraichir()
}
