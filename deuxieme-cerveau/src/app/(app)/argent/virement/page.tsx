import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { FormulaireVirement } from '@/components/finances/FormulaireVirement'
import { comptesActifs } from '@/lib/donnees/finances'

export const metadata = { title: 'Virement' }

export default async function PageVirement() {
  const comptes = await comptesActifs()

  return (
    <>
      <EnTeteSection titre="Virement" retour="/argent" />
      <Widget libelle="Entre vos comptes">
        {comptes.length < 2 ? (
          <Invitation>Il faut au moins deux comptes pour faire un virement.</Invitation>
        ) : (
          <FormulaireVirement comptes={comptes.map((c) => ({ id: c.id, nom: c.nom }))} />
        )}
      </Widget>
    </>
  )
}
