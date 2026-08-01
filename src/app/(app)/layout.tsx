import { BarreOnglets } from '@/components/nav/BarreOnglets'

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
      {/* Une colonne sur mobile, centrée et bornée au-delà : le contenu ne
          s'étale jamais sur toute la largeur d'un écran d'ordinateur. */}
      <main className="mx-auto max-w-2xl pb-28">{children}</main>
      <BarreOnglets />
    </div>
  )
}
