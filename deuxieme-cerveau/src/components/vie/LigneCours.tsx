'use client'

import { useTransition } from 'react'
import { Jauge } from '@/components/ui/Jauge'
import { majProgressionCours } from '@/lib/actions/vie'
import type { Cours } from '@/lib/donnees/vie'

export function LigneCours({ cours }: { cours: Cours }) {
  const [enCours, demarrer] = useTransition()

  return (
    <li className="border-b border-trait py-3 last:border-b-0">
      <span className="flex items-baseline justify-between gap-4">
        {cours.lien ? (
          <a
            href={cours.lien}
            target="_blank"
            rel="noreferrer"
            className="truncate text-15 underline"
          >
            {cours.nom}
          </a>
        ) : (
          <span className="truncate text-15">{cours.nom}</span>
        )}
        <span className="chiffres shrink-0 text-13">{cours.progression} %</span>
      </span>

      {cours.matiere ? (
        <span className="block text-11 text-secondaire">{cours.matiere}</span>
      ) : null}

      <span className="mt-2 block">
        <Jauge valeur={cours.progression / 100} />
      </span>

      <div className="mt-2 flex gap-1">
        {[0, 25, 50, 75, 100].map((valeur) => (
          <button
            key={valeur}
            type="button"
            disabled={enCours}
            onClick={() => demarrer(() => majProgressionCours(cours.id, valeur))}
            className={[
              'cible flex-1 border text-11',
              cours.progression === valeur ? 'border-texte bg-texte text-fond' : 'border-trait',
            ].join(' ')}
          >
            {valeur}
          </button>
        ))}
      </div>
    </li>
  )
}
