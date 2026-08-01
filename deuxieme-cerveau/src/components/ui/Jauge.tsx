/**
 * Barre d'avancement. Un filet de fond, un remplissage en Encre.
 *
 * `valeur` vaut 0 à 1, ou `null` quand la progression est inconnue — un projet
 * sans aucune tâche n'est pas à 0 %, il est indéterminé, et l'interface affiche
 * un tiret plutôt qu'un mensonge.
 */
export function Jauge({
  valeur,
  hauteur = 4,
}: {
  valeur: number | null
  hauteur?: number
}) {
  if (valeur === null) {
    return (
      <div
        className="w-full bg-trait"
        style={{ height: hauteur }}
        role="img"
        aria-label="progression inconnue"
      />
    )
  }

  const borne = Math.max(0, Math.min(1, valeur))

  return (
    <div
      className="w-full bg-trait"
      style={{ height: hauteur }}
      role="progressbar"
      aria-valuenow={Math.round(borne * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="transition-etat h-full bg-texte"
        style={{ width: `${borne * 100}%` }}
      />
    </div>
  )
}
