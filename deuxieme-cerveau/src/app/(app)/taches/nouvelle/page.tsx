import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { FormulaireTache } from '@/components/taches/FormulaireTache'
import { optionsProjets } from '@/lib/donnees/projets'
import { creerTacheEtRevenir } from '@/lib/actions/taches'

export const metadata = { title: 'Nouvelle tâche' }

export default async function PageNouvelleTache({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string; parent?: string }>
}) {
  const { parent } = await searchParams
  const projets = await optionsProjets()

  return (
    <>
      <EnTeteSection
        titre={parent ? 'Nouvelle sous-tâche' : 'Nouvelle tâche'}
        retour="/taches"
      />
      <Carte>
        <FormulaireTache
          action={creerTacheEtRevenir}
          projets={projets}
          parentId={parent}
          libelleEnvoi="Créer la tâche"
        />
      </Carte>
    </>
  )
}
