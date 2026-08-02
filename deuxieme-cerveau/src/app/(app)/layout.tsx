import { BarreOnglets } from '@/components/nav/BarreOnglets'

/**
 * La coquille commune : la hauteur d'écran et la barre d'onglets, rien de plus.
 *
 * La largeur, elle, a été descendue d'un cran, dans deux layouts frères —
 * `(colonne)` et `(tableau)`. Il y a désormais deux gabarits et non plus un :
 * les écrans de section sont des colonnes étroites qu'on lit au pouce, le
 * tableau de bord est une planche large qu'on balaie du regard. La largeur est
 * une propriété du gabarit, donc elle appartient à un layout ; comme il y a
 * deux gabarits, il y a deux layouts. Les parenthèses sont des groupes de
 * routes : elles n'apparaissent dans aucune URL.
 */

/**
 * Toutes les pages lisent la base et dépendent du cookie de session : elles
 * sont dynamiques de fait. L'écrire explicitement évite qu'un remaniement les
 * rende statiques par accident, ce qui produirait un tableau de bord figé sans
 * message d'erreur.
 */
export const dynamic = 'force-dynamic'

/** Même région que le projet Supabase : chaque requête passe de ~90 ms à ~4 ms. */
export const preferredRegion = 'fra1'

export default function LayoutApplication({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-ecran">
      {children}
      <BarreOnglets />
    </div>
  )
}
