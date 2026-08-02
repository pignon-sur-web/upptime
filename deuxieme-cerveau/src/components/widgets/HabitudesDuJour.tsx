import Link from 'next/link'
import { Widget, Invitation } from '@/components/ui/Widget'
import { ListeHabitudes } from '@/components/habitudes/ListeHabitudes'
import { habitudesDuJour } from '@/lib/donnees/habitudes'
import { aujourdhui } from '@/lib/date'

/**
 * Les cases à cocher du jour, sur le tableau de bord. Rien d'autre : c'est le
 * geste quotidien, il ne doit rien avoir autour.
 *
 * C'est l'un des deux seuls widgets qui restent visibles à vide, avec Tâches
 * d'aujourd'hui — mais en affichant une invitation à agir, jamais un
 * « aucune donnée ».
 */
export async function HabitudesDuJour() {
  const jour = aujourdhui()
  const habitudes = await habitudesDuJour(jour)

  return (
    <Widget libelle="Habitudes du jour" emoji="🔁">
      {habitudes.length === 0 ? (
        <Invitation>
          <Link href="/habitudes/reglages" className="underline">
            Ajouter une première habitude
          </Link>
          . Une seule suffit pour commencer.
        </Invitation>
      ) : (
        <ListeHabitudes habitudes={habitudes} jour={jour} />
      )}
    </Widget>
  )
}
