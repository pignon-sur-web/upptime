import 'server-only'

import { secretAuth } from '@/lib/env'
import { egaliteConstante } from '@/lib/auth'

/**
 * Le jeton du flux de calendrier.
 *
 * Le flux ne peut pas passer par le cookie de session : Calendrier Apple
 * interroge l'URL depuis les serveurs d'Apple ou depuis le téléphone, sans
 * navigateur et sans cookie. Il faut donc que le secret soit dans l'URL.
 *
 * Il est **dérivé d'`AUTH_SECRET`** plutôt que stocké dans une variable de
 * plus. Trois conséquences, toutes voulues :
 *
 *   — rien à configurer au déploiement, une variable de moins à oublier ;
 *   — changer `AUTH_SECRET` change le jeton, donc révoque l'abonnement en même
 *     temps que les sessions : une seule poignée pour tout couper ;
 *   — le jeton ne donne accès qu'à ce flux, en lecture. Il ne permet pas de se
 *     connecter, ne révèle pas `AUTH_SECRET` (HMAC à sens unique) et n'ouvre
 *     aucune écriture.
 *
 * Ce que ça vaut : quiconque obtient l'URL lit votre agenda. C'est le même
 * compromis que n'importe quel lien de calendrier partagé, et c'est pour ça
 * que le flux ne contient que des titres et des dates — jamais de montant, de
 * note ni de solde.
 */

const encodeur = new TextEncoder()

function versBase64Url(octets: Uint8Array): string {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function jetonCalendrier(): Promise<string> {
  const cle = await crypto.subtle.importKey(
    'raw',
    encodeur.encode(secretAuth()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cle,
    encodeur.encode('flux-calendrier-v1'),
  )
  // 32 caractères de base64url, soit 192 bits : indevinable, et court assez
  // pour tenir dans une URL qu'on recopie à la main sur un téléphone.
  return versBase64Url(new Uint8Array(signature)).slice(0, 32)
}

/** Comparaison à temps constant, comme pour le cookie de session. */
export async function jetonCalendrierValide(candidat: string): Promise<boolean> {
  return egaliteConstante(candidat, await jetonCalendrier())
}
