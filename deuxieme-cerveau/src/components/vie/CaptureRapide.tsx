'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { capturer } from '@/lib/actions/vie'

export function CaptureRapide() {
  const formulaire = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formulaire}
      action={async (donnees) => {
        await capturer(donnees)
        formulaire.current?.reset()
      }}
      className="flex gap-2"
    >
      <input
        name="contenu"
        required
        autoFocus
        maxLength={2000}
        aria-label="Capturer"
        placeholder="N'importe quoi, on triera après"
        className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
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
      aria-label="Capturer"
      className="transition-etat w-14 shrink-0 border border-texte bg-texte text-18 text-fond disabled:opacity-40"
    >
      +
    </button>
  )
}
