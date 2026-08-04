'use client'

import { useState, useTransition } from 'react'
import { Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { creerResultatCle, majResultatCle } from '@/lib/actions/vie'
import type { Objectif } from '@/lib/donnees/vie'

/**
 * Un objectif et ses résultats clés.
 *
 * La progression vient de la base : (actuel − départ) / (cible − départ),
 * bornée. Cette forme gère gratuitement les résultats DÉCROISSANTS — perdre
 * 8 kg, de 86 vers 78, à 82 aujourd'hui, fait bien 50 %. Un simple
 * actuel/cible se tromperait.
 */
export function CarteObjectif({ objectif }: { objectif: Objectif }) {
  const [ajout, setAjout] = useState(false)
  const [, demarrer] = useTransition()

  return (
    <Widget
      libelle={objectif.nom}
      action={
        <span className="chiffres text-13">
          {objectif.progression === null
            ? '—'
            : `${Math.round(objectif.progression * 100)} %`}
        </span>
      }
    >
      <Jauge valeur={objectif.progression} hauteur={6} />

      {objectif.resultats.length === 0 ? (
        <p className="mt-3 text-13 text-secondaire">
          Sans résultat clé, la progression reste indéterminée — pas nulle.
        </p>
      ) : (
        <ul className="mt-4">
          {objectif.resultats.map((resultat) => (
            <li key={resultat.id} className="border-b border-trait py-3 last:border-b-0">
              <span className="flex items-baseline justify-between gap-4">
                <span className="truncate text-13">{resultat.nom}</span>
                <span className="chiffres shrink-0 text-13">
                  {Math.round(resultat.progression * 100)} %
                </span>
              </span>

              <span className="chiffres mt-1 block text-11 text-secondaire">
                {resultat.depart} → {resultat.actuel} / {resultat.cible}
                {resultat.unite ? ` ${resultat.unite}` : ''}
              </span>

              <form
                className="mt-2 flex gap-2"
                action={(donnees: FormData) => {
                  const valeur = Number(donnees.get('valeur'))
                  if (!Number.isFinite(valeur)) return
                  demarrer(() => majResultatCle(resultat.id, valeur))
                }}
              >
                <input
                  name="valeur"
                  inputMode="decimal"
                  defaultValue={resultat.actuel}
                  aria-label={`Valeur actuelle de ${resultat.nom}`}
                  className="chiffres h-11 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
                />
                <button type="submit" className="cible w-24 border border-trait text-13">
                  Mettre à jour
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {ajout ? (
        <form action={creerResultatCle.bind(null, objectif.id)} className="mt-4">
          <input
            name="nom"
            required
            maxLength={120}
            aria-label="Nom du résultat clé"
            placeholder="Poids, chiffre d'affaires, pages lues…"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="depart"
              inputMode="decimal"
              required
              aria-label="Valeur de départ"
              placeholder="Départ"
              className="chiffres h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="cible"
              inputMode="decimal"
              required
              aria-label="Cible"
              placeholder="Cible"
              className="chiffres h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="unite"
              maxLength={12}
              aria-label="Unité"
              placeholder="kg"
              className="h-12 w-16 border border-trait bg-fond px-2 outline-none focus:border-texte"
            />
          </div>
          <button
            type="submit"
            className="transition-etat mt-2 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter le résultat clé
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAjout(true)}
          className="cible mt-3 w-full border border-trait text-13 text-secondaire"
        >
          Ajouter un résultat clé
        </button>
      )}
    </Widget>
  )
}
