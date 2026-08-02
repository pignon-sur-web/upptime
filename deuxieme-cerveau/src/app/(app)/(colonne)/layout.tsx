/**
 * Les écrans de section : une colonne étroite, tenue au pouce.
 *
 * C'est le gabarit d'origine de l'application, déplacé ici mot pour mot depuis
 * `(app)/layout.tsx` le jour où le tableau de bord a cessé d'être une colonne.
 * Bornée à `max-w-2xl` et centrée : sur un écran d'ordinateur, une liste de
 * tâches étalée sur 1 400 px ne se lit pas, elle se balaie.
 *
 * L'espacement entre les cartes est porté ici et pas par les cartes : c'est ce
 * qui garantit qu'il est le même partout, y compris entre deux cartes rendues
 * par des composants qui s'ignorent.
 */
export default function LayoutColonne({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pb-28">
      {children}
    </main>
  )
}
