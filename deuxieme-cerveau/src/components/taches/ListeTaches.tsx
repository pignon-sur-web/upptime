'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { Case } from '@/components/ui/Case'
import { completerTache, reporterTache } from '@/lib/actions/taches'
import { priorite as libellePriorite } from '@/lib/enums'
import { jourRelatif } from '@/lib/date'
import type { Tache } from '@/lib/donnees/taches'

/**
 * La liste cochable des tâches.
 *
 * Cocher passe par `completer_tache` côté base, qui génère l'occurrence
 * suivante d'une tâche récurrente. Le retour optimiste fait disparaître la
 * ligne à l'instant du tap : sur un réseau lent, attendre la réponse donnerait
 * l'impression que rien ne s'est passé et on taperait deux fois — d'où
 * l'idempotence de la fonction SQL.
 *
 * Le report est replié derrière un appui sur la ligne plutôt qu'affiché en
 * permanence : deux boutons par tâche rempliraient l'écran d'affordances qu'on
 * utilise une fois sur vingt.
 */
export function ListeTaches({
  taches,
  sousTaches,
  montrerJour = false,
}: {
  taches: Tache[]
  sousTaches?: Record<string, Tache[]>
  /** Affiche l'échéance à droite — utile hors de la vue Aujourd'hui. */
  montrerJour?: boolean
}) {
  const [, demarrer] = useTransition()
  const [affichees, retirer] = useOptimistic(taches, (etat: Tache[], id: string) =>
    etat.filter((t) => t.id !== id),
  )

  return (
    <ul>
      {affichees.map((tache) => (
        <LigneTache
          key={tache.id}
          tache={tache}
          sousTaches={sousTaches?.[tache.id] ?? []}
          montrerJour={montrerJour}
          onCompleter={() =>
            demarrer(async () => {
              retirer(tache.id)
              await completerTache(tache.id)
            })
          }
          onReporter={(vers) =>
            demarrer(async () => {
              retirer(tache.id)
              await reporterTache(tache.id, vers)
            })
          }
        />
      ))}
    </ul>
  )
}

function LigneTache({
  tache,
  sousTaches,
  montrerJour,
  onCompleter,
  onReporter,
}: {
  tache: Tache
  sousTaches: Tache[]
  montrerJour: boolean
  onCompleter: () => void
  onReporter: (vers: 'demain' | 'semaine-prochaine') => void
}) {
  const [ouverte, setOuverte] = useState(false)
  const p = libellePriorite(tache.priorite)

  const faites = sousTaches.filter((s) => s.statut === 'fait').length

  return (
    <li className="border-b border-trait last:border-b-0">
      <div className="flex items-start gap-1">
        <Case cochee={false} onToggle={onCompleter} libelle={`Terminer : ${tache.titre}`} />

        <button
          type="button"
          onClick={() => setOuverte((o) => !o)}
          aria-expanded={ouverte}
          className="cible flex min-w-0 flex-1 items-start justify-between gap-3 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-15">{tache.titre}</span>

            {p || tache.projetNom || sousTaches.length > 0 || tache.recurrence ? (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-11 text-secondaire">
                {p ? <span className="chiffres">{p.court}</span> : null}
                {tache.projetNom ? <span className="truncate">{tache.projetNom}</span> : null}
                {sousTaches.length > 0 ? (
                  <span className="chiffres">
                    {faites}/{sousTaches.length}
                  </span>
                ) : null}
                {tache.recurrence ? <span aria-label="récurrente">↻</span> : null}
              </span>
            ) : null}
          </span>

          {montrerJour && tache.echeance ? (
            <span className="chiffres shrink-0 pt-0.5 text-11 text-secondaire">
              {jourRelatif(tache.echeance)}
            </span>
          ) : null}
        </button>
      </div>

      {ouverte ? (
        <div className="pb-3 pl-11">
          {sousTaches.length > 0 ? (
            <ul className="mb-2">
              {sousTaches.map((sous) => (
                <li key={sous.id} className="flex items-center gap-2 py-1">
                  <span aria-hidden className="text-11 text-secondaire">
                    {sous.statut === 'fait' ? '■' : '□'}
                  </span>
                  <span
                    className={[
                      'text-13',
                      sous.statut === 'fait' ? 'text-secondaire line-through' : '',
                    ].join(' ')}
                  >
                    {sous.titre}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {tache.note ? (
            <p className="mb-2 text-13 text-secondaire">{tache.note}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onReporter('demain')}
              className="cible flex-1 border border-trait text-13"
            >
              Demain
            </button>
            <button
              type="button"
              onClick={() => onReporter('semaine-prochaine')}
              className="cible flex-1 border border-trait text-13"
            >
              Lundi prochain
            </button>
            <Link
              href={`/taches/${tache.id}`}
              className="cible flex flex-1 items-center justify-center border border-trait text-13"
            >
              Ouvrir
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  )
}
