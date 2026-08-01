import { euros } from '@/lib/argent'
import { jourCourt } from '@/lib/date'
import { supprimerEcriture, supprimerVirement } from '@/lib/actions/finances'
import type { Transaction } from '@/lib/donnees/finances'

/**
 * Le grand livre.
 *
 * Deux natures d'écriture ont un traitement particulier, et pour la même
 * raison : elles ne se suppriment pas comme les autres.
 *
 * **Les ajustements** portent un `≠` et un filet gauche de 2px. Ils ne se
 * modifient pas — corriger une correction n'a pas de sens, on en refait une —
 * et les supprimer prévient de l'effet sur le solde.
 *
 * **Les virements** n'ont pas de suppression individuelle. Retirer une seule
 * jambe ferait quitter l'argent d'un compte sans qu'il arrive nulle part, et
 * le solde serait faux en silence. La ligne propose « Supprimer le virement »,
 * qui appelle la fonction SQL et emporte les deux jambes ensemble.
 */
export function ListeTransactions({
  transactions,
  afficherCompte = true,
}: {
  transactions: readonly Transaction[]
  afficherCompte?: boolean
}) {
  if (transactions.length === 0) return null

  return (
    <ul>
      {transactions.map((tx) => {
        const ajustement = tx.nature === 'ajustement'
        const virement = tx.groupeVirement !== null

        return (
          <li
            key={tx.id}
            className={[
              'flex items-baseline gap-3 border-b border-trait py-2 last:border-b-0',
              ajustement ? 'border-l-2 border-l-texte pl-3' : '',
            ].join(' ')}
          >
            <span className="chiffres w-12 shrink-0 text-11 text-secondaire">
              {jourCourt(tx.date)}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                {ajustement ? (
                  <span aria-label="ajustement" className="chiffres shrink-0 text-13">
                    ≠
                  </span>
                ) : null}
                {virement ? (
                  <span aria-label="virement" className="shrink-0 text-13">
                    ⇄
                  </span>
                ) : null}
                <span className="truncate text-13">{tx.libelle}</span>
              </span>

              <span className="block text-11 text-secondaire">
                {[afficherCompte ? tx.compteNom : null, tx.categorie]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>

            <span className="chiffres shrink-0 text-13">{euros(tx.montantCents)}</span>

            {virement ? (
              <form action={supprimerVirement.bind(null, tx.groupeVirement ?? '')}>
                <button
                  type="submit"
                  aria-label={`Supprimer le virement : ${tx.libelle}`}
                  title="Supprime les deux jambes du virement"
                  className="shrink-0 px-1 text-13 text-secondaire"
                >
                  ×
                </button>
              </form>
            ) : (
              <form action={supprimerEcriture.bind(null, tx.id)}>
                <button
                  type="submit"
                  aria-label={
                    ajustement
                      ? `Supprimer cet ajustement : le solde bougera de ${euros(-tx.montantCents)}`
                      : `Supprimer : ${tx.libelle}`
                  }
                  title={
                    ajustement
                      ? `Supprimer cet ajustement fera bouger le solde de ${euros(-tx.montantCents)}`
                      : undefined
                  }
                  className="shrink-0 px-1 text-13 text-secondaire"
                >
                  ×
                </button>
              </form>
            )}
          </li>
        )
      })}
    </ul>
  )
}
