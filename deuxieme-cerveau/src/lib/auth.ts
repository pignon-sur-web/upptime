/**
 * Porte d'entrée de l'application : un seul utilisateur, un seul mot de passe.
 *
 * Pas de Supabase Auth ni de magic link : sur iOS, un lien de connexion reçu
 * par mail ouvre Safari et éjecte l'utilisateur de la PWA installée. Une
 * application qu'on doit ouvrir chaque soir ne peut pas se permettre ça.
 *
 * À la place : le mot de passe est comparé à `APP_PASSWORD`, et un jeton signé
 * en HMAC-SHA256 est posé en cookie pour un an. Le jeton ne contient aucun
 * secret, seulement une version et une date d'émission — sa seule valeur est
 * d'être signé.
 *
 * Tout ici utilise `crypto.subtle` (Web Crypto) parce que ce module tourne
 * aussi dans le middleware, sur le runtime Edge, où `node:crypto` n'existe pas.
 */

/**
 * Incrémenter cette valeur invalide tous les jetons déjà émis et déconnecte
 * tous les appareils. Le changement de `AUTH_SECRET` a le même effet.
 */
const VERSION_JETON = 1

/** Un an. Le but est de ne jamais avoir à se reconnecter au quotidien. */
export const DUREE_SESSION_SECONDES = 365 * 24 * 60 * 60

export const NOM_COOKIE = 'session'

const encodeur = new TextEncoder()

function versBase64Url(octets: Uint8Array): string {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function depuisBase64Url(texte: string): Uint8Array {
  const base64 = texte.replace(/-/g, '+').replace(/_/g, '/')
  const complet = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binaire = atob(complet)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

async function cle(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encodeur.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function signer(charge: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await cle(secret),
    encodeur.encode(charge),
  )
  return versBase64Url(new Uint8Array(signature))
}

/**
 * Comparaison à temps constant. Le runtime Edge n'a pas `timingSafeEqual`, donc
 * on accumule les différences par XOR sans jamais sortir de la boucle en avance.
 */
export function egaliteConstante(a: string, b: string): boolean {
  const oa = encodeur.encode(a)
  const ob = encodeur.encode(b)
  // La longueur fuit de toute façon par le temps de transport ; on la neutralise
  // en comparant sur la longueur maximale des deux.
  const n = Math.max(oa.length, ob.length)
  let difference = oa.length ^ ob.length
  for (let i = 0; i < n; i++) {
    difference |= (oa[i] ?? 0) ^ (ob[i] ?? 0)
  }
  return difference === 0
}

/** Crée un jeton signé. Le contenu est public, seule la signature compte. */
export async function creerJeton(secret: string): Promise<string> {
  const charge = versBase64Url(
    encodeur.encode(JSON.stringify({ v: VERSION_JETON, t: Date.now() })),
  )
  return `${charge}.${await signer(charge, secret)}`
}

/**
 * Vérifie un jeton. Renvoie `false` si la signature ne correspond pas, si la
 * version a changé, ou si le jeton a dépassé sa durée de vie.
 */
export async function jetonValide(
  jeton: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!jeton) return false

  const separateur = jeton.lastIndexOf('.')
  if (separateur <= 0) return false

  const charge = jeton.slice(0, separateur)
  const signature = jeton.slice(separateur + 1)

  const attendue = await signer(charge, secret)
  if (!egaliteConstante(signature, attendue)) return false

  try {
    const decode = new TextDecoder().decode(depuisBase64Url(charge))
    const contenu = JSON.parse(decode) as { v?: number; t?: number }
    if (contenu.v !== VERSION_JETON) return false
    if (typeof contenu.t !== 'number') return false
    const age = (Date.now() - contenu.t) / 1000
    return age >= 0 && age < DUREE_SESSION_SECONDES
  } catch {
    return false
  }
}
