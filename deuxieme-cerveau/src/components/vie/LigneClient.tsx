'use client'

import { useTransition } from 'react'
import { contacterClient } from '@/lib/actions/vie'
import { formater } from '@/lib/argent'
import { jourRelatif } from '@/lib/date'
import type { Client } from '@/lib/donnees/vie'

export function LigneClient({ client }: { client: Client }) {
  const [enCours, demarrer] = useTransition()

  return (
    <li
      className={[
        'border-b border-trait py-2 last:border-b-0',
        client.aRelancer ? 'border-l-2 border-l-texte pl-3' : '',
      ].join(' ')}
    >
      <span className="flex items-baseline justify-between gap-4">
        <span className="truncate text-15">{client.nom}</span>
        {client.valeurCents !== null ? (
          <span className="chiffres shrink-0 text-13">{formater(client.valeurCents)}</span>
        ) : null}
      </span>

      <span className="block text-11 text-secondaire">
        {client.dernierContact
          ? `dernier contact ${jourRelatif(client.dernierContact)}`
          : 'jamais contacté'}
        {client.prochaineRelance ? ` · relance ${jourRelatif(client.prochaineRelance)}` : ''}
      </span>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={enCours}
          onClick={() => demarrer(() => contacterClient(client.id))}
          className="cible flex-1 border border-trait text-13"
        >
          Contacté aujourd&apos;hui
        </button>
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="cible flex w-24 items-center justify-center border border-trait text-13"
          >
            Écrire
          </a>
        ) : null}
      </div>
    </li>
  )
}
