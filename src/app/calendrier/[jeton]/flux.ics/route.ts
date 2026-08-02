import { NextResponse } from 'next/server'
import { construireCalendrier } from '@/lib/ics'
import { evenementsDuFlux } from '@/lib/donnees/calendrier'
import { jetonCalendrierValide } from '@/lib/jeton-calendrier'

export const dynamic = 'force-dynamic'

/**
 * Le flux iCalendar, à abonner depuis Calendrier Apple.
 *
 * C'est le seul chemin de l'application qui échappe au cookie de session, et
 * ce n'est pas un oubli : Calendrier interroge l'URL sans navigateur, donc
 * sans cookie. Le secret est dans l'URL, comparé ici en temps constant.
 *
 * Trois bornes rendent l'exception acceptable :
 *
 *   — lecture seule, aucun verbe autre que GET n'existe sur cette route ;
 *   — le contenu est réduit à des titres et des dates, jamais un montant ni
 *     une note (voir lib/donnees/calendrier.ts) ;
 *   — le jeton dérive d'`AUTH_SECRET`, donc le régénérer coupe l'abonnement
 *     en même temps que toutes les sessions.
 *
 * Un jeton faux renvoie 404 et non 403 : il n'y a aucune raison de confirmer
 * à qui tâtonne que l'adresse existe.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ jeton: string }> },
) {
  const { jeton } = await params

  if (!(await jetonCalendrierValide(jeton))) {
    return new NextResponse('Introuvable', { status: 404 })
  }

  const flux = construireCalendrier(await evenementsDuFlux(), {
    nom: 'Mon 2e Cerveau',
    description: 'Agenda, tâches datées et échéances.',
    rafraichissement: 'PT1H',
  })

  return new NextResponse(flux, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="mon-2e-cerveau.ics"',
      // Jamais de cache intermédiaire : un agenda périmé est pire qu'absent,
      // parce qu'on lui fait confiance.
      'cache-control': 'no-store, max-age=0',
    },
  })
}
