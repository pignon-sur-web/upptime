'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { egaliteConstante } from '@/lib/auth'
import { motDePasseApp } from '@/lib/env'
import { fermerSession, ouvrirSession } from '@/lib/session'

export type EtatConnexion = { erreur: string | null }

/**
 * Un seul mot de passe protège l'application. Il n'y a donc pas de compte à
 * énumérer, mais il y a un secret à deviner : deux protections minimales.
 *
 * 1. La comparaison est à temps constant, pour ne rien révéler par la durée.
 * 2. Chaque tentative dure au moins 400 ms, succès comme échec. Ça ne bloque
 *    pas un attaquant déterminé mais ça ramène une attaque par force brute à
 *    quelques essais par seconde, ce qui suffit face à un mot de passe long.
 */
const DELAI_MINIMAL_MS = 400

export async function connecter(
  _precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const debut = Date.now()
  const motDePasse = String(donnees.get('motDePasse') ?? '')
  const suiteBrute = String(donnees.get('suite') ?? '/')

  const correct = egaliteConstante(motDePasse, motDePasseApp())

  const restant = DELAI_MINIMAL_MS - (Date.now() - debut)
  if (restant > 0) await new Promise((suite) => setTimeout(suite, restant))

  if (!correct) {
    return { erreur: 'Mot de passe incorrect.' }
  }

  await ouvrirSession()

  // Ne jamais rediriger ailleurs que dans l'application : un paramètre `suite`
  // fabriqué de l'extérieur ne doit pas pouvoir servir de tremplin.
  const interne = suiteBrute.startsWith('/') && !suiteBrute.startsWith('//')
  // La destination n'est connue qu'à l'exécution ; `typedRoutes` ne peut pas la
  // vérifier, la validation ci-dessus est ce qui la rend sûre.
  redirect((interne ? suiteBrute : '/') as Route)
}

export async function deconnecter(): Promise<void> {
  await fermerSession()
  redirect('/connexion')
}
