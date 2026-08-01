'use client'

/**
 * La case à cocher de l'application.
 *
 * Un carré de 24px au trait, dont le remplissage part du centre vers les bords
 * en 120 ms — un `scale(0) → scale(1)` avec origine au centre. C'est la seule
 * animation de l'interface, et elle est neutralisée par `prefers-reduced-motion`
 * via la variable `--duree`.
 *
 * La zone tactile fait 44px alors que le carré n'en fait que 24 : la cible
 * déborde volontairement du dessin.
 */
export function Case({
  cochee,
  onToggle,
  libelle,
  disabled = false,
}: {
  cochee: boolean
  onToggle: () => void
  /** Lu par les lecteurs d'écran, jamais affiché. */
  libelle: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={cochee}
      aria-label={libelle}
      disabled={disabled}
      onClick={onToggle}
      className="flex size-11 shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span className="flex size-6 items-center justify-center border border-texte">
        <span
          aria-hidden
          className="transition-etat size-4 origin-center bg-texte"
          style={{ transform: cochee ? 'scale(1)' : 'scale(0)' }}
        />
      </span>
    </button>
  )
}
