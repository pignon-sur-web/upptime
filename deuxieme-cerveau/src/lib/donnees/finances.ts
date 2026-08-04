import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aujourdhui, decaler, moisPrecedent, type Jour } from '@/lib/date'
import { moisDe } from '@/lib/argent'

export type Compte = {
  id: string
  nom: string
  type: string
  soldeCents: number
  /** Solde arrêté à aujourd'hui : diffère du précédent si une écriture est post-datée. */
  soldePointeCents: number
  archive: boolean
  nbEcritures: number
}

export type Ecriture = {
  id: string
  compteId: string
  jour: Jour
  libelle: string
  montantCents: number
  genre: 'revenu' | 'depense' | 'virement' | 'ajustement'
  categorie: string | null
  note: string | null
  groupeVirement: string | null
}

export type MoisArgent = {
  mois: Jour
  entreesCents: number
  sortiesCents: number
  netCents: number
  /** Les ajustements comptent dans le solde, jamais dans le net. */
  ajustementsCents: number
}

export const comptes = cache(async (): Promise<Compte[]> => {
  const { data, error } = await supabase()
    .from('solde_compte')
    .select('account_id, name, type, archived, position, solde_cents, solde_pointe_cents, nb_ecritures')
    .order('position')

  if (error) throw error

  return (data ?? [])
    .filter((c) => c.account_id !== null)
    .map((c) => ({
      id: c.account_id as string,
      nom: c.name ?? '',
      type: c.type ?? 'courant',
      soldeCents: Number(c.solde_cents ?? 0),
      soldePointeCents: Number(c.solde_pointe_cents ?? 0),
      archive: c.archived ?? false,
      nbEcritures: Number(c.nb_ecritures ?? 0),
    }))
})

export const comptesActifs = cache(async (): Promise<Compte[]> => {
  return (await comptes()).filter((c) => !c.archive)
})

/** Le total net de tous les comptes non archivés. */
export const totalNet = cache(async (): Promise<number> => {
  return (await comptesActifs()).reduce((total, c) => total + c.soldeCents, 0)
})

export const compte = cache(async (id: string): Promise<Compte | null> => {
  return (await comptes()).find((c) => c.id === id) ?? null
})

export const ecrituresDuCompte = cache(
  async (compteId: string, limite = 100): Promise<Ecriture[]> => {
    const { data, error } = await supabase()
      .from('transactions')
      .select('id, account_id, date, label, amount_cents, kind, category, note, transfer_group_id')
      .eq('account_id', compteId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) throw error

    return (data ?? []).map((e) => ({
      id: e.id,
      compteId: e.account_id,
      jour: e.date,
      libelle: e.label,
      montantCents: e.amount_cents,
      genre: e.kind as Ecriture['genre'],
      categorie: e.category,
      note: e.note,
      groupeVirement: e.transfer_group_id,
    }))
  },
)

/** Le mois en cours et le précédent, pour la comparaison. */
export const moisEnArgent = cache(
  async (): Promise<{ courant: MoisArgent; precedent: MoisArgent }> => {
    const moisCourant = moisDe(aujourdhui())
    const moisAvant = moisPrecedent(aujourdhui())

    const { data, error } = await supabase()
      .from('finances_mensuelles')
      .select('mois, entrees_cents, sorties_cents, net_cents, ajustements_cents')
      .in('mois', [moisCourant, moisAvant])

    if (error) throw error

    const vide = (mois: Jour): MoisArgent => ({
      mois,
      entreesCents: 0,
      sortiesCents: 0,
      netCents: 0,
      ajustementsCents: 0,
    })

    const lire = (mois: Jour): MoisArgent => {
      const ligne = (data ?? []).find((l) => l.mois === mois)
      if (!ligne) return vide(mois)
      return {
        mois,
        entreesCents: Number(ligne.entrees_cents ?? 0),
        sortiesCents: Number(ligne.sorties_cents ?? 0),
        netCents: Number(ligne.net_cents ?? 0),
        ajustementsCents: Number(ligne.ajustements_cents ?? 0),
      }
    }

    return { courant: lire(moisCourant), precedent: lire(moisAvant) }
  },
)

export type DepenseCategorie = {
  categorie: string
  depenseCents: number
  precedenteCents: number
  variationCents: number
}

/** Dépenses par catégorie du mois en cours, comparées au mois précédent. */
export const depensesParCategorie = cache(async (): Promise<DepenseCategorie[]> => {
  const { data, error } = await supabase()
    .from('depenses_par_categorie')
    .select('category, depense_cents, depense_precedente_cents, variation_cents')
    .eq('mois', moisDe(aujourdhui()))

  if (error) throw error

  return (data ?? [])
    .map((l) => ({
      categorie: l.category ?? '—',
      depenseCents: Number(l.depense_cents ?? 0),
      precedenteCents: Number(l.depense_precedente_cents ?? 0),
      variationCents: Number(l.variation_cents ?? 0),
    }))
    .filter((l) => l.depenseCents > 0)
    .sort((a, b) => b.depenseCents - a.depenseCents)
})

export type Echeance = {
  id: string
  nom: string
  jour: Jour
  montantCents: number
  categorie: string | null
  compteId: string | null
  recurrence: string | null
}

/** Les échéances non payées, les plus proches d'abord. */
export const echeancesAVenir = cache(async (limite = 20): Promise<Echeance[]> => {
  const { data, error } = await supabase()
    .from('upcoming_payments')
    .select('id, name, due_date, amount_cents, category, account_id, recurrence')
    .is('paid_at', null)
    .order('due_date')
    .limit(limite)

  if (error) throw error

  return (data ?? []).map((e) => ({
    id: e.id,
    nom: e.name,
    jour: e.due_date,
    montantCents: e.amount_cents,
    categorie: e.category,
    compteId: e.account_id,
    recurrence: e.recurrence,
  }))
})

/** Le total des ajustements de l'année : s'il grossit, on oublie de saisir. */
export const ajustementsDeLAnnee = cache(
  async (): Promise<{ nombre: number; totalCents: number }> => {
    const { data, error } = await supabase()
      .from('transactions')
      .select('amount_cents')
      .eq('kind', 'ajustement')
      .gte('date', decaler(aujourdhui(), -365))

    if (error) throw error

    return {
      nombre: data?.length ?? 0,
      totalCents: (data ?? []).reduce((total, e) => total + e.amount_cents, 0),
    }
  },
)
