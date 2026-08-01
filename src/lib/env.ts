/**
 * Accès aux variables d'environnement, validé une seule fois et au même
 * endroit. Une variable manquante doit produire un message explicite au
 * démarrage, pas un `undefined` qui se transforme en bug silencieux trois
 * écrans plus loin.
 *
 * Ce module est aussi importé par le middleware (runtime Edge) : il ne doit
 * donc rien contenir de spécifique à Node.
 */

function requis(nom: string): string {
  const valeur = process.env[nom]
  if (!valeur || valeur.length === 0) {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. ` +
        'Copier .env.example vers .env.local et la renseigner.',
    )
  }
  return valeur
}

export function secretAuth(): string {
  return requis('AUTH_SECRET')
}

export function motDePasseApp(): string {
  return requis('APP_PASSWORD')
}

export function urlSupabase(): string {
  return requis('SUPABASE_URL')
}

export function cleServiceSupabase(): string {
  return requis('SUPABASE_SERVICE_ROLE_KEY')
}

/** Vrai en production : conditionne l'attribut `Secure` du cookie. */
export const enProduction = process.env.NODE_ENV === 'production'
