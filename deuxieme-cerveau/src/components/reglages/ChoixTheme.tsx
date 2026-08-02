'use client'

import { useEffect, useState } from 'react'

/**
 * Le choix du thème : automatique, clair, sombre.
 *
 * Tout se joue sur une seule propriété CSS. Les jetons de `globals.css` sont
 * déclarés en `light-dark(clair, sombre)`, qui lit le `color-scheme` effectif ;
 * poser `data-theme` sur `<html>` force ce `color-scheme` et bascule la palette
 * entière. Il n'y a donc rien à écrire ici sur les couleurs, et aucune seconde
 * palette à tenir synchronisée.
 *
 * Rien ne part au serveur. Une préférence d'affichage n'a pas à faire un
 * aller-retour réseau, ni à occuper une ligne dans une table : elle appartient
 * à l'appareil, pas au compte. `localStorage` suffit, et c'est ce que relit le
 * script du layout racine au chargement suivant.
 */

const CHOIX = [
  { valeur: 'auto', libelle: 'Automatique' },
  { valeur: 'clair', libelle: 'Clair' },
  { valeur: 'sombre', libelle: 'Sombre' },
] as const

type Theme = (typeof CHOIX)[number]['valeur']

export function ChoixTheme() {
  /*
   * Premier rendu à « auto » côté serveur comme côté client : lire
   * `localStorage` pendant le rendu produirait un HTML serveur différent du
   * premier rendu client, et React signalerait une divergence d'hydratation.
   * On relit donc après le montage. L'affichage n'est faux que le temps d'une
   * image, et le thème lui-même est déjà bon — c'est le script du layout qui
   * l'a posé, bien avant que ce composant n'existe.
   */
  const [theme, setTheme] = useState<Theme>('auto')

  useEffect(() => {
    const enregistre = localStorage.getItem('theme')
    if (enregistre === 'clair' || enregistre === 'sombre') setTheme(enregistre)
  }, [])

  const choisir = (valeur: Theme) => {
    setTheme(valeur)
    if (valeur === 'auto') {
      localStorage.removeItem('theme')
      delete document.documentElement.dataset.theme
    } else {
      localStorage.setItem('theme', valeur)
      document.documentElement.dataset.theme = valeur
    }
  }

  return (
    <div role="radiogroup" aria-label="Thème" className="flex flex-wrap gap-1.5">
      {CHOIX.map((choix) => {
        const actif = choix.valeur === theme
        return (
          <button
            key={choix.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => choisir(choix.valeur)}
            className={[
              'transition-etat cible rounded-plein px-4 text-13',
              actif
                ? 'bg-accent-fond font-medium text-accent'
                : 'bg-neutre-fond text-secondaire',
            ].join(' ')}
          >
            {choix.libelle}
          </button>
        )
      })}
    </div>
  )
}
