/**
 * Le tableau de bord : le seul écran qui n'est pas une colonne.
 *
 * `max-w-7xl` (1 280 px) vient de l'échelle Tailwind par défaut — l'espace de
 * noms `--container-*` n'est pas vidé par `globals.css`, contrairement aux
 * couleurs, rayons et ombres. Ce n'est donc pas une valeur arbitraire à
 * justifier, c'est un cran de l'échelle existante.
 *
 * Le `gap-3` est exactement celui de `(colonne)`, et pour la même raison :
 * l'espacement appartient au conteneur, jamais aux enfants. Il sépare ici les
 * grands blocs — le titre, la grille de lancement, les rangées de cartes — là
 * où dans une colonne il séparait les cartes une à une.
 */
export default function LayoutTableau({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 pb-28 lg:px-6">
      {children}
    </main>
  )
}
