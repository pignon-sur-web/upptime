'use client'

import { useState, useTransition } from 'react'
import { basculerWidget, reordonnerWidgets } from '@/lib/actions/reglages'

type Ligne = { cle: string; libelle: string; actif: boolean; position: number }

/**
 * Activer, désactiver, réordonner.
 *
 * Le réordonnancement se fait par flèches et non par glisser-déposer : sur un
 * téléphone tenu à une main, un drag vertical dans une liste qui défile est
 * beaucoup moins fiable que deux boutons de 44px.
 */
export function ReglageWidgets({ widgets }: { widgets: Ligne[] }) {
  const [ordre, setOrdre] = useState(widgets)
  const [, demarrer] = useTransition()

  const deplacer = (index: number, direction: -1 | 1) => {
    const cible = index + direction
    if (cible < 0 || cible >= ordre.length) return

    const suivant = [...ordre]
    const courant = suivant[index]!
    suivant[index] = suivant[cible]!
    suivant[cible] = courant

    setOrdre(suivant)
    demarrer(() => reordonnerWidgets(suivant.map((w) => w.cle)))
  }

  const basculer = (index: number) => {
    const suivant = [...ordre]
    const courant = suivant[index]!
    suivant[index] = { ...courant, actif: !courant.actif }
    setOrdre(suivant)
    demarrer(() => basculerWidget(courant.cle, !courant.actif))
  }

  return (
    <ul>
      {ordre.map((widget, index) => (
        <li
          key={widget.cle}
          className="flex items-center gap-1 border-b border-trait last:border-b-0"
        >
          <button
            type="button"
            onClick={() => basculer(index)}
            role="switch"
            aria-checked={widget.actif}
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <span className="flex size-6 items-center justify-center border border-texte">
              <span
                aria-hidden
                className="transition-etat size-4 origin-center bg-texte"
                style={{ transform: widget.actif ? 'scale(1)' : 'scale(0)' }}
              />
            </span>
          </button>

          <span
            className={[
              'min-w-0 flex-1 truncate py-2 text-15',
              widget.actif ? '' : 'text-secondaire',
            ].join(' ')}
          >
            {widget.libelle}
          </span>

          <button
            type="button"
            onClick={() => deplacer(index, -1)}
            disabled={index === 0}
            aria-label={`Monter ${widget.libelle}`}
            className="flex size-11 items-center justify-center text-secondaire disabled:opacity-25"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => deplacer(index, 1)}
            disabled={index === ordre.length - 1}
            aria-label={`Descendre ${widget.libelle}`}
            className="flex size-11 items-center justify-center text-secondaire disabled:opacity-25"
          >
            ↓
          </button>
        </li>
      ))}
    </ul>
  )
}
