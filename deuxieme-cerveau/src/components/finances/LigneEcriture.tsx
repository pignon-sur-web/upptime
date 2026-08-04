'use client'

import { useState, useTransition } from 'react'
import { supprimerTransaction, supprimerVirement } from '@/lib/actions/finances'
import { formater } from '@/lib/argent'
import { jourCourt } from '@/lib/date'
import type { Ecriture } from '@/lib/donnees/finances'

/**
 * Une ligne du relevé.
 *
 * Deux genres se distinguent visuellement, et ce n'est pas décoratif :
 *
 * — Un **ajustement** porte un `≠` et un filet gauche de 2px. Il n'est pas
 *   modifiable : son montant n'a de sens que rapporté au solde calculé au
 *   moment du rapprochement. Le supprimer prévient de l'effet sur le solde.
 * — Une jambe de **virement** n'a pas de suppression individuelle, seulement
 *   « supprimer le virement », qui emporte les deux écritures. Supprimer une
 *   seule jambe ferait disparaître de l'argent d'un compte sans le faire
 *   apparaître ailleurs, et le solde serait faux sans que rien ne le dise.
 */
export function LigneEcriture({ ecriture }: { ecriture: Ecriture }) {
  const [ouverte, setOuverte] = useState(false)
  const [enCours, demarrer] = useTransition()

  const ajustement = ecriture.genre === 'ajustement'
  const virement = ecriture.groupeVirement !== null

  return (
    <li
      className={[
        'border-b border-trait last:border-b-0',
        ajustement ? 'border-l-2 border-l-texte pl-3' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        className="cible flex w-full items-baseline justify-between gap-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-13">
            {ajustement ? <span aria-label="ajustement">≠ </span> : null}
            {virement ? <span aria-label="virement">⇄ </span> : null}
            {ecriture.libelle}
          </span>
          <span className="flex gap-3 text-11 text-secondaire">
            <span className="chiffres">{jourCourt(ecriture.jour)}</span>
            {ecriture.categorie ? <span className="truncate">{ecriture.categorie}</span> : null}
          </span>
        </span>
        <span className="chiffres shrink-0 text-13">{formater(ecriture.montantCents)}</span>
      </button>

      {ouverte ? (
        <div className="pb-3">
          {ecriture.note ? (
            <p className="mb-2 text-11 text-secondaire">{ecriture.note}</p>
          ) : null}

          {ajustement ? (
            <p className="mb-2 text-11 text-secondaire">
              Écart constaté lors d&apos;un rapprochement. Non modifiable : le
              montant n&apos;a de sens que par rapport au solde calculé ce
              jour-là.
            </p>
          ) : null}

          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              demarrer(() =>
                virement
                  ? supprimerVirement(ecriture.groupeVirement!)
                  : supprimerTransaction(ecriture.id),
              )
            }
            className="cible w-full border border-trait text-13 text-secondaire"
          >
            {virement
              ? 'Supprimer le virement (les deux écritures)'
              : ajustement
                ? `Supprimer — le solde bougera de ${formater(-ecriture.montantCents)}`
                : "Supprimer l'écriture"}
          </button>
        </div>
      ) : null}
    </li>
  )
}
