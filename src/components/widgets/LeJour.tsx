import { Widget } from '@/components/ui/Widget'
import { Anneaux } from '@/components/graphiques/Anneaux'
import { scoreDuJour, serieGlobale } from '@/lib/donnees/habitudes'
import { tachesDuJour, tachesFaitesLe } from '@/lib/donnees/taches'
import { aujourdhui } from '@/lib/date'

/**
 * Le premier widget : le score du jour en très grand, et la série en cours.
 *
 * Le score s'affiche en 72px Geist Mono — c'est le seul chiffre de
 * l'application qui a droit à cette taille, et c'est ce qui donne à l'écran
 * d'accueil son point d'entrée unique.
 *
 * Quand rien n'est programmé, on affiche un tiret et non « 0 % » : « rien ne
 * vous était demandé » n'est pas un échec.
 */
export async function LeJour() {
  const [score, serie, ouvertes, faites] = await Promise.all([
    scoreDuJour(),
    serieGlobale(),
    tachesDuJour(),
    tachesFaitesLe(aujourdhui()),
  ])

  if (!score || score.attendues === 0) return null

  const pourcentage = score.score === null ? null : Math.round(score.score * 100)
  const parfait = pourcentage === 100

  return (
    <Widget libelle="Le jour">
      <div className="flex items-end justify-between gap-4">
        {/* Le grand chiffre passe au vert à 100 %, et à 100 % seulement : une
            teinte qui apparaît en cours de route ne récompense plus rien. */}
        <p
          className={[
            'chiffres text-72 leading-none',
            parfait ? 'text-reussite' : '',
          ].join(' ')}
        >
          {pourcentage === null ? '—' : `${pourcentage}`}
          {pourcentage === null ? null : (
            <span className="text-24 text-secondaire"> %</span>
          )}
        </p>

        {serie > 0 ? (
          <p className="pb-3 text-right text-11 text-secondaire">
            série
            <span className="chiffres block text-24 text-texte">{serie} j</span>
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <Anneaux
          anneaux={[
            {
              cle: 'habitudes',
              libelle: 'Habitudes',
              fait: score.cochees,
              total: score.attendues,
            },
            {
              // Le dénominateur compte les tâches faites AUJOURD'HUI en plus
              // de celles qui restent : sans elles, cocher la dernière tâche
              // ferait disparaître l'anneau au lieu de le refermer.
              cle: 'taches',
              libelle: 'Tâches du jour',
              fait: faites.length,
              total: ouvertes.length + faites.length,
            },
          ]}
        />
      </div>
    </Widget>
  )
}
