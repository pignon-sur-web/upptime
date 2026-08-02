import type { ReactNode } from 'react'
import { LIBELLE_PRIORITE, type Priorite } from '@/lib/enums'

/**
 * L'étiquette.
 *
 * Une pastille de couleur, un fond très pâle, un texte du même ton. Le
 * fond pâle est ce qui permet à une étiquette d'être colorée sans crier :
 * la couleur pleine est réservée au point et au texte, qui sont petits.
 *
 * La pastille est redondante avec la couleur du fond, et c'est voulu — sur
 * les six tons, trois se distinguent mal pour un œil daltonien. La forme et
 * la position du texte restent, mais surtout le libellé lui-même est
 * explicite : « Urgent & important » se lit sans la couleur.
 */

export type TonBadge =
  | 'urgent'
  | 'important'
  | 'neutre'
  | 'accent'
  | 'reussite'
  | 'echec'

const TONS: Record<TonBadge, string> = {
  urgent: 'bg-urgent-fond text-urgent',
  important: 'bg-important-fond text-important',
  neutre: 'bg-neutre-fond text-neutre',
  accent: 'bg-accent-fond text-accent',
  reussite: 'bg-reussite-fond text-reussite',
  echec: 'bg-echec-fond text-echec',
}

export function Badge({
  children,
  ton = 'neutre',
  /** La pastille se retire pour les étiquettes purement descriptives —
      une catégorie, un domaine — qui ne portent pas de jugement. */
  pastille = true,
}: {
  children: ReactNode
  ton?: TonBadge
  pastille?: boolean
}) {
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1.5 rounded-petit px-2 py-0.5 text-11 font-medium',
        TONS[ton],
      ].join(' ')}
    >
      {pastille ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-plein bg-current"
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  )
}

/**
 * L'étiquette de priorité.
 *
 * Le rouge est réservé à « urgent et important ». Si les trois niveaux
 * étaient colorés fort, la page n'aurait plus de hiérarchie : le sens du
 * rouge vient de ce qu'il est rare.
 *
 * La priorité 0 ne rend rien du tout. « Aucune priorité » n'est pas une
 * information à afficher, c'est le cas par défaut de la plupart des lignes.
 */
const TON_PRIORITE: Record<Priorite, TonBadge> = {
  1: 'urgent',
  2: 'important',
  3: 'neutre',
  0: 'neutre',
}

export function BadgePriorite({ priorite }: { priorite: number | null }) {
  if (priorite === null || priorite === 0) return null
  const p = priorite as Priorite
  const ton = TON_PRIORITE[p]
  if (ton === undefined) return null
  return <Badge ton={ton}>{LIBELLE_PRIORITE[p]}</Badge>
}
