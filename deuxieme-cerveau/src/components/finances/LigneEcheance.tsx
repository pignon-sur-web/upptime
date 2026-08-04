'use client'

import { useState, useTransition } from 'react'
import { payerEcheance } from '@/lib/actions/finances'
import { formater } from '@/lib/argent'
import { aujourdhui, ecartJours, jourRelatif } from '@/lib/date'
import type { Echeance } from '@/lib/donnees/finances'

/**
 * Une échéance à venir.
 *
 * « Payé » ne pose pas un booléen : la fonction SQL crée l'écriture
 * correspondante et relie les deux. Sans ce lien, « payé » flotterait à côté
 * de l'argent réel et les soldes dériveraient en silence.
 */
export function LigneEcheance({
  echeance,
  comptes,
}: {
  echeance: Echeance
  comptes: { id: string; nom: string }[]
}) {
  const [ouverte, setOuverte] = useState(false)
  const [compteId, setCompteId] = useState(echeance.compteId ?? comptes[0]?.id ?? '')
  const [enCours, demarrer] = useTransition()

  const enRetard = ecartJours(echeance.jour, aujourdhui()) > 0

  return (
    <li
      className={[
        'border-b border-trait last:border-b-0',
        enRetard ? 'border-l-2 border-l-texte pl-3' : '',
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
            {echeance.nom}
            {echeance.recurrence ? <span aria-label="récurrente"> ↻</span> : null}
          </span>
          <span className="chiffres block text-11 text-secondaire">
            {jourRelatif(echeance.jour)}
          </span>
        </span>
        <span className="chiffres shrink-0 text-13">{formater(echeance.montantCents)}</span>
      </button>

      {ouverte ? (
        <div className="pb-3">
          {comptes.length > 1 ? (
            <select
              value={compteId}
              onChange={(e) => setCompteId(e.target.value)}
              aria-label="Compte à débiter"
              className="mb-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
            >
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            disabled={enCours || !compteId}
            onClick={() => demarrer(() => payerEcheance(echeance.id, compteId))}
            className="cible w-full border border-texte bg-texte text-13 text-fond disabled:opacity-40"
          >
            {enCours ? 'Enregistrement…' : 'Marquer payé'}
          </button>
          <p className="mt-1 text-11 text-secondaire">
            Une dépense de {formater(echeance.montantCents)} sera créée.
            {echeance.recurrence ? ' La prochaine échéance sera préparée.' : ''}
          </p>
        </div>
      ) : null}
    </li>
  )
}
