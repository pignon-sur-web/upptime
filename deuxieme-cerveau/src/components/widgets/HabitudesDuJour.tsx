import Link from 'next/link'
import { Widget, Invitation } from '@/components/ui/Widget'
import { ListeHabitudes } from '@/components/habitudes/ListeHabitudes'
import { habitudesDuJour, scoreDuJour } from '@/lib/donnees/habitudes'
import { aujourdhui, jourMoyen } from '@/lib/date'

/**
 * Les cases à cocher du jour, sur le tableau de bord.
 *
 * Une seule ligne au-dessus des cases : la date et le pourcentage, comme dans
 * la maquette. C'est le résumé qu'on lit avant de cocher — « où j'en suis »
 * avant « qu'est-ce qu'il reste ». Le grand score en 72 px vit dans le widget
 * « Le jour » ; celui-ci est le même chiffre à hauteur de geste.
 *
 * Aucune requête ajoutée : `scoreDuJour()` passe par `cache()` et « Le jour »
 * l'a déjà demandée.
 *
 * C'est l'un des deux seuls widgets qui restent visibles à vide, avec Tâches
 * d'aujourd'hui — mais en affichant une invitation à agir, jamais un
 * « aucune donnée ».
 */
export async function HabitudesDuJour() {
  const jour = aujourdhui()
  const [habitudes, score] = await Promise.all([
    habitudesDuJour(jour),
    scoreDuJour(),
  ])

  const pourcentage =
    score?.score === null || score === null ? null : Math.round(score.score * 100)

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
        <>
          <p className="mb-1 flex items-baseline gap-3 text-13">
            <span className="chiffres text-secondaire">{jourMoyen(jour)}</span>
            {/* Vert à 100 % et à 100 % seulement : une teinte qui apparaît en
                cours de route ne récompense plus rien. */}
            {pourcentage !== null ? (
              <span
                className={[
                  'chiffres font-medium',
                  pourcentage === 100 ? 'text-reussite' : 'text-secondaire',
                ].join(' ')}
              >
                {pourcentage} %
              </span>
            ) : null}
          </p>
          <ListeHabitudes habitudes={habitudes} jour={jour} />
        </>
      )}
    </Widget>
  )
}
