import { Jauge, type TonJauge } from '@/components/ui/Jauge'

/**
 * Une jauge précédée de son pourcentage.
 *
 * Le chiffre est écrit **à gauche**, avant la barre, et pas au-dessus : c'est
 * lui qu'on lit, la barre ne fait que le rendre comparable d'une ligne à
 * l'autre. Sur une pile de dix objectifs, l'œil descend la colonne de chiffres
 * alignés et s'arrête sur la barre qui dépasse.
 *
 * La largeur du chiffre est fixe et les chiffres sont tabulaires : sans ça,
 * « 7 % » et « 100 % » décaleraient le départ de chaque barre et la colonne
 * cesserait d'être comparable.
 *
 * Le remplissage est borné à 100 % par la jauge : un objectif dépassé — douze
 * tractions sur dix — remplit la barre sans déborder de la carte, pendant que
 * le chiffre à gauche dit bien 120 %.
 */
export function Barre({
  valeur,
  ton = 'reussite',
  /** Décrit ce qui progresse ; lu par les lecteurs d'écran. */
  libelle,
}: {
  /** 0 à 1, ou `null` quand la progression est indéterminée. */
  valeur: number | null
  ton?: TonJauge
  libelle: string
}) {
  return (
    <div className="flex items-center gap-2" aria-label={libelle}>
      <span className="chiffres w-11 shrink-0 text-right text-11 text-secondaire">
        {valeur === null ? '—' : `${Math.round(valeur * 100)} %`}
      </span>
      <div className="flex-1">
        <Jauge valeur={valeur} ton={ton} />
      </div>
    </div>
  )
}
