import { Widget } from '@/components/ui/Widget'
import { scoreDuJour, serieGlobale } from '@/lib/donnees/habitudes'

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
  const [score, serie] = await Promise.all([scoreDuJour(), serieGlobale()])

  if (!score || score.attendues === 0) return null

  const pourcentage = score.score === null ? null : Math.round(score.score * 100)

  return (
    <Widget libelle="Le jour">
      <div className="flex items-end justify-between gap-4">
        <p className="chiffres text-72 leading-none">
          {pourcentage === null ? '—' : `${pourcentage}`}
          {pourcentage === null ? null : (
            <span className="text-24 text-secondaire"> %</span>
          )}
        </p>

        <div className="pb-2 text-right">
          <p className="chiffres text-24">{score.cochees}/{score.attendues}</p>
          {serie > 0 ? (
            <p className="text-11 text-secondaire">
              série <span className="chiffres">{serie}</span> j
            </p>
          ) : null}
        </div>
      </div>
    </Widget>
  )
}
