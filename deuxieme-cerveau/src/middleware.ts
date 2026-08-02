import { NextResponse, type NextRequest } from 'next/server'
import { jetonValide, NOM_COOKIE } from '@/lib/auth'
import { secretAuth } from '@/lib/env'

/**
 * Le matcher est la pièce la plus fragile de la configuration : si `/sw.js`
 * ou le manifeste reçoivent une redirection vers la page de connexion,
 * l'enregistrement du service worker échoue et la PWA ne s'installe jamais,
 * avec un message d'erreur qui ne dit pas pourquoi.
 *
 * `calendrier/` est la seule exception qui expose des données. Elle est
 * délibérée : Calendrier Apple interroge le flux sans navigateur et donc sans
 * cookie, le secret doit être dans l'URL. La route ne s'ouvre pas pour autant
 * — elle vérifie elle-même un jeton dérivé d'`AUTH_SECRET`, en temps constant,
 * et ne rend que des titres et des dates. Voir `lib/jeton-calendrier.ts`.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icones/|calendrier/|manifest.webmanifest|sw.js|favicon.ico|apple-touch-icon.png).*)',
  ],
}

const PUBLIQUES = new Set(['/connexion', '/hors-ligne'])

export async function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname
  const connecte = await jetonValide(
    requete.cookies.get(NOM_COOKIE)?.value,
    secretAuth(),
  )

  if (PUBLIQUES.has(chemin)) {
    // Déjà connecté : la page de connexion n'a plus rien à offrir.
    if (chemin === '/connexion' && connecte) {
      return NextResponse.redirect(new URL('/', requete.url))
    }
    return NextResponse.next()
  }

  if (connecte) return NextResponse.next()

  const destination = new URL('/connexion', requete.url)
  // Mémoriser où l'utilisateur voulait aller, pour l'y renvoyer après coup.
  if (chemin !== '/') destination.searchParams.set('suite', chemin)
  return NextResponse.redirect(destination)
}
