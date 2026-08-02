import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { FormulaireProjet } from '@/components/projets/FormulaireProjet'
import { creerProjetEtRevenir } from '@/lib/actions/projets'

export const metadata = { title: 'Nouveau projet' }

export default function PageNouveauProjet() {
  return (
    <>
      <EnTeteSection titre="Nouveau projet" retour="/projets" />
      <Carte>
        <FormulaireProjet action={creerProjetEtRevenir} libelleEnvoi="Créer le projet" />
      </Carte>
    </>
  )
}
