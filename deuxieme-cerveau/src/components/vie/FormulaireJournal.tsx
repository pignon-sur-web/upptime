'use client'

import { useFormStatus } from 'react-dom'
import { enregistrerJournal } from '@/lib/actions/vie'
import type { EntreeJournal } from '@/lib/donnees/journal'

const HUMEURS = [1, 2, 3, 4, 5]

export function FormulaireJournal({
  jour,
  entree,
}: {
  jour: string
  entree: EntreeJournal | null
}) {
  return (
    <form action={enregistrerJournal.bind(null, jour)}>
      <fieldset>
        <legend className="libelle">Humeur</legend>
        <div className="mt-2 flex gap-1">
          {HUMEURS.map((valeur) => (
            <label
              key={valeur}
              className="cible relative flex flex-1 items-center justify-center border border-trait has-checked:border-texte has-checked:bg-texte has-checked:text-fond"
            >
              <input
                type="radio"
                name="humeur"
                value={valeur}
                defaultChecked={entree?.humeur === valeur}
                className="absolute size-full cursor-pointer opacity-0"
              />
              <span className="chiffres text-15">{valeur}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="fait" className="libelle mt-4 block">Ce qui a été fait</label>
      <textarea
        id="fait"
        name="fait"
        rows={3}
        defaultValue={entree?.fait ?? ''}
        className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
      />

      <label htmlFor="reporte" className="libelle mt-3 block">À reporter</label>
      <textarea
        id="reporte"
        name="reporte"
        rows={2}
        defaultValue={entree?.reporte ?? ''}
        className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
      />

      <label htmlFor="note" className="libelle mt-3 block">Note libre</label>
      <textarea
        id="note"
        name="note"
        rows={4}
        defaultValue={entree?.note ?? ''}
        className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
      />

      <Bouton />
    </form>
  )
}

function Bouton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
    >
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}
