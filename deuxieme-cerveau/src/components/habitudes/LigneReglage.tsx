'use client'

import { useState } from 'react'
import { FormulaireHabitude } from './FormulaireHabitude'
import {
  archiverHabitude,
  deplacerHabitude,
  reactiverHabitude,
} from '@/lib/actions/habitudes'
import type { Habitude } from '@/lib/donnees/habitudes'

const INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/** Une habitude dans l'écran de réglage : renommer, réordonner, archiver. */
export function LigneReglage({
  habitude,
  premiere,
  derniere,
}: {
  habitude: Habitude
  premiere: boolean
  derniere: boolean
}) {
  const [ouverte, setOuverte] = useState(false)
  const archivee = habitude.archiveeLe !== null
  const tousLesJours = habitude.joursSemaine.length === 7

  return (
    <li className="border-b border-trait last:border-b-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOuverte((o) => !o)}
          aria-expanded={ouverte}
          className="cible flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
        >
          {habitude.emoji ? (
            <span aria-hidden className="text-15">
              {habitude.emoji}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-15">{habitude.nom}</span>
            {!tousLesJours ? (
              <span className="chiffres block text-11 text-secondaire">
                {habitude.joursSemaine
                  .map((j) => INITIALES[j - 1])
                  .join(' ')}
              </span>
            ) : null}
          </span>
        </button>

        {!archivee ? (
          <>
            <BoutonAction
              libelle="Monter"
              signe="↑"
              disabled={premiere}
              action={() => deplacerHabitude(habitude.id, 'haut')}
            />
            <BoutonAction
              libelle="Descendre"
              signe="↓"
              disabled={derniere}
              action={() => deplacerHabitude(habitude.id, 'bas')}
            />
          </>
        ) : null}
      </div>

      {ouverte ? (
        <div className="pb-4">
          <FormulaireHabitude habitude={habitude} />

          <form
            action={
              archivee
                ? reactiverHabitude.bind(null, habitude.id)
                : archiverHabitude.bind(null, habitude.id)
            }
          >
            <button
              type="submit"
              className="cible mt-2 w-full border border-trait text-13 text-secondaire"
            >
              {archivee ? 'Réactiver' : 'Archiver'}
            </button>
          </form>

          {!archivee ? (
            <p className="mt-2 text-11 text-secondaire">
              Archiver retire l&apos;habitude à partir de demain. Les scores
              déjà enregistrés ne changent pas.
            </p>
          ) : (
            <p className="chiffres mt-2 text-11 text-secondaire">
              Archivée le {habitude.archiveeLe}
            </p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function BoutonAction({
  libelle,
  signe,
  disabled,
  action,
}: {
  libelle: string
  signe: string
  disabled: boolean
  action: () => Promise<void>
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        aria-label={libelle}
        className="flex size-11 items-center justify-center text-secondaire disabled:opacity-25"
      >
        {signe}
      </button>
    </form>
  )
}
