import 'server-only'

import { supabase } from '@/lib/supabase/client'
import { aujourdhui, maintenant } from '@/lib/date'

/**
 * L'export JSON complet.
 *
 * L'offre gratuite de Supabase **n'a pas de sauvegarde automatique**. Sans cet
 * écran, une base perdue emporterait une année de journal et il n'y aurait
 * rien à en dire. C'est cinq minutes de travail, et c'est la différence entre
 * un incident et une perte définitive.
 *
 * L'export dresse la liste des tables en dur plutôt que d'interroger le
 * catalogue : une table nouvelle doit apparaître ici par une décision, pas par
 * accident, et une table oubliée se voit à la relecture de cette liste.
 *
 * Les vues ne sont pas exportées — elles se recalculent depuis les tables — et
 * les couvertures non plus : ce sont des fichiers, ils vivent dans le bucket.
 */

const TABLES = [
  'habits',
  'habit_logs',
  'projects',
  'tasks',
  'import_batches',
  'goals',
  'key_results',
  'accounts',
  'transactions',
  'upcoming_payments',
  'budgets',
  'clients',
  'events',
  'journal_entries',
  'workouts',
  'books',
  'courses',
  'notes',
  'inbox_items',
  'widget_settings',
] as const

export type Export = {
  application: string
  version: number
  exporteLe: string
  jour: string
  tables: Record<string, unknown[]>
  comptes: Record<string, number>
}

export async function exporterTout(): Promise<Export> {
  const tables: Record<string, unknown[]> = {}
  const comptes: Record<string, number> = {}

  // En série et non en parallèle : vingt requêtes simultanées sur un projet
  // gratuit n'iraient pas plus vite et risqueraient la limitation de débit.
  // Un export dure une seconde, personne ne le regarde tourner.
  for (const table of TABLES) {
    const { data, error } = await supabase().from(table).select('*')
    if (error) throw new Error(`Export de ${table} : ${error.message}`)
    tables[table] = data ?? []
    comptes[table] = data?.length ?? 0
  }

  return {
    application: 'Mon 2e Cerveau',
    version: 1,
    exporteLe: maintenant(),
    jour: aujourdhui(),
    tables,
    comptes,
  }
}

/** Les volumes seuls, pour afficher ce que pèse l'export avant de le lancer. */
export async function volumesExport(): Promise<Record<string, number>> {
  const comptes: Record<string, number> = {}

  for (const table of TABLES) {
    const { count, error } = await supabase()
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) throw new Error(`Comptage de ${table} : ${error.message}`)
    comptes[table] = count ?? 0
  }

  return comptes
}
