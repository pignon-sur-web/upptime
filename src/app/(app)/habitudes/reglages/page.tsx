import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { FormulaireHabitude } from '@/components/habitudes/FormulaireHabitude'
import { LigneReglage } from '@/components/habitudes/LigneReglage'
import { toutesHabitudes } from '@/lib/donnees/habitudes'

export const metadata = { title: 'Réglage des habitudes' }

export default async function PageReglagesHabitudes() {
  const habitudes = await toutesHabitudes()
  const actives = habitudes.filter((h) => h.archiveeLe === null)
  const archivees = habitudes.filter((h) => h.archiveeLe !== null)

  return (
    <>
      <EnTeteSection titre="Réglage des habitudes" retour="/habitudes" />

      <Widget libelle="Ajouter">
        <FormulaireHabitude />
      </Widget>

      <Widget libelle={`Actives — ${actives.length}`}>
        {actives.length === 0 ? (
          <Invitation>
            Commencez par une seule habitude. On en ajoute toujours trop.
          </Invitation>
        ) : (
          <ul>
            {actives.map((habitude, index) => (
              <LigneReglage
                key={habitude.id}
                habitude={habitude}
                premiere={index === 0}
                derniere={index === actives.length - 1}
              />
            ))}
          </ul>
        )}
      </Widget>

      {archivees.length > 0 ? (
        <Widget libelle={`Archivées — ${archivees.length}`}>
          {/* Une habitude archivée reste dans l'historique : c'est ce qui fait
              que les scores passés ne bougent jamais. */}
          <ul>
            {archivees.map((habitude) => (
              <LigneReglage key={habitude.id} habitude={habitude} premiere derniere />
            ))}
          </ul>
        </Widget>
      ) : null}
    </>
  )
}
