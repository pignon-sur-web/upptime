import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { FormulaireAjustement } from '@/components/finances/FormulaireAjustement'
import { comptes } from '@/lib/donnees/finances'

export const metadata = { title: 'Rapprochement' }

export default async function PageRapprochement() {
  const liste = await comptes()

  return (
    <>
      <EnTeteSection titre="Rapprocher un solde" retour="/argent" />

      {liste.length === 0 ? (
        <Widget libelle="Comptes">
          <Invitation>Créer un compte avant de pouvoir le rapprocher.</Invitation>
        </Widget>
      ) : (
        <FormulaireAjustement comptes={liste} />
      )}
    </>
  )
}
