'use client'

/**
 * La case à cocher de l'application.
 *
 * Un carré de 20px à coins légèrement arrondis, qui se remplit de bleu avec
 * une coche blanche. Le remplissage part du centre en 120 ms — la seule
 * animation de l'interface, neutralisée par `prefers-reduced-motion` via la
 * variable `--duree`.
 *
 * **Pourquoi bleu et non vert.** La palette distingue deux choses qu'on
 * confondait avant : le bleu marque *une action que j'ai faite* — cocher une
 * tâche, cocher une habitude — et le vert marque *un verdict sur une
 * période* — l'anneau du jour fermé, une série tenue, un taux au-dessus de
 * 80 %. Une case verte disait « bravo » à chaque clic, ce qui ne laissait
 * plus rien pour dire « la journée est bonne ».
 *
 * La zone tactile fait 44px alors que le carré n'en fait que 20 : la cible
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
      <span
        className={[
          'transition-etat flex size-5 items-center justify-center rounded-petit border',
          cochee ? 'border-accent bg-accent' : 'border-secondaire bg-transparent',
        ].join(' ')}
      >
        {/* La coche est dessinée en permanence et révélée par l'échelle :
            l'apparaître/disparaître d'un nœud du DOM saccade sur iOS.
            Son trait n'est pas `#fff` en dur — en thème sombre l'accent est
            un bleu clair sur lequel une coche blanche disparaîtrait, alors
            que la couleur de la carte contraste dans les deux thèmes. */}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="transition-etat size-3.5 origin-center"
          style={{ transform: cochee ? 'scale(1)' : 'scale(0)' }}
        >
          <path
            d="M3 8.5 L6.5 12 L13 4.5"
            fill="none"
            stroke="var(--carte)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
