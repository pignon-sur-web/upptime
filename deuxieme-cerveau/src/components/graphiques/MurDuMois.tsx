import {
  aujourdhui,
  debutDuMois,
  joursDuMois,
  jourSemaineISO,
  moisLong,
  type Jour,
} from '@/lib/date'
import type { ScoreJour } from '@/lib/donnees/habitudes'

/**
 * Le mur du mois — l'élément signature.
 *
 * Une case par jour réel du mois, disposée sur sept colonnes alignées sur les
 * jours de la semaine. Le cahier des charges parlait d'une grille de trente
 * cases en bloc ; à encombrement identique, l'alignement hebdomadaire fait
 * ressortir le motif des week-ends, donc plus d'information pour la même
 * place.
 *
 * Le score est rendu par un remplissage LITTÉRAL qui monte depuis le bas,
 * sur cinq paliers. Pas d'opacité, pas de gris, pas de dégradé : c'est la
 * densité de noir qui porte l'information, exactement comme le veut la
 * direction artistique. Vu de loin, le mois devient une texture.
 *
 * Un jour sans habitude programmée reste vide et sans contour appuyé : « rien
 * ne vous était demandé » ne doit pas ressembler à un échec.
 */

const PALIERS = 5
const COTE = 10
const ESPACE = 2.5

export function MurDuMois({
  scores,
  jourReference = aujourdhui(),
}: {
  scores: ScoreJour[]
  jourReference?: Jour
}) {
  const jours = joursDuMois(jourReference)
  const premier = debutDuMois(jourReference)
  const decalage = jourSemaineISO(premier) - 1 // colonnes vides avant le 1er

  const parJour = new Map(scores.map((s) => [s.jour, s]))
  const lignes = Math.ceil((decalage + jours.length) / 7)

  const largeur = 7 * COTE + 6 * ESPACE
  const hauteur = lignes * COTE + (lignes - 1) * ESPACE

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="w-full"
        role="img"
        aria-label={`Habitudes de ${moisLong(jourReference)}, une case par jour remplie selon le score`}
      >
        {jours.map((jour, index) => {
          const position = decalage + index
          const x = (position % 7) * (COTE + ESPACE)
          const y = Math.floor(position / 7) * (COTE + ESPACE)

          const score = parJour.get(jour)?.score ?? null
          const programme = (parJour.get(jour)?.attendues ?? 0) > 0
          const palier = score === null || score === 0 ? 0 : Math.ceil(score * PALIERS)
          const remplissage = (COTE * palier) / PALIERS

          return (
            <g key={jour}>
              <rect
                x={x}
                y={y}
                width={COTE}
                height={COTE}
                fill="none"
                stroke="var(--trait)"
                strokeWidth={0.6}
              />
              {palier > 0 ? (
                <rect
                  x={x}
                  y={y + COTE - remplissage}
                  width={COTE}
                  height={remplissage}
                  fill="var(--texte)"
                />
              ) : null}
              {/* Le jour courant se repère par un trait sous la case, pas par
                  une couleur ni un contour épais qui fausserait la lecture de
                  la densité. */}
              {jour === aujourdhui() ? (
                <rect
                  x={x}
                  y={y + COTE + 0.6}
                  width={COTE}
                  height={0.8}
                  fill="var(--texte)"
                />
              ) : null}
              <title>
                {jour} —{' '}
                {!programme
                  ? 'rien de programmé'
                  : score === null
                    ? '—'
                    : `${Math.round(score * 100)} %`}
              </title>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
