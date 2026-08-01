'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { aujourdhui, decaler, ecartJours, type Jour } from '@/lib/date'
import { JOURS_RATTRAPAGE } from '@/lib/regles'

function verifierJourAutorise(jour: Jour) {
  const ecart = ecartJours(jour, aujourdhui())
  if (ecart < 0) {
    throw new Error('On ne coche pas une habitude dans le futur.')
  }
  if (ecart >= JOURS_RATTRAPAGE) {
    throw new Error(
      `Le rattrapage se limite aux ${JOURS_RATTRAPAGE} derniers jours.`,
    )
  }
}

/**
 * Coche ou décoche une habitude pour un jour donné.
 *
 * Un upsert plutôt qu'un insert-ou-delete : la contrainte unique
 * (habit_id, date) en fait une opération idempotente, donc un double tap sur
 * un réseau lent ne peut pas produire deux lignes ni un état incohérent.
 */
export async function basculerHabitude(
  habitudeId: string,
  jour: Jour,
  cochee: boolean,
): Promise<void> {
  await exigerSession()
  verifierJourAutorise(jour)

  const { error } = await supabase()
    .from('habit_logs')
    .upsert({ habit_id: habitudeId, date: jour, done: cochee }, { onConflict: 'habit_id,date' })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/habitudes')
}

export async function creerHabitude(donnees: FormData): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const emoji = String(donnees.get('emoji') ?? '').trim() || null
  const jours = donnees
    .getAll('jours')
    .map((j) => Number(j))
    .filter((j) => Number.isInteger(j) && j >= 1 && j <= 7)

  // Le dernier rang, pour que la nouvelle habitude arrive en bas de liste.
  const { data: derniere } = await supabase()
    .from('habits')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase().from('habits').insert({
    name: nom,
    emoji,
    position: (derniere?.position ?? 0) + 1,
    days_of_week: jours.length > 0 ? jours : [1, 2, 3, 4, 5, 6, 7],
  })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/habitudes')
}

export async function renommerHabitude(
  habitudeId: string,
  donnees: FormData,
): Promise<void> {
  await exigerSession()

  const nom = String(donnees.get('nom') ?? '').trim()
  if (!nom) throw new Error('Le nom est obligatoire.')

  const emoji = String(donnees.get('emoji') ?? '').trim() || null
  const jours = donnees
    .getAll('jours')
    .map((j) => Number(j))
    .filter((j) => Number.isInteger(j) && j >= 1 && j <= 7)

  const { error } = await supabase()
    .from('habits')
    .update({
      name: nom,
      emoji,
      days_of_week: jours.length > 0 ? jours : [1, 2, 3, 4, 5, 6, 7],
    })
    .eq('id', habitudeId)

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/habitudes')
}

/**
 * Archive une habitude à partir de demain.
 *
 * Demain et pas aujourd'hui : `archived_on` est une borne haute exclusive, donc
 * archiver au jour même retirerait l'habitude de la journée en cours et ferait
 * bouger le score d'aujourd'hui sous les yeux de l'utilisateur. Les scores
 * passés, eux, ne bougent jamais — c'est tout l'intérêt d'une fenêtre de dates
 * plutôt que d'un booléen.
 */
export async function archiverHabitude(habitudeId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('habits')
    .update({ archived_on: decaler(aujourdhui(), 1) })
    .eq('id', habitudeId)

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/habitudes')
}

export async function reactiverHabitude(habitudeId: string): Promise<void> {
  await exigerSession()

  const { error } = await supabase()
    .from('habits')
    .update({ archived_on: null })
    .eq('id', habitudeId)

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/habitudes')
}

/** Déplace une habitude d'un rang vers le haut ou vers le bas. */
export async function deplacerHabitude(
  habitudeId: string,
  direction: 'haut' | 'bas',
): Promise<void> {
  await exigerSession()

  const { data, error } = await supabase()
    .from('habits')
    .select('id, position')
    .is('archived_on', null)
    .order('position')

  if (error) throw error

  const liste = data ?? []
  const index = liste.findIndex((h) => h.id === habitudeId)
  if (index === -1) return

  const cible = direction === 'haut' ? index - 1 : index + 1
  if (cible < 0 || cible >= liste.length) return

  const courante = liste[index]!
  const voisine = liste[cible]!

  // Les positions peuvent être égales si elles n'ont jamais été normalisées ;
  // on réécrit les deux à partir de l'index, ce qui est vrai dans tous les cas.
  await Promise.all([
    supabase().from('habits').update({ position: cible }).eq('id', courante.id),
    supabase().from('habits').update({ position: index }).eq('id', voisine.id),
  ])

  revalidatePath('/')
  revalidatePath('/habitudes')
}
