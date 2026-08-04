import { formater, formaterSigne } from '@/lib/argent'

/**
 * Barres horizontales, en SVG écrit à la main.
 *
 * Pas de librairie de graphiques : elle imposerait axes, grille, légende et
 * palette là où la direction artistique demande un remplissage en Encre et
 * rien d'autre.
 *
 * La variation par rapport au mois précédent est en texte plutôt qu'en
 * seconde barre : la comparaison se lit au chiffre, et une barre fantôme
 * doublerait la densité pour une information qu'on regarde une fois.
 */
export function Barres({
  lignes,
}: {
  lignes: { libelle: string; valeurCents: number; variationCents?: number }[]
}) {
  if (lignes.length === 0) return null

  const maximum = Math.max(...lignes.map((l) => l.valeurCents), 1)

  return (
    <ul>
      {lignes.map((ligne) => (
        <li key={ligne.libelle} className="border-b border-trait py-2 last:border-b-0">
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate text-13 first-letter:uppercase">{ligne.libelle}</span>
            <span className="chiffres shrink-0 text-13">{formater(ligne.valeurCents)}</span>
          </div>

          <svg
            viewBox="0 0 100 3"
            preserveAspectRatio="none"
            className="mt-1.5 h-1 w-full"
            role="img"
            aria-label={`${ligne.libelle} : ${formater(ligne.valeurCents)}`}
          >
            <rect x="0" y="0" width="100" height="3" fill="var(--trait)" />
            <rect
              x="0"
              y="0"
              width={(ligne.valeurCents / maximum) * 100}
              height="3"
              fill="var(--texte)"
            />
          </svg>

          {ligne.variationCents !== undefined && ligne.variationCents !== 0 ? (
            <p className="chiffres mt-1 text-11 text-secondaire">
              {formaterSigne(ligne.variationCents)} vs mois dernier
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
