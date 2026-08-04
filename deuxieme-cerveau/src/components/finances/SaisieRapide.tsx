'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { creerTransaction } from '@/lib/actions/finances'

/**
 * Saisie d'une transaction en moins de cinq secondes.
 *
 * Trois champs visibles — montant, libellé, dépense ou revenu — et le reste
 * est déduit : le compte est mémorisé du dernier usage, la date est celle du
 * jour, le signe vient du genre. C'est le geste du soir, il ne doit pas
 * demander de réflexion.
 *
 * `inputMode="decimal"` fait apparaître le pavé numérique sur iOS, avec la
 * virgule. Le champ reste en `text` : `type="number"` refuse la virgule dans
 * plusieurs navigateurs et ampute la saisie sans rien dire.
 */
export function SaisieRapide({
  comptes,
}: {
  comptes: { id: string; nom: string }[]
}) {
  const formulaire = useRef<HTMLFormElement>(null)
  const [genre, setGenre] = useState<'depense' | 'revenu'>('depense')
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  const action = async (donnees: FormData) => {
    try {
      setErreur(null)
      await creerTransaction(donnees)
      formulaire.current?.reset()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La saisie a échoué.')
    }
  }

  return (
    <form ref={formulaire} action={action}>
      <input type="hidden" name="genre" value={genre} />
      <input type="hidden" name="compteId" value={compteId} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGenre('depense')}
          aria-pressed={genre === 'depense'}
          className={[
            'cible flex-1 border text-13',
            genre === 'depense' ? 'border-texte bg-texte text-fond' : 'border-trait',
          ].join(' ')}
        >
          Dépense
        </button>
        <button
          type="button"
          onClick={() => setGenre('revenu')}
          aria-pressed={genre === 'revenu'}
          className={[
            'cible flex-1 border text-13',
            genre === 'revenu' ? 'border-texte bg-texte text-fond' : 'border-trait',
          ].join(' ')}
        >
          Revenu
        </button>
      </div>

      <input
        name="montant"
        inputMode="decimal"
        required
        aria-label="Montant"
        placeholder="0,00"
        className="chiffres mt-2 h-14 w-full border border-trait bg-fond px-3 text-24 outline-none focus:border-texte"
      />

      <input
        name="libelle"
        required
        maxLength={120}
        aria-label="Libellé"
        placeholder="Courses, essence, restaurant…"
        className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      <input
        name="categorie"
        maxLength={60}
        aria-label="Catégorie"
        placeholder="Catégorie (facultatif)"
        className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      {comptes.length > 1 ? (
        <select
          value={compteId}
          onChange={(e) => setCompteId(e.target.value)}
          aria-label="Compte"
          className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
        >
          {comptes.map((compte) => (
            <option key={compte.id} value={compte.id}>
              {compte.nom}
            </option>
          ))}
        </select>
      ) : null}

      {erreur ? (
        <p role="alert" className="mt-2 text-13">
          {erreur}
        </p>
      ) : null}

      <BoutonSaisir genre={genre} />
    </form>
  )
}

function BoutonSaisir({ genre }: { genre: 'depense' | 'revenu' }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
    >
      {pending ? 'Enregistrement…' : genre === 'depense' ? 'Ajouter la dépense' : 'Ajouter le revenu'}
    </button>
  )
}
