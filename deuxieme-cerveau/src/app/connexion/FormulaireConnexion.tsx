'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { connecter, type EtatConnexion } from '@/lib/actions/auth'

const ETAT_INITIAL: EtatConnexion = { erreur: null }

export function FormulaireConnexion({ suite }: { suite: string }) {
  const [etat, action] = useActionState(connecter, ETAT_INITIAL)

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="suite" value={suite} />

      <label htmlFor="motDePasse" className="libelle">
        Mot de passe
      </label>
      <input
        id="motDePasse"
        name="motDePasse"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        aria-describedby={etat.erreur ? 'erreur-connexion' : undefined}
        className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      {etat.erreur ? (
        <p id="erreur-connexion" role="alert" className="mt-3 text-13">
          {etat.erreur}
        </p>
      ) : null}

      <BoutonEnvoyer />
    </form>
  )
}

function BoutonEnvoyer() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="transition-etat mt-6 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
    >
      {pending ? 'Vérification…' : 'Entrer'}
    </button>
  )
}
