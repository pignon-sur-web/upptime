import type { ReactNode } from 'react'

/**
 * La carte.
 *
 * L'interface est une pile de blancs posés sur un fond légèrement sourd.
 * C'est ce contraste — et pas un filet — qui sépare deux contenus : on lit
 * une page comme une suite d'objets, pas comme un long rouleau découpé.
 *
 * Le rayon, la bordure et l'ombre viennent tous de la classe `.carte`
 * définie une seule fois dans `globals.css`. Aucun appelant ne les
 * redéfinit : deux cartes légèrement différentes sur le même écran se
 * voient immédiatement et donnent l'impression d'un bug d'affichage.
 */
export function Carte({
  children,
  className = '',
  /** Retire le rembourrage intérieur, pour les cartes dont le contenu
      est une liste qui doit toucher les bords (séparateurs pleine largeur). */
  sansMarge = false,
}: {
  children: ReactNode
  className?: string
  sansMarge?: boolean
}) {
  return (
    <section className={['carte', sansMarge ? '' : 'p-4', className].join(' ')}>
      {children}
    </section>
  )
}

/**
 * L'en-tête d'une carte : une pilule gris pâle, et une action à droite.
 *
 * Le titre n'est pas posé nu sur la carte, il est enfermé dans une pastille.
 * C'est ce qui le fait lire comme une **étiquette de bloc** plutôt que comme
 * la première ligne du contenu — sur une page qui empile dix cartes, un titre
 * en gras sans fond finit par se confondre avec les lignes qu'il chapeaute.
 *
 * L'emoji n'est pas un ornement : c'est le repère qu'on attrape en balayant
 * la page du pouce, avant même d'avoir lu le titre. Il est `aria-hidden` — le
 * titre porte déjà l'information, et « emoji vague d'eau » n'apprendrait rien.
 */
export function EnTeteCarte({
  titre,
  emoji,
  action,
}: {
  titre: string
  emoji?: string | null
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="inline-flex min-w-0 items-center gap-1.5 rounded-petit bg-neutre-fond px-2 py-1 text-13 font-medium">
        {emoji ? (
          <span aria-hidden className="shrink-0">
            {emoji}
          </span>
        ) : null}
        <span className="truncate">{titre}</span>
      </h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
