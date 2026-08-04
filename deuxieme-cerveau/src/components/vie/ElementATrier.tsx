'use client'

import { useState, useTransition } from 'react'
import { convertirInbox, jeterInbox } from '@/lib/actions/vie'
import type { ElementInbox } from '@/lib/donnees/vie'

const CIBLES = [
  { cle: 'tache', nom: 'Tâche' },
  { cle: 'note', nom: 'Note' },
  { cle: 'evenement', nom: 'Événement' },
  { cle: 'depense', nom: 'Dépense' },
] as const

/**
 * Un élément capturé, et sa conversion.
 *
 * Le type deviné pré-sélectionne un bouton mais n'impose rien : la devinette
 * doit accélérer le tri, jamais le contraindre. Une dépense demande en plus un
 * montant et un compte — c'est la seule conversion qui ne peut pas se déduire
 * du seul texte.
 */
export function ElementATrier({
  element,
  comptes,
}: {
  element: ElementInbox
  comptes: { id: string; nom: string }[]
}) {
  const [cible, setCible] = useState<string | null>(element.typeDevine)
  const [montant, setMontant] = useState('')
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  return (
    <li className="border-b border-trait py-3 last:border-b-0">
      <p className="text-15">{element.contenu}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {CIBLES.map((c) => (
          <button
            key={c.cle}
            type="button"
            onClick={() => setCible(c.cle)}
            aria-pressed={cible === c.cle}
            className={[
              'cible flex-1 border px-2 text-13',
              cible === c.cle ? 'border-texte bg-texte text-fond' : 'border-trait',
            ].join(' ')}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {cible === 'depense' ? (
        <div className="mt-2 flex gap-2">
          <input
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            aria-label="Montant"
            placeholder="0,00"
            className="chiffres h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          {comptes.length > 1 ? (
            <select
              value={compteId}
              onChange={(e) => setCompteId(e.target.value)}
              aria-label="Compte"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-2 outline-none focus:border-texte"
            >
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      {erreur ? <p role="alert" className="mt-2 text-13">{erreur}</p> : null}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={enCours || cible === null}
          onClick={() =>
            demarrer(async () => {
              try {
                setErreur(null)
                await convertirInbox(element.id, cible as 'tache', { montant, compteId })
              } catch (e) {
                setErreur(e instanceof Error ? e.message : 'La conversion a échoué.')
              }
            })
          }
          className="cible flex-1 border border-texte bg-texte text-13 text-fond disabled:opacity-40"
        >
          Convertir
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => demarrer(() => jeterInbox(element.id))}
          className="cible w-24 border border-trait text-13 text-secondaire"
        >
          Jeter
        </button>
      </div>
    </li>
  )
}
