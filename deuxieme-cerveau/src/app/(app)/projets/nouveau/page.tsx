import { EnTeteSection } from '@/components/nav/EnTete'
import { FormulaireProjet } from '@/components/projets/FormulaireProjet'
import { creerProjetEtRevenir } from '@/lib/actions/projets'

export const metadata = { title: 'Nouveau projet' }

export default function PageNouveauProjet() {
  return (
    <>
      <EnTeteSection titre="Nouveau projet" retour="/projets" />
      <div className="px-5 py-4">
        <FormulaireProjet action={creerProjetEtRevenir} libelleEnvoi="Créer le projet" />
      </div>
    </>
  )
}
