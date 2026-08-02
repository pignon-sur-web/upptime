/**
 * Les anneaux du jour.
 *
 * Un anneau par domaine mesurable, qui se referme au fil de la journée. C'est
 * le seul élément de l'application conçu pour donner *envie* de cocher plutôt
 * que pour informer : un anneau presque fermé appelle le geste qui le ferme,
 * ce qu'un pourcentage ne fait pas.
 *
 * Trois choix qui comptent :
 *
 * — Un anneau sans rien à mesurer n'est pas dessiné. Un cercle vide en
 *   permanence n'est pas un objectif, c'est un reproche permanent.
 * — Le vert n'apparaît qu'à la fermeture complète. En cours de route l'anneau
 *   est bleu, la couleur des gestes qu'on fait : féliciter à 40 % dévaluerait
 *   le vert de 100 %.
 * — Rien n'est rouge ici. La journée n'est pas finie ; l'échec se constate le
 *   lendemain, sur le mur du mois, pas sur un anneau qu'on est en train de
 *   remplir.
 */

export type Anneau = {
  cle: string
  libelle: string
  fait: number
  total: number
}

const TAILLE = 104
const EPAISSEUR = 11
const ESPACE = 4

export function Anneaux({ anneaux }: { anneaux: readonly Anneau[] }) {
  const mesurables = anneaux.filter((a) => a.total > 0)
  if (mesurables.length === 0) return null

  const centre = TAILLE / 2

  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox={`0 0 ${TAILLE} ${TAILLE}`}
        className="size-26 shrink-0"
        role="img"
        aria-label={mesurables
          .map((a) => `${a.libelle} ${a.fait} sur ${a.total}`)
          .join(', ')}
      >
        {mesurables.map((anneau, index) => {
          const rayon = centre - EPAISSEUR / 2 - index * (EPAISSEUR + ESPACE)
          if (rayon <= EPAISSEUR / 2) return null

          const circonference = 2 * Math.PI * rayon
          const part = Math.min(1, anneau.fait / anneau.total)
          const complet = anneau.fait >= anneau.total

          return (
            <g key={anneau.cle}>
              {/* La piste : elle montre ce qu'il reste, sans le souligner. */}
              <circle
                cx={centre}
                cy={centre}
                r={rayon}
                fill="none"
                stroke="var(--trait)"
                strokeWidth={EPAISSEUR}
              />
              {part > 0 ? (
                <circle
                  cx={centre}
                  cy={centre}
                  r={rayon}
                  fill="none"
                  stroke={complet ? 'var(--reussite)' : 'var(--accent)'}
                  strokeWidth={EPAISSEUR}
                  strokeLinecap="round"
                  strokeDasharray={`${circonference * part} ${circonference}`}
                  // Départ à midi plutôt qu'à trois heures : un anneau se lit
                  // comme une horloge, et on le remplit dans le sens horaire.
                  transform={`rotate(-90 ${centre} ${centre})`}
                  className="transition-etat"
                />
              ) : null}
            </g>
          )
        })}
      </svg>

      <ul className="min-w-0 flex-1">
        {mesurables.map((anneau) => {
          const complet = anneau.fait >= anneau.total
          return (
            <li key={anneau.cle} className="flex items-baseline justify-between gap-3 py-1">
              <span className="truncate text-13">{anneau.libelle}</span>
              <span
                className={[
                  'chiffres shrink-0 text-13',
                  complet ? 'text-reussite' : 'text-secondaire',
                ].join(' ')}
              >
                {anneau.fait}/{anneau.total}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
