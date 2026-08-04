'use server'

import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'

/**
 * Les tables exportées. Les vues en sont absentes : elles se recalculent.
 */
const TABLES = [
  'habits',
  'habit_logs',
  'projects',
  'tasks',
  'goals',
  'key_results',
  'accounts',
  'transactions',
  'upcoming_payments',
  'budgets',
  'events',
  'journal_entries',
  'workouts',
  'books',
  'courses',
  'notes',
  'inbox_items',
  'clients',
  'import_batches',
  'widget_settings',
] as const

/**
 * Export JSON complet.
 *
 * L'offre gratuite Supabase n'a AUCUNE sauvegarde automatique : ce dump est
 * l'unique filet sous une année de journal, de finances et d'habitudes. Il
 * tient en une fonction, et c'est la différence entre un incident et une
 * perte définitive.
 */
export async function exporterTout(): Promise<string> {
  await exigerSession()

  const contenu: Record<string, unknown[]> = {}

  for (const table of TABLES) {
    const { data, error } = await supabase().from(table).select('*')
    if (error) throw error
    contenu[table] = data ?? []
  }

  return JSON.stringify(
    {
      application: 'Mon 2e Cerveau',
      version: 1,
      // L'instant de l'export, pas un jour : aucune ambiguïté de fuseau.
      exporte_le: new Date().toISOString(),
      tables: contenu,
    },
    null,
    2,
  )
}
