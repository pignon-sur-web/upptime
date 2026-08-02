import { euros, eurosAbsolus } from '@/lib/argent'
import type { CategorieDuMois } from '@/lib/donnees/finances'

/**
 * Les dépenses du mois par catégorie, en barres horizontales.
 *
 * Deux traits portent toute l'information :
 *
 *   — la barre pleine, dont la longueur est proportionnelle à la dépense la
 *     plus forte du mois ; c'est une comparaison entre catégories, pas une
 *     mesure absolue, et c'est ce qu'on veut lire d'un coup d'œil ;
 *   — le repère vertical du plafond de budget, quand il y en a un. Le
 *     dépassement se lit alors sans chiffre : la barre passe le trait.
 *
 * Une catégorie en dépassement est rendue par **inversion** de la ligne — fond
 * Encre, texte Papier. Aucun rouge n'est disponible dans cette palette, et
 * l'inversion crie de toute façon plus fort que le rouge.
 *
 * La variation par rapport au mois précédent vient de la vue, qui remplit les
 * mois creux : un mois sans dépense dans la catégorie se compare bien à zéro,
 * et non à un chiffre vieux de deux mois annoncé comme « le mois dernier ».
 */

const HAUTEUR_BARRE = 6

export function BarresCategories({
  categories,
}: {
  categories: readonly CategorieDuMois[]
}) {
  if (categories.length === 0) return null

  const maximum = Math.max(
    ...categories.map((c) => Math.max(c.depenseCents, c.plafondCents ?? 0)),
    1,
  )

  return (
    <ul>
      {categories.map((categorie) => {
        const depasse =
          categorie.consommation !== null && categorie.consommation > 1

        return (
          <li
            key={categorie.categorie}
            className={[
              'border-b border-trait py-2 last:border-b-0',
              depasse ? 'rounded-petit bg-echec-fond px-2 text-echec' : '',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-13">{categorie.categorie}</span>
              <span className="chiffres shrink-0 text-13">
                {eurosAbsolus(categorie.depenseCents)}
              </span>
            </div>

            <svg
              viewBox={`0 0 100 ${HAUTEUR_BARRE}`}
              preserveAspectRatio="none"
              className="mt-1.5 h-1.5 w-full"
              role="img"
              aria-label={`${categorie.categorie} : ${eurosAbsolus(categorie.depenseCents)}${
                categorie.plafondCents
                  ? ` sur un plafond de ${eurosAbsolus(categorie.plafondCents)}`
                  : ''
              }`}
            >
              <rect
                x={0}
                y={0}
                width={100}
                height={HAUTEUR_BARRE}
                fill={depasse ? 'var(--fond)' : 'var(--trait)'}
                opacity={depasse ? 0.35 : 1}
              />
              <rect
                x={0}
                y={0}
                width={Math.min(100, (categorie.depenseCents / maximum) * 100)}
                height={HAUTEUR_BARRE}
                fill={depasse ? 'var(--fond)' : 'var(--texte)'}
              />
              {/* Le plafond : un trait vertical, pas une seconde barre — on
                  compare une longueur à un repère, pas deux longueurs. */}
              {categorie.plafondCents !== null ? (
                <rect
                  x={Math.min(99, (categorie.plafondCents / maximum) * 100)}
                  y={-1}
                  width={0.8}
                  height={HAUTEUR_BARRE + 2}
                  fill={depasse ? 'var(--fond)' : 'var(--texte)'}
                />
              ) : null}
            </svg>

            <div
              className={[
                'mt-1 flex flex-wrap gap-x-3 text-11',
                depasse ? 'text-echec/80' : 'text-secondaire',
              ].join(' ')}
            >
              <span className="chiffres">
                {categorie.variationCents === 0
                  ? '='
                  : `${categorie.variationCents > 0 ? '+' : '−'}${eurosAbsolus(categorie.variationCents)}`}{' '}
                vs mois dernier
              </span>
              {categorie.plafondCents !== null ? (
                <span className="chiffres">
                  {Math.round((categorie.consommation ?? 0) * 100)} % de{' '}
                  {eurosAbsolus(categorie.plafondCents)}
                </span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Le total, en une ligne, sous les barres. */
export function TotalCategories({
  categories,
}: {
  categories: readonly CategorieDuMois[]
}) {
  const total = categories.reduce((somme, c) => somme + c.depenseCents, 0)
  if (total === 0) return null

  return (
    <p className="mt-3 flex items-baseline justify-between gap-4 text-13">
      <span className="libelle">Total catégorisé</span>
      <span className="chiffres">{euros(total)}</span>
    </p>
  )
}
