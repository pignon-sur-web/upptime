import { readFileSync } from 'node:fs'

/**
 * Lit `.env.local` pour les bancs d'essai au navigateur.
 *
 * Ils ont besoin du mot de passe pour franchir la porte. Le coder en dur
 * marchait tant qu'il n'y en avait qu'un ; le jour où on en change, les tests
 * échouent sur la connexion et on cherche le défaut ailleurs. Une variable
 * d'environnement l'emporte, pour pouvoir viser un autre déploiement sans
 * toucher au fichier.
 */
export function envLocal() {
  let fichier = {}
  try {
    fichier = Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
        .map((l) => {
          const coupure = l.indexOf('=')
          return [l.slice(0, coupure).trim(), l.slice(coupure + 1).trim()]
        }),
    )
  } catch {
    // Pas de .env.local : on se rabat sur l'environnement du processus.
  }
  return { ...fichier, ...process.env }
}
