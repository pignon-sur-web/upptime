import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { LigneEcheance } from '@/components/finances/LigneEcheance'
import { FormulaireEcheance } from '@/components/finances/FormulaireEcheance'
import { comptesActifs, echeancesAVenir } from '@/lib/donnees/finances'

export const metadata = { title: 'Paiements à venir' }

export default async function PageEcheances() {
  const [echeances, comptes] = await Promise.all([
    echeancesAVenir(50),
    comptesActifs(),
  ])

  const choix = comptes.map((c) => ({ id: c.id, nom: c.nom }))

  return (
    <>
      <EnTeteSection titre="Paiements à venir" retour="/argent" />

      <Widget
        libelle="À venir"
        action={
          echeances.length > 0 ? (
            <span className="chiffres text-13">{echeances.length}</span>
          ) : null
        }
      >
        {echeances.length === 0 ? (
          <Invitation>Aucune échéance enregistrée.</Invitation>
        ) : (
          <ul>
            {echeances.map((echeance) => (
              <LigneEcheance key={echeance.id} echeance={echeance} comptes={choix} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Ajouter">
        <FormulaireEcheance comptes={choix} />
      </Widget>
    </>
  )
}
