import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, debutDuMois, decaler, moisSuivant, type Jour } from '@/lib/date'

/**
 * Lectures du domaine « argent ».
 *
 * Les soldes, le mois, les catégories et les budgets viennent tous de vues
 * calculées à la requête — rien n'est matérialisé. Un solde périmé serait un
 * bien pire défaut qu'une requête de trois millisecondes, et la question ne se
 * pose de toute façon pas au volume d'un usage personnel.
 */

export type Compte = {
  id: string
  nom: string
  type: string
  devise: string
  archive: boolean
  position: number
  ouvertureCents: number
  /** Toutes écritures confondues, y compris post-datées. */
  soldeCents: number
  /** Arrêté à aujourd'hui : c'est celui qui doit coller à la banque. */
  soldePointeCents: number
  nbEcritures: number
  derniereEcriture: Jour | null
}

export type Transaction = {
  id: string
  compteId: string
  compteNom: string | null
  date: Jour
  libelle: string
  montantCents: number
  nature: string
  categorie: string | null
  note: string | null
  groupeVirement: string | null
}

export type Echeance = {
  id: string
  nom: string
  echeance: Jour
  montantCents: number
  categorie: string | null
  compteId: string | null
  recurrence: string | null
  payeeLe: string | null
}

/**
 * Les comptes avec leur solde.
 *
 * `solde_pointe_cents` s'arrête à aujourd'hui. Le jour où un loyer est
 * post-daté, « pourquoi mon application ne dit pas la même chose que ma
 * banque » a une réponse immédiate au lieu d'une enquête.
 */
export const comptes = cache(async (inclureArchives = false): Promise<Compte[]> => {
  const { data, error } = await supabase()
    .from('solde_compte')
    .select(
      'account_id, name, type, currency, position, archived, opening_balance_cents, solde_cents, solde_pointe_cents, nb_ecritures, derniere_ecriture',
    )
    .order('position')

  if (error) throw error

  return (data ?? [])
    .filter((l): l is typeof l & { account_id: string } => l.account_id !== null)
    .filter((l) => inclureArchives || !l.archived)
    .map((l) => ({
      id: l.account_id,
      nom: l.name ?? '',
      type: l.type ?? 'courant',
      devise: l.currency ?? 'EUR',
      archive: l.archived ?? false,
      position: Number(l.position ?? 0),
      ouvertureCents: Number(l.opening_balance_cents ?? 0),
      soldeCents: Number(l.solde_cents ?? 0),
      soldePointeCents: Number(l.solde_pointe_cents ?? 0),
      nbEcritures: Number(l.nb_ecritures ?? 0),
      derniereEcriture: l.derniere_ecriture,
    }))
})

export const detailCompte = cache(async (id: string): Promise<Compte | null> => {
  const tous = await comptes(true)
  return tous.find((c) => c.id === id) ?? null
})

const COLONNES_TX =
  'id, account_id, date, label, amount_cents, kind, category, note, transfer_group_id'

const nomsComptes = cache(async (): Promise<Map<string, string>> => {
  const { data, error } = await supabase().from('accounts').select('id, name')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.id, c.name]))
})

type LigneTx = {
  id: string
  account_id: string
  date: string
  label: string
  amount_cents: number
  kind: string
  category: string | null
  note: string | null
  transfer_group_id: string | null
}

async function convertirTx(lignes: readonly LigneTx[]): Promise<Transaction[]> {
  const noms = await nomsComptes()
  return lignes.map((l) => ({
    id: l.id,
    compteId: l.account_id,
    compteNom: noms.get(l.account_id) ?? null,
    date: l.date,
    libelle: l.label,
    montantCents: Number(l.amount_cents),
    nature: l.kind,
    categorie: l.category,
    note: l.note,
    groupeVirement: l.transfer_group_id,
  }))
}

/** Le grand livre, du plus récent au plus ancien. */
export const transactions = cache(
  async (filtre: { compteId?: string; mois?: Jour; limite?: number } = {}): Promise<
    Transaction[]
  > => {
    let requete = supabase()
      .from('transactions')
      .select(COLONNES_TX)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filtre.compteId) requete = requete.eq('account_id', filtre.compteId)
    if (filtre.mois) {
      const debut = debutDuMois(filtre.mois)
      requete = requete.gte('date', debut).lt('date', moisSuivant(debut))
    }

    const { data, error } = await requete.limit(filtre.limite ?? 200)
    if (error) throw error
    return convertirTx(data ?? [])
  },
)

export type MoisEnArgent = {
  mois: Jour
  entreesCents: number
  sortiesCents: number
  netCents: number
  ajustementsCents: number
  nbEcritures: number
}

/**
 * Le mois en argent.
 *
 * Virements et ajustements sont exclus des entrées, des sorties et du net : un
 * virement entre deux de vos comptes n'est ni un revenu ni une dépense, et un
 * ajustement est une correction de mesure. Le total des ajustements reste
 * visible à part — s'il grossit, c'est qu'on oublie de saisir.
 */
