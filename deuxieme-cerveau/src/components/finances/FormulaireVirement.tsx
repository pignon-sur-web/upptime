'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { creerVirement } from '@/lib/actions/finances'

/**
 * Une seule saisie, deux écritures.
 *
 * L'insertion passe par la fonction SQL `enregistrer_virement` : deux
 * insertions depuis ici pourraient réussir à moitié, et un virement à une
 * seule jambe fausse le solde sans que rien ne le signale.
 */
export function FormulaireVirement({
  comptes,
}: {
  comptes: { id: string; nom: string }[]
}) {
  const [erreur, setErreur] = useState<string | null>(null)
  const [source, setSource] = useState(comptes[0]?.id ?? '')
  const [destination, setDestination] = useState(comptes[1]?.id ?? '')

  const action = async (donnees: FormData) => {
    try {
      setErreur(null)
      await creerVirement(donnees)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le virement a échoué.')
    }
  }

  return (
    <form action={action}>
      <label htmlFor="source" className="libelle">Depuis</label>
      <select
        id="source"
        name="source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      >
        {comptes.map((c) => (
          <option key={c.id} value={c.id}>{c.nom}</option>
        ))}
      </select>

      <label htmlFor="destination" className="libelle mt-3 block">Vers</label>
      <select
        id="destination"
        name="destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      >
        {comptes.map((c) => (
          <option key={c.id} value={c.id}>{c.nom}</option>
        ))}
      </select>

      {source === destination ? (
        <p className="mt-2 text-13">Les deux comptes doivent différer.</p>
      ) : null}

      <label htmlFor="montant" className="libelle mt-3 block">Montant</label>
      <input
        id="montant"
        name="montant"
        inputMode="decimal"
        required
        placeholder="0,00"
        className="chiffres mt-1 h-14 w-full border border-trait bg-fond px-3 text-24 outline-none focus:border-texte"
      />

      <label htmlFor="libelle" className="libelle mt-3 block">Libellé</label>
      <input
        id="libelle"
        name="libelle"
        maxLength={120}
        placeholder="Virement"
        className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      {erreur ? <p role="alert" className="mt-3 text-13">{erreur}</p> : null}

      <Bouton desactive={source === destination} />
    </form>
  )
}

function Bouton({ desactive }: { desactive: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || desactive}
      className="transition-etat mt-4 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
    >
      {pending ? 'Virement…' : 'Virer'}
    </button>
  )
}
