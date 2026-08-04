'use client'

import { useState, useTransition } from 'react'
import { exporterTout } from '@/lib/actions/export'

export function BoutonExport() {
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  return (
    <>
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            try {
              setErreur(null)
              const contenu = await exporterTout()
              const lien = document.createElement('a')
              lien.href = URL.createObjectURL(
                new Blob([contenu], { type: 'application/json' }),
              )
              lien.download = `deuxieme-cerveau-${Date.now()}.json`
              lien.click()
              URL.revokeObjectURL(lien.href)
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "L'export a échoué.")
            }
          })
        }
        className="transition-etat h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
      >
        {enCours ? 'Export…' : 'Exporter toutes mes données'}
      </button>
      {erreur ? <p role="alert" className="mt-2 text-13">{erreur}</p> : null}
    </>
  )
}
