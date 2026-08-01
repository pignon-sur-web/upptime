import 'server-only'

import { cache } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ReglageWidget } from '@/components/widgets/registre'

/** Réglages des widgets du tableau de bord. Une seule requête par rendu. */
export const reglagesWidgets = cache(async (): Promise<ReglageWidget[]> => {
  const { data, error } = await supabase()
    .from('widget_settings')
    .select('widget_key, enabled, position')
    .order('position')

  if (error) throw error

  return (data ?? []).map((l) => ({
    cle: l.widget_key,
    actif: l.enabled,
    position: l.position,
  }))
})
