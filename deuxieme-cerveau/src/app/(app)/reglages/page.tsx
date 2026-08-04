import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { ReglageWidgets } from '@/components/reglages/ReglageWidgets'
import { BoutonExport } from '@/components/reglages/BoutonExport'
import { deconnecter } from '@/lib/actions/auth'
import { reglagesWidgets } from '@/lib/donnees/widgets'
import { WIDGETS } from '@/components/widgets/registre'

export const metadata = { title: 'Réglages' }

export default async function PageReglages() {
  const reglages = await reglagesWidgets()
  const parCle = new Map(reglages.map((r) => [r.cle, r]))

  const liste = WIDGETS.map((widget) => ({
    cle: widget.cle,
    libelle: widget.libelle,
    actif: parCle.get(widget.cle)?.actif ?? true,
    position: parCle.get(widget.cle)?.position ?? 999,
  })).sort((a, b) => a.position - b.position)

  return (
    <>
      <EnTeteSection titre="Réglages" />

      <Widget libelle="Widgets du tableau de bord">
        <ReglageWidgets widgets={liste} />
      </Widget>

      <Widget libelle="Sauvegarde">
        {/* L'offre gratuite Supabase n'a aucune sauvegarde automatique : ce
            fichier est l'unique filet sous une année de données. */}
        <p className="mb-3 text-13 text-secondaire">
          Supabase ne sauvegarde rien automatiquement sur l&apos;offre gratuite.
          Ce fichier est votre seule copie de secours.
        </p>
        <BoutonExport />
      </Widget>

      <Widget libelle="Session">
        <form action={deconnecter}>
          <button type="submit" className="cible w-full border border-trait text-13">
            Se déconnecter
          </button>
        </form>
      </Widget>
    </>
  )
}
