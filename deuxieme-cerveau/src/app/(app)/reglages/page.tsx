import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { WIDGETS, widgetsAffiches } from '@/components/widgets/registre'
import { reglagesWidgets } from '@/lib/donnees/widgets'
import { basculerWidget, deplacerWidget } from '@/lib/actions/reglages'
import { deconnecter } from '@/lib/actions/auth'

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
                    <span className="flex size-6 items-center justify-center border border-texte">
                      <span
                        aria-hidden
                        className="transition-etat size-4 origin-center bg-texte"
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
