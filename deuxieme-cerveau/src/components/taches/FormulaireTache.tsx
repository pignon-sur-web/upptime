'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { creerTache } from '@/lib/actions/taches'
import { ANCRAGES, CONTEXTES, PRIORITES, RECURRENCES } from '@/lib/enums'
import { aujourdhui, decaler } from '@/lib/date'

/**
 * Saisie d'une tâche.
 *
 * Le champ titre suffit : tout le reste est replié derrière « Détails ». La
 * capture doit rester d'un seul geste, sinon on ne capture plus rien. Les deux
 * raccourcis d'échéance (aujourd'hui, demain) couvrent l'écrasante majorité des
 * cas sans ouvrir de sélecteur de date.
 */
export function FormulaireTache({
  projets,
}: {
  projets: { id: string; nom: string }[]
}) {
  const formulaire = useRef<HTMLFormElement>(null)
  const [details, setDetails] = useState(false)
  const [recurrence, setRecurrence] = useState('')
  const [echeance, setEcheance] = useState('')

  const action = async (donnees: FormData) => {
    await creerTache(donnees)
    formulaire.current?.reset()
    setEcheance('')
    setRecurrence('')
    setDetails(false)
  }

  return (
    <form ref={formulaire} action={action}>
      <input
        name="titre"
        required
        maxLength={200}
        aria-label="Titre de la tâche"
        placeholder="Quelque chose à faire…"
        className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
      />

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setEcheance(echeance === aujourdhui() ? '' : aujourdhui())}
          className={[
            'cible flex-1 border text-13',
            echeance === aujourdhui()
              ? 'border-texte bg-texte text-fond'
              : 'border-trait',
          ].join(' ')}
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          onClick={() =>
            setEcheance(echeance === decaler(aujourdhui(), 1) ? '' : decaler(aujourdhui(), 1))
          }
          className={[
            'cible flex-1 border text-13',
            echeance === decaler(aujourdhui(), 1)
              ? 'border-texte bg-texte text-fond'
              : 'border-trait',
          ].join(' ')}
        >
          Demain
        </button>
        <button
          type="button"
          onClick={() => setDetails((d) => !d)}
          aria-expanded={details}
          className="cible flex-1 border border-trait text-13 text-secondaire"
        >
          Détails
        </button>
      </div>

      <input type="hidden" name="echeance" value={echeance} />

      {details ? (
        <div className="mt-3">
          <label className="libelle" htmlFor="echeance-precise">
            Échéance
          </label>
          <input
            id="echeance-precise"
            type="date"
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
            className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />

          <label className="libelle mt-3 block" htmlFor="priorite">
            Priorité
          </label>
          <select
            id="priorite"
            name="priorite"
            defaultValue=""
            className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          >
            <option value="">Aucune</option>
            {PRIORITES.map((p) => (
              <option key={p.valeur} value={p.valeur}>
                {p.nom}
              </option>
            ))}
          </select>

          <label className="libelle mt-3 block" htmlFor="contexte">
            Contexte
          </label>
          <select
            id="contexte"
            name="contexte"
            defaultValue=""
            className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          >
            <option value="">Aucun</option>
            {Object.entries(CONTEXTES).map(([cle, nom]) => (
              <option key={cle} value={cle}>
                {nom}
              </option>
            ))}
          </select>

          <label className="libelle mt-3 block" htmlFor="projetId">
            Projet
          </label>
          <select
            id="projetId"
            name="projetId"
            defaultValue=""
            className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          >
            <option value="">Aucun</option>
            {projets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>

          <label className="libelle mt-3 block" htmlFor="recurrence">
            Récurrence
          </label>
          <select
            id="recurrence"
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          >
            <option value="">Aucune</option>
            {Object.entries(RECURRENCES).map(([cle, nom]) => (
              <option key={cle} value={cle}>
                {nom}
              </option>
            ))}
          </select>

          {recurrence ? (
            <>
              <label className="libelle mt-3 block" htmlFor="ancrage">
                Repart
              </label>
              <select
                id="ancrage"
                name="ancrage"
                defaultValue="schedule"
                className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
              >
                {Object.entries(ANCRAGES).map(([cle, nom]) => (
                  <option key={cle} value={cle}>
                    {nom}
                  </option>
                ))}
              </select>
              {/* Ce choix n'est pas cosmétique : « à date fixe » convient au
                  loyer, « après chaque fois » à ce qu'on refait N jours après
                  l'avoir vraiment fait. Se tromper est visible et agaçant. */}
              <p className="mt-1 text-11 text-secondaire">
                À date fixe pour un loyer. Après chaque fois pour arroser les
                plantes.
              </p>
            </>
          ) : null}

          <label className="libelle mt-3 block" htmlFor="note">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
          />
        </div>
      ) : null}

      <BoutonAjouter />
    </form>
  )
}

function BoutonAjouter() {
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
