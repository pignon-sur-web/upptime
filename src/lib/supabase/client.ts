import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { cleServiceSupabase, urlSupabase } from '@/lib/env'

/**
 * L'unique accès à la base, et il est exclusivement serveur.
 *
 * L'application n'utilise pas Supabase Auth : il n'y a donc pas d'utilisateur
 * connu de Postgres et pas de politique RLS par utilisateur. La protection
 * repose sur trois couches :
 *
 *   1. le middleware, qui refuse toute requête sans cookie de session valide ;
 *   2. la RLS activée sans aucune policy sur chaque table, ce qui mure la clé
 *      anonyme ;
 *   3. les révocations explicites de la migration 0009, qui couvrent aussi les
 *      vues et les fonctions.
 *
 * La clé `service_role` contourne la RLS : elle ne doit jamais quitter le
 * serveur. Le `import 'server-only'` en tête de fichier transforme toute
 * importation depuis un composant client en erreur de compilation — c'est une
 * garantie de l'outil, pas une consigne.
 */
let instance: ReturnType<typeof createClient> | null = null

export function supabase() {
  if (!instance) {
    instance = createClient(urlSupabase(), cleServiceSupabase(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-application': 'deuxieme-cerveau' },
      },
    })
  }
  return instance
}
