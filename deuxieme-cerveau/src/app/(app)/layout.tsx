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
          s'étale jamais sur toute la largeur d'un écran d'ordinateur.
          L'espacement entre les cartes est porté ici et pas par les cartes :
          c'est ce qui garantit qu'il est le même partout, y compris entre
          deux cartes rendues par des composants qui s'ignorent. */}
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pb-28">
        {children}
      </main>
      <BarreOnglets />
    </div>
  )
}
