import Link from 'next/link'
import { headers } from 'next/headers'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { ChoixTheme } from '@/components/reglages/ChoixTheme'
import { WIDGETS, widgetsAffiches } from '@/components/widgets/registre'
import { reglagesWidgets } from '@/lib/donnees/widgets'
import { basculerWidget, deplacerWidget } from '@/lib/actions/reglages'
import { deconnecter } from '@/lib/actions/auth'
import { jetonCalendrier } from '@/lib/jeton-calendrier'

export const metadata = { title: 'Réglages' }

export default async function PageReglages() {
  const reglages = await reglagesWidgets()
  const parCle = new Map(reglages.map((r) => [r.cle, r]))

  // L'ordre complet, désactivés compris : on doit pouvoir replacer un widget
  // masqué avant de le réactiver, sinon il réapparaît n'importe où.
  const ordre = widgetsAffiches(reglages.map((r) => ({ ...r, actif: true })))
  const actifs = ordre.filter((w) => parCle.get(w.cle)?.actif ?? true).length

  return (
    <>
      <EnTeteSection titre="Réglages" />

      <Widget libelle="Apparence" emoji="🎨">
        <ChoixTheme />
        <p className="mt-2 text-11 text-secondaire">
          « Automatique » suit le réglage de l&apos;appareil. Le choix reste sur
          cet appareil-ci : il ne voyage pas d&apos;un téléphone à un ordinateur.
        </p>
      </Widget>

      <Widget
        libelle="Widgets du tableau de bord"
        action={
          <span className="chiffres text-13">
            {actifs}/{WIDGETS.length}
          </span>
        }
      >
        <p className="mb-3 text-13 text-secondaire">
          Un widget désactivé ne s&apos;affiche plus et ne fait plus sa requête. Ceux
          qui n&apos;ont rien à dire — aucun retard, aucune échéance — se retirent
          d&apos;eux-mêmes.
        </p>

        <ul>
          {ordre.map((widget, index) => {
            const actif = parCle.get(widget.cle)?.actif ?? true
            const basculer = basculerWidget.bind(null, widget.cle, !actif)
            const monter = deplacerWidget.bind(null, widget.cle, 'haut')
            const descendre = deplacerWidget.bind(null, widget.cle, 'bas')

            return (
              <li
                key={widget.cle}
                className="flex items-center gap-1 border-b border-trait last:border-b-0"
              >
                <form action={basculer} className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={actif}
                    aria-label={`${actif ? 'Désactiver' : 'Activer'} : ${widget.libelle}`}
                    className="flex size-11 shrink-0 items-center justify-center"
                  >
                    <span className="flex size-5 items-center justify-center rounded-petit border border-secondaire">
                      <span
                        aria-hidden
                        className="transition-etat size-3 origin-center rounded-petit bg-accent"
                        style={{ transform: actif ? 'scale(1)' : 'scale(0)' }}
                      />
                    </span>
                  </button>
                  <span
                    className={[
                      'min-w-0 flex-1 truncate py-2 text-left text-15',
                      actif ? '' : 'text-secondaire',
                    ].join(' ')}
                  >
                    {widget.libelle}
                  </span>
                </form>

                <form action={monter}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    aria-label={`Monter : ${widget.libelle}`}
                    className="flex size-11 items-center justify-center text-13 text-secondaire disabled:opacity-30"
                  >
                    ↑
                  </button>
                </form>
                <form action={descendre}>
                  <button
                    type="submit"
                    disabled={index === ordre.length - 1}
                    aria-label={`Descendre : ${widget.libelle}`}
                    className="flex size-11 items-center justify-center text-13 text-secondaire disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      </Widget>

      <AbonnementCalendrier />

      <Widget libelle="Données">
        <Link href="/reglages/export" className="cible flex items-center text-15 underline">
          Exporter toutes les données
        </Link>
        <p className="text-11 text-secondaire">
          L&apos;offre gratuite de Supabase n&apos;a pas de sauvegarde automatique.
        </p>
      </Widget>

      <Widget libelle="Session">
        <form action={deconnecter}>
          <button type="submit" className="cible text-13 underline">
            Se déconnecter
          </button>
          <p className="text-11 text-secondaire">
            La PWA installée a son propre bocal à cookies : se déconnecter dans
            Safari ne déconnecte pas l&apos;application, et inversement.
          </p>
        </form>
      </Widget>
    </>
  )
}

/**
 * L'abonnement Calendrier Apple.
 *
 * Le vrai manque d'une PWA sur iOS, ce ne sont pas les données : ce sont les
 * notifications. Un calendrier abonné en a, lui. Les cours et les échéances
 * sonnent parce qu'ils vivent dans Calendrier, pas parce que l'application a
 * réussi à réveiller le téléphone.
 *
 * Le lien est en `webcal://` : sur iPhone, il ouvre directement la fenêtre
 * d'abonnement au lieu de télécharger un fichier qu'il faudrait ensuite
 * retrouver.
 */
async function AbonnementCalendrier() {
  const enTetes = await headers()
  const hote = enTetes.get('x-forwarded-host') ?? enTetes.get('host') ?? 'localhost:3000'
  const jeton = await jetonCalendrier()

  const chemin = `${hote}/calendrier/${jeton}/flux.ics`

  return (
    <Widget libelle="Calendrier Apple">
      <p className="text-13 text-secondaire">
        Vos rendez-vous, vos tâches datées et vos échéances, dans Calendrier —
        avec ses alertes. En lecture seule : cocher et modifier se font ici.
      </p>

      <a
        href={`webcal://${chemin}`}
        className="cible mt-4 flex w-full items-center justify-center rounded-petit bg-accent px-4 text-15 font-medium text-carte"
      >
        S&apos;abonner sur cet appareil
      </a>

      <p className="mt-3 libelle">Ou copier l&apos;adresse</p>
      <p className="chiffres mt-1 break-all text-11 text-secondaire">https://{chemin}</p>

      <p className="mt-3 text-11 text-secondaire">
        Le lien contient un secret dérivé d&apos;<span className="chiffres">AUTH_SECRET</span> :
        qui l&apos;a peut lire votre agenda. C&apos;est pourquoi le flux ne porte que des
        titres et des dates, jamais un montant ni une note. Régénérer{' '}
        <span className="chiffres">AUTH_SECRET</span> coupe l&apos;abonnement en même
        temps que toutes les sessions.
      </p>
    </Widget>
  )
}
