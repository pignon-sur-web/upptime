import type { ReactNode } from 'react'

/**
 * Le conteneur de tout ce qui s'affiche sur le tableau de bord : un libellé
 * en 11px majuscules, un contenu, un filet de séparation en bas. Rien d'autre.
 *
 * Pas de carte flottante, pas de bordure fermée, pas d'ombre : les widgets sont
 * séparés par des filets, ce qui laisse la page respirer au lieu de la découper
 * en boîtes.
 */
export function Widget({
  libelle,
  action,
  children,
}: {
  libelle: string
  /** Lien ou bouton discret aligné à droite du libellé. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-b border-trait px-5 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="libelle">{libelle}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/**
 * Invitation à agir, pour les deux seuls widgets qui restent visibles à vide :
 * Habitudes du jour et Tâches d'aujourd'hui. Partout ailleurs, un widget sans
 * données ne s'affiche pas du tout — il ne dit pas « aucune donnée ».
 */
export function Invitation({ children }: { children: ReactNode }) {
  return <p className="text-13 text-secondaire">{children}</p>
}
