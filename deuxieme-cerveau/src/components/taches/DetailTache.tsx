'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Case } from '@/components/ui/Case'
import {
  completerTache,
  creerTache,
  modifierTache,
  passerTache,
  rouvrirTache,
  supprimerTache,
} from '@/lib/actions/taches'
import { ANCRAGES, CONTEXTES, PRIORITES, RECURRENCES } from '@/lib/enums'
import type { Tache } from '@/lib/donnees/taches'

/**
 * Détail d'une tâche : modification, sous-tâches, suppression.
 *
 * Les sous-tâches sont limitées à un niveau, conformément au cahier des
 * charges : c'est ce qui empêche l'app de redevenir un Notion à blocs
 * imbriqués.
 */
export function DetailTache({
  tache,
  sousTaches,
  projets,
}: {
  tache: Tache
  sousTaches: Tache[]
  projets: { id: string; nom: string }[]
}) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const [recurrence, setRecurrence] = useState(tache.recurrence ?? '')
  const [confirmation, setConfirmation] = useState(false)

  const faite = tache.statut === 'fait'

  return (
    <>
      <form action={modifierTache.bind(null, tache.id)}>
        <input
          name="titre"
          defaultValue={tache.titre}
          required
          maxLength={200}
          aria-label="Titre"
          className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
        />

        <label className="libelle mt-3 block" htmlFor="echeance">
          Échéance
        </label>
        <input
          id="echeance"
          type="date"
          name="echeance"
          defaultValue={tache.echeance ?? ''}
          className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
        />

        <label className="libelle mt-3 block" htmlFor="priorite">
          Priorité
        </label>
        <select
          id="priorite"
          name="priorite"
          defaultValue={tache.priorite ?? ''}
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
          defaultValue={tache.contexte ?? ''}
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
          defaultValue={tache.projetId ?? ''}
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
              defaultValue={tache.ancrage}
              className="mt-1 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
            >
              {Object.entries(ANCRAGES).map(([cle, nom]) => (
                <option key={cle} value={cle}>
                  {nom}
                </option>
              ))}
            </select>
            <p className="mt-1 text-11 text-secondaire">
              La modification prend effet à la prochaine complétion.
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
          defaultValue={tache.note ?? ''}
          className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
        />

        <button
          type="submit"
          className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
        >
          Enregistrer
        </button>
      </form>

      <div className="mt-4 flex gap-2">
        {faite ? (
          <button
            type="button"
            disabled={enCours}
            onClick={() => demarrer(() => rouvrirTache(tache.id))}
            className="cible flex-1 border border-trait text-13"
          >
            Rouvrir
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={enCours}
              onClick={() => demarrer(() => completerTache(tache.id))}
              className="cible flex-1 border border-trait text-13"
            >
              Terminer
            </button>
            {tache.recurrence ? (
              <button
                type="button"
                disabled={enCours}
                onClick={() => demarrer(() => passerTache(tache.id))}
                className="cible flex-1 border border-trait text-13"
              >
                Passer
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-6">
        <h2 className="libelle">Sous-tâches</h2>
        {sousTaches.length > 0 ? (
          <ul className="mt-2">
            {sousTaches.map((sous) => (
              <li
                key={sous.id}
                className="flex items-center gap-2 border-b border-trait last:border-b-0"
              >
                <Case
                  cochee={sous.statut === 'fait'}
                  libelle={sous.titre}
                  onToggle={() =>
                    demarrer(() =>
                      sous.statut === 'fait'
                        ? rouvrirTache(sous.id)
                        : completerTache(sous.id),
                    )
                  }
                />
                <span
                  className={[
                    'flex-1 py-2 text-13',
                    sous.statut === 'fait' ? 'text-secondaire line-through' : '',
                  ].join(' ')}
                >
                  {sous.titre}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          action={async (donnees) => {
            await creerTache(donnees)
          }}
          className="mt-2 flex gap-2"
        >
          <input type="hidden" name="tacheParenteId" value={tache.id} />
          <input
            name="titre"
            required
            maxLength={200}
            aria-label="Nouvelle sous-tâche"
            placeholder="Ajouter une sous-tâche"
            className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <button type="submit" className="cible w-14 border border-trait text-18">
            +
          </button>
        </form>
      </div>

      <div className="mt-8 border-t border-trait pt-4">
        {confirmation ? (
          <>
            <p className="text-13">
              {tache.recurrence
                ? 'Supprimer met fin à la série : aucune occurrence suivante ne sera créée.'
                : 'Les sous-tâches seront supprimées avec elle.'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmation(false)}
                className="cible flex-1 border border-trait text-13"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    await supprimerTache(tache.id)
                    router.push('/taches')
                  })
                }
                className="cible flex-1 border border-texte bg-texte text-13 text-fond"
              >
                Supprimer
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmation(true)}
            className="cible w-full text-13 text-secondaire"
          >
            Supprimer cette tâche
          </button>
        )}
      </div>
    </>
  )
}
