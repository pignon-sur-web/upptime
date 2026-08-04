'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { creerEcheance } from '@/lib/actions/finances'
import { RECURRENCES } from '@/lib/enums'

export function FormulaireEcheance({
  comptes,
}: {
  comptes: { id: string; nom: string }[]
}) {
  const formulaire = useRef<HTMLFormElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const action = async (donnees: FormData) => {
    try {
      setErreur(null)
      await creerEcheance(donnees)
      formulaire.current?.reset()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'ajout a échoué.")
    }
  }

  return (
    <form ref={formulaire} action={action}>
      <input
        name="nom"
        required
        maxLength={120}
        aria-label="Nom"
        placeholder="Loyer, assurance, abonnement…"
        className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      <div className="mt-2 flex gap-2">
        <input
          name="montant"
          inputMode="decimal"
          required
          aria-label="Montant"
          placeholder="0,00"
          className="chiffres h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
        />
        <input
          name="jour"
          type="date"
          required
          aria-label="Échéance"
          className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
        />
      </div>

      <select
        name="recurrence"
        defaultValue=""
        aria-label="Récurrence"
        className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      >
        <option value="">Une seule fois</option>
        {Object.entries(RECURRENCES).map(([cle, nom]) => (
          <option key={cle} value={cle}>{nom}</option>
        ))}
      </select>

      {comptes.length > 0 ? (
        <select
          name="compteId"
          defaultValue=""
          aria-label="Compte"
          className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
        >
          <option value="">Compte à choisir au paiement</option>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      ) : null}

      <input
        name="categorie"
        maxLength={60}
        aria-label="Catégorie"
        placeholder="Catégorie (facultatif)"
        className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      {erreur ? <p role="alert" className="mt-2 text-13">{erreur}</p> : null}

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
      {pending ? 'Ajout…' : 'Ajouter'}
    </button>
  )
}
