/**
 * Barre d'avancement : une rainure grise, un remplissage vert, les deux aux
 * bouts arrondis.
 *
 * `valeur` vaut 0 à 1, ou `null` quand la progression est inconnue — un projet
 * sans aucune tâche n'est pas à 0 %, il est indéterminé, et la jauge reste une
 * rainure vide annoncée comme telle plutôt qu'un 0 % mensonger.
 *
 * Le vert est celui du verdict, pas celui d'un bouton : une jauge pleine dit
 * « c'est fait ». C'est la même famille que l'anneau du jour fermé.
 */

const TONS = {
  reussite: 'bg-reussite',
  accent: 'bg-accent',
  important: 'bg-important',
  echec: 'bg-echec',
} as const

export type TonJauge = keyof typeof TONS

export function Jauge({
  valeur,
  hauteur = 6,
  ton = 'reussite',
}: {
  valeur: number | null
  hauteur?: number
  ton?: TonJauge
}) {
  if (valeur === null) {
    return (
      <div
        className="w-full rounded-plein bg-trait"
        style={{ height: hauteur }}
        role="img"
        aria-label="progression inconnue"
      />
    )
  }

  const borne = Math.max(0, Math.min(1, valeur))

  return (
    <div
      className="w-full overflow-hidden rounded-plein bg-trait"
      style={{ height: hauteur }}
      role="progressbar"
      aria-valuenow={Math.round(borne * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={['transition-etat h-full rounded-plein', TONS[ton]].join(' ')}
        style={{ width: `${borne * 100}%` }}
      />
    </div>
  )
}
