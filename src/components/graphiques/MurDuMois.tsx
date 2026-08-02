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
 * Le score est rendu par un remplissage LITTÉRAL qui monte depuis le bas, sur
 * cinq paliers. Pas d'opacité, pas de dégradé : c'est la hauteur qui porte
 * l'information. Vu de loin, le mois devient une texture.
 *
 * La couleur ajoute le jugement que la hauteur seule ne portait pas : vert
 * quand la journée est pleine, rouge quand elle est restée vide alors que
 * quelque chose était demandé. Entre les deux, l'Encre — la plupart des jours
 * sont des jours moyens, et un mois entier de rouge ferait fermer
 * l'application au lieu de la faire ouvrir.
 *
 * Deux jours n'ont droit à aucune couleur, et c'est la même raison dans les
 * deux cas : AUJOURD'HUI, parce que la journée n'est pas finie et qu'un rouge
 * à 9h du matin est un reproche adressé à personne ; et un jour sans habitude
 * programmée, parce que « rien ne vous était demandé » n'est pas un échec.
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

          const cestAujourdhui = jour === aujourdhui()
          const passe = jour < aujourdhui()
          const teinte =
            score !== null && score >= 1
              ? 'var(--reussite)'
              : programme && passe && palier === 0
                ? 'var(--echec)'
                : 'var(--texte)'
          // Une journée vide n'a rien à remplir : on teinte alors son contour,
          // sinon le rouge n'aurait nulle part où s'afficher.
          const contour =
            programme && passe && palier === 0 ? 'var(--echec)' : 'var(--trait)'

          return (
            <g key={jour}>
              <rect
                x={x}
                y={y}
                width={COTE}
                height={COTE}
                fill="none"
                stroke={contour}
                strokeWidth={0.6}
              />
              {palier > 0 ? (
                <rect
                  x={x}
                  y={y + COTE - remplissage}
                  width={COTE}
                  height={remplissage}
                  fill={teinte}
                />
              ) : null}
              {/* Le jour courant se repère par un trait sous la case, pas par
                  une couleur ni un contour épais qui fausserait la lecture de
                  la densité. */}
              {cestAujourdhui ? (
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
