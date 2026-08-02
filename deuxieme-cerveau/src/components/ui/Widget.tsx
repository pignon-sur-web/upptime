import type { ReactNode } from 'react'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'

/**
 * Le conteneur de tout ce qui s'affiche dans l'application : une carte
 * blanche posée sur le fond, un en-tête avec emoji et titre, une action
 * discrète à droite.
 *
 * C'est un simple habillage de `Carte` + `EnTeteCarte`. Il existe séparément
 * parce que les vingt et quelques widgets l'appellent tous, et qu'un jour où
 * l'en-tête devra changer, il ne devra changer qu'ici.
 */
export function Widget({
  libelle,
  emoji,
  action,
  children,
  /** Le contenu touche les bords de la carte : listes à séparateurs
      pleine largeur, tableaux, graphiques qui doivent aller au bord. */
  sansMarge = false,
}: {
  libelle: string
  /** Repère visuel attrapé au balayage, avant même la lecture du titre. */
  emoji?: string
  /** Lien ou bouton discret aligné à droite du libellé. */
  action?: ReactNode
  children: ReactNode
  sansMarge?: boolean
}) {
  return (
    <Carte sansMarge={sansMarge} className={sansMarge ? 'px-4 pt-4 pb-1' : ''}>
      <EnTeteCarte titre={libelle} emoji={emoji} action={action} />
      {children}
    </Carte>
  )
}

/**
 * Invitation à agir, pour les widgets qui restent visibles à vide : Habitudes
 * du jour, Tâches d'aujourd'hui. Partout ailleurs, un widget sans données ne
 * s'affiche pas du tout — il ne dit pas « aucune donnée ».
 */
export function Invitation({ children }: { children: ReactNode }) {
  return <p className="text-13 text-secondaire">{children}</p>
}
