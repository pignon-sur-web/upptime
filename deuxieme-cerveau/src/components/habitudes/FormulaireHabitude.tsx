'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { creerHabitude, renommerHabitude } from '@/lib/actions/habitudes'
import type { Habitude } from '@/lib/donnees/habitudes'

const JOURS = [
  { valeur: 1, court: 'L' },
  { valeur: 2, court: 'M' },
  { valeur: 3, court: 'M' },
  { valeur: 4, court: 'J' },
  { valeur: 5, court: 'V' },
  { valeur: 6, court: 'S' },
  { valeur: 7, court: 'D' },
] as const

/**
 * Création ou modification d'une habitude.
 *
 * Le choix des jours n'est pas un détail : sans lui, une habitude qui ne
 * concerne que la semaine casserait sa série chaque samedi et fausserait le
 * dénominateur du score du week-end.
 */
export function FormulaireHabitude({ habitude }: { habitude?: Habitude }) {
  const formulaire = useRef<HTMLFormElement>(null)
  const modification = habitude !== undefined

  const action = async (donnees: FormData) => {
    if (modification) {
      await renommerHabitude(habitude.id, donnees)
    } else {
      await creerHabitude(donnees)
      formulaire.current?.reset()
    }
  }

  return (
    <form ref={formulaire} action={action}>
      <div className="flex gap-2">
        <input
          name="emoji"
          defaultValue={habitude?.emoji ?? ''}
          maxLength={4}
          aria-label="Emoji"
          placeholder="🙂"
          className="h-12 w-14 shrink-0 border border-trait bg-fond text-center outline-none focus:border-texte"
        />
        <input
          name="nom"
          defaultValue={habitude?.nom ?? ''}
          required
          maxLength={80}
          aria-label="Nom de l'habitude"
          placeholder="Lecture, sport, méditation…"
          className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
        />
      </div>

      <fieldset className="mt-3">
        <legend className="libelle">Jours</legend>
        <div className="mt-2 flex gap-1">
          {JOURS.map((jour) => {
            const coche = habitude
              ? habitude.joursSemaine.includes(jour.valeur)
              : true
            return (
              <label
                key={jour.valeur}
                className="cible relative flex flex-1 items-center justify-center border border-trait has-checked:border-texte has-checked:bg-texte has-checked:text-fond"
              >
                <input
                  type="checkbox"
                  name="jours"
                  value={jour.valeur}
                  defaultChecked={coche}
                  className="absolute size-full cursor-pointer opacity-0"
                />
                <span className="text-13">{jour.court}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <BoutonEnvoyer modification={modification} />
    </form>
  )
}

function BoutonEnvoyer({ modification }: { modification: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
    >
      {pending ? 'Enregistrement…' : modification ? 'Enregistrer' : 'Ajouter'}
    </button>
  )
}
