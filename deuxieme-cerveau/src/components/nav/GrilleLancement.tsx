import Link from 'next/link'
import { LANCEMENT } from '@/lib/sections'

/**
 * La grille de lancement : une tuile par section, en tête du tableau de bord.
 *
 * Elle fait double emploi avec le panneau « Tout » de la barre basse, et c'est
 * assumé. Les deux ne servent pas au même moment : le panneau sert depuis
 * n'importe quel écran, la grille sert quand on ouvre l'application et qu'on
 * sait déjà où l'on va. Un raccourci qui n'existe qu'à un endroit n'est pas un
 * raccourci.
 *
 * Cinq colonnes sur ordinateur, comme la maquette ; trois sur téléphone, où
 * cinq donneraient des tuiles de 62 px et des libellés coupés. Les dix
 * premières entrées de `LANCEMENT` occupent alors exactement les deux
 * premières rangées de la version PC.
 *
 * C'est un `<nav>` : de la navigation, et rien d'autre. L'étiqueter comme tel
 * le place aussi sous le contrôle « cibles ≥ 44 px » du banc de parcours, qui
 * ratisse `nav a` — un garde-fou gratuit.
 */
export function GrilleLancement() {
  return (
    <nav
      aria-label="Sections"
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 lg:gap-3"
    >
      {LANCEMENT.map(({ href, libelle, emoji }) => (
        <Link key={href} href={href} prefetch={false} className="block min-w-0">
          {/* Une hauteur fixe et non un carré : à cinq colonnes sur 1 440 px,
              `aspect-square` donnerait des tuiles de 215 px et la grille
              mangerait la moitié de l'écran. La maquette les garde basses —
              c'est un rappel de raccourci, pas une vignette.

              Un aplat gris pâle, sans bordure ni ombre : la maquette pose les
              tuiles à plat, elles ne se soulèvent pas comme des cartes. */}
          <span className="transition-etat flex h-16 items-center justify-center rounded-carte bg-neutre-fond text-24 lg:h-20">
            <span aria-hidden>{emoji}</span>
          </span>
          {/* Pas la classe `.libelle` : elle impose la couleur Graphite, qui
              est réservée à ce qui n'est pas cliquable. Ici on veut sa
              typographie et la couleur du texte ordinaire. */}
          <span className="mt-1.5 block truncate text-center text-11 uppercase tracking-[0.08em]">
            {libelle}
          </span>
        </Link>
      ))}
    </nav>
  )
}