export const moisEnArgent = cache(
  async (mois: Jour = aujourdhui()): Promise<MoisEnArgent> => {
    const debut = debutDuMois(mois)

    const { data, error } = await supabase()
      .from('finances_mensuelles')
      .select('mois, entrees_cents, sorties_cents, net_cents, ajustements_cents, nb_ecritures')
      .eq('mois', debut)
      .maybeSingle()

    if (error) throw error

    return {
      mois: debut,
      entreesCents: Number(data?.entrees_cents ?? 0),
      sortiesCents: Number(data?.sorties_cents ?? 0),
      netCents: Number(data?.net_cents ?? 0),
      ajustementsCents: Number(data?.ajustements_cents ?? 0),
      nbEcritures: Number(data?.nb_ecritures ?? 0),
    }
  },
)

export type CategorieDuMois = {
  categorie: string
  depenseCents: number
  precedenteCents: number
  variationCents: number
  plafondCents: number | null
  consommation: number | null
}

/**
 * Les dépenses par catégorie du mois, avec la comparaison au mois précédent et
 * le statut du budget.
 *
 * La vue remplit les mois creux : sans ça, un `lag()` sauterait par-dessus un
 * mois sans dépense dans la catégorie et comparerait à un chiffre vieux de
 * deux mois en l'annonçant comme « le mois dernier ».
 */
export const categoriesDuMois = cache(
  async (mois: Jour = aujourdhui()): Promise<CategorieDuMois[]> => {
    const debut = debutDuMois(mois)

    const { data, error } = await supabase()
      .from('budget_statut')
      .select('mois, category, depense_cents, plafond_cents, consommation')
      .eq('mois', debut)

    if (error) throw error

    const { data: variations, error: erreurVariations } = await supabase()
      .from('depenses_par_categorie')
      .select('category, depense_precedente_cents, variation_cents')
      .eq('mois', debut)

    if (erreurVariations) throw erreurVariations

    const parCategorie = new Map(
      (variations ?? []).map((v) => [
        v.category,
        {
          precedente: Number(v.depense_precedente_cents ?? 0),
          variation: Number(v.variation_cents ?? 0),
        },
      ]),
    )

    return (data ?? [])
      .filter((l): l is typeof l & { category: string } => l.category !== null)
      .map((l) => ({
        categorie: l.category,
        depenseCents: Number(l.depense_cents ?? 0),
        precedenteCents: parCategorie.get(l.category)?.precedente ?? 0,
        variationCents: parCategorie.get(l.category)?.variation ?? 0,
        plafondCents: l.plafond_cents === null ? null : Number(l.plafond_cents),
        consommation: l.consommation === null ? null : Number(l.consommation),
      }))
      .sort((a, b) => b.depenseCents - a.depenseCents)
  },
)

/** Les catégories déjà employées, pour proposer plutôt que faire retaper. */
export const categoriesConnues = cache(async (): Promise<string[]> => {
  const { data, error } = await supabase()
    .from('transactions')
    .select('category')
    .not('category', 'is', null)
    .limit(1000)

  if (error) throw error

  const uniques = new Set<string>()
  for (const l of data ?? []) if (l.category) uniques.add(l.category)
  return [...uniques].sort((a, b) => a.localeCompare(b, 'fr'))
})

/**
 * Les échéances à venir, plus celles déjà en retard.
 *
 * Une échéance en retard reste dans la liste : la sortir reviendrait à la
 * faire disparaître au moment précis où elle compte le plus.
 */
export const echeancesAVenir = cache(
  async (dansNJours = 30): Promise<Echeance[]> => {
    const { data, error } = await supabase()
      .from('upcoming_payments')
      .select('id, name, due_date, amount_cents, category, account_id, recurrence, paid_at')
      .is('paid_at', null)
      .lte('due_date', decaler(aujourdhui(), dansNJours))
      .order('due_date')

    if (error) throw error

    return (data ?? []).map((l) => ({
      id: l.id,
      nom: l.name,
      echeance: l.due_date,
      montantCents: Number(l.amount_cents),
      categorie: l.category,
      compteId: l.account_id,
      recurrence: l.recurrence,
      payeeLe: l.paid_at,
    }))
  },
)

export type Budget = {
  id: string
  categorie: string
  plafondCents: number
  /** `null` = plafond par défaut, valable tous les mois. */
  mois: Jour | null
}

export const budgets = cache(async (): Promise<Budget[]> => {
  const { data, error } = await supabase()
    .from('budgets')
    .select('id, category, monthly_cap_cents, month')
    .order('category')

  if (error) throw error

  return (data ?? []).map((l) => ({
    id: l.id,
    categorie: l.category,
    plafondCents: Number(l.monthly_cap_cents),
    mois: l.month,
  }))
})
