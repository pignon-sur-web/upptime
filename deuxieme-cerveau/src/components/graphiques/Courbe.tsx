import type { ScoreJour } from '@/lib/donnees/habitudes'
import { jourCourt } from '@/lib/date'

/**
 * Courbe d'évolution du score, en SVG écrit à la main.
 *
 * Aucune librairie de graphiques : elle imposerait son esthétique — grilles,
 * axes, légendes, couleurs — là où la direction artistique demande une ligne
 * et deux repères, rien de plus.
 *
 * Les jours sans habitude programmée (`score === null`) interrompent le tracé
 * au lieu d'être lus comme des zéros : une semaine de vacances doit laisser un
 * trou, pas un plongeon.
 */

const LARGEUR = 300
const HAUTEUR = 80

export function Courbe({ scores }: { scores: ScoreJour[] }) {
  if (scores.length < 2) return null

  const pas = LARGEUR / (scores.length - 1)

  // Un segment par suite continue de jours renseignés.
  const segments: string[] = []
  let courant: string[] = []

  scores.forEach((point, index) => {
    if (point.score === null) {
      if (courant.length > 1) segments.push(courant.join(' '))
      courant = []
      return
    }
    const x = index * pas
    const y = HAUTEUR - point.score * HAUTEUR
    courant.push(`${courant.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  })
  if (courant.length > 1) segments.push(courant.join(' '))

  const renseignes = scores.filter((s) => s.score !== null)
  const moyenne =
    renseignes.length > 0
      ? renseignes.reduce((total, s) => total + (s.score ?? 0), 0) / renseignes.length
      : 0

  const premier = scores[0]
  const dernier = scores[scores.length - 1]

  return (
    <figure>
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Évolution du score sur ${scores.length} jours, moyenne ${Math.round(moyenne * 100)} %`}
      >
        {/* Un seul repère : la moyenne. Pas de grille, pas d'axes. */}
        <line
          x1={0}
          x2={LARGEUR}
          y1={HAUTEUR - moyenne * HAUTEUR}
          y2={HAUTEUR - moyenne * HAUTEUR}
          stroke="var(--trait)"
          strokeWidth={1}
        />
        {segments.map((trace) => (
          <path
            key={trace.slice(0, 24)}
            d={trace}
            fill="none"
            stroke="var(--texte)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <figcaption className="mt-2 flex justify-between text-11 text-secondaire">
        <span className="chiffres">{premier ? jourCourt(premier.jour) : ''}</span>
        <span className="chiffres">moyenne {Math.round(moyenne * 100)} %</span>
        <span className="chiffres">{dernier ? jourCourt(dernier.jour) : ''}</span>
      </figcaption>
    </figure>
  )
}
