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
/**
 * La place que la carte demande dans une rangée du tableau de bord.
 *
 * C'est bien la carte qui porte sa largeur, et non un `<div>` d'emballage
 * autour d'elle : un emballage réintroduirait précisément le nœud vide que la
 * rangée flex sert à éviter quand un widget rend `null`.
 *
 * Et c'est une propriété du contenu, pas de la mise en page : le mur du mois
 * veut ses sept colonnes de carrés, la courbe veut de la largeur, un compteur
 * d'inbox n'en veut pas. Hors d'une `.rangee`, la classe ne fait rien.
 */
export type LargeurWidget = 'tiers' | 'moitie' | 'plein'

const LARGEURS: Record<LargeurWidget, string> = {
  tiers: '',
  moitie: 'bloc-moitie',
  plein: 'bloc-plein',
}

export function Widget({
  libelle,
  emoji,
  action,
  children,
  /** Le contenu touche les bords de la carte : listes à séparateurs
      pleine largeur, tableaux, graphiques qui doivent aller au bord. */
  sansMarge = false,
  largeur = 'tiers',
}: {
  libelle: string
  /** Repère visuel attrapé au balayage, avant même la lecture du titre. */
  emoji?: string
  /** Lien ou bouton discret aligné à droite du libellé. */
  action?: ReactNode
  children: ReactNode
  sansMarge?: boolean
  largeur?: LargeurWidget
}) {
  return (
    <Carte
      sansMarge={sansMarge}
      className={[sansMarge ? 'px-4 pt-4 pb-1' : '', LARGEURS[largeur]].join(' ')}
    >
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
