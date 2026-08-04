'use client'

import { useState } from 'react'
import { envoyerCouverture, majLivre } from '@/lib/actions/vie'
import { urlCouverture } from '@/lib/couvertures'
import type { Livre } from '@/lib/donnees/vie'

export function CarteLivre({ livre }: { livre: Livre }) {
  const [ouverte, setOuverte] = useState(false)

  return (
    <li>
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        className="block w-full text-left"
      >
        {livre.couverture ? (
          // next/image n'apporte rien ici : les couvertures sont déjà petites
          // et servies depuis le Storage avec un cache long.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlCouverture(livre.couverture)}
            alt=""
            className="aspect-2/3 w-full border border-trait object-cover"
          />
        ) : (
          <span className="flex aspect-2/3 w-full items-center justify-center border border-trait text-11 text-secondaire">
            + couverture
          </span>
        )}
        <span className="mt-1 block truncate text-13">{livre.titre}</span>
        {livre.auteur ? (
          <span className="block truncate text-11 text-secondaire">{livre.auteur}</span>
        ) : null}
        {livre.note ? (
          <span className="chiffres block text-11 text-secondaire">{livre.note}/5</span>
        ) : null}
      </button>

      {ouverte ? (
        <div className="col-span-3 mt-2">
          <form action={majLivre.bind(null, livre.id)}>
            <select
              name="statut"
              defaultValue={livre.statut}
              aria-label="Statut"
              className="h-11 w-full border border-trait bg-fond px-2 text-13 outline-none focus:border-texte"
            >
              <option value="a_lire">À lire</option>
              <option value="en_cours">En cours</option>
              <option value="lu">Lu</option>
              <option value="abandonne">Abandonné</option>
            </select>
            <select
              name="note"
              defaultValue={livre.note ?? ''}
              aria-label="Note"
              className="mt-1 h-11 w-full border border-trait bg-fond px-2 text-13 outline-none focus:border-texte"
            >
              <option value="">Sans note</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}/5</option>
              ))}
            </select>
            <button type="submit" className="cible mt-1 w-full border border-trait text-11">
              Enregistrer
            </button>
          </form>

          <form action={envoyerCouverture.bind(null, livre.id)} className="mt-1">
            <input
              type="file"
              name="couverture"
              accept="image/*"
              aria-label="Couverture"
              className="w-full text-11"
            />
            <button type="submit" className="cible mt-1 w-full border border-trait text-11">
              Envoyer la couverture
            </button>
          </form>
        </div>
      ) : null}
    </li>
  )
}
