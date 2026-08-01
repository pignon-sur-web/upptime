import 'server-only'

import { cookies } from 'next/headers'
import { DUREE_SESSION_SECONDES, NOM_COOKIE, creerJeton, jetonValide } from '@/lib/auth'
import { enProduction, secretAuth } from '@/lib/env'

/** Pose le cookie de session pour un an. */
export async function ouvrirSession(): Promise<void> {
  const boite = await cookies()
  boite.set(NOM_COOKIE, await creerJeton(secretAuth()), {
    httpOnly: true,
    secure: enProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_SECONDES,
  })
}

export async function fermerSession(): Promise<void> {
  const boite = await cookies()
  boite.delete(NOM_COOKIE)
}

/**
 * Le middleware a déjà filtré les requêtes non authentifiées ; cette fonction
 * est la seconde ceinture, pour les Server Actions. Une action est un point
 * d'entrée HTTP public : elle ne doit jamais faire confiance au fait qu'une
 * page l'a appelée.
 */
export async function exigerSession(): Promise<void> {
  const boite = await cookies()
  const valide = await jetonValide(boite.get(NOM_COOKIE)?.value, secretAuth())
  if (!valide) throw new Error('Session requise.')
}
