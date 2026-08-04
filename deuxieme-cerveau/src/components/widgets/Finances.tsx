import Link from 'next/link'
import { Widget } from '@/components/ui/Widget'
import {
  comptesActifs,
  echeancesAVenir,
  moisEnArgent,
  totalNet,
} from '@/lib/donnees/finances'
import { formater, formaterCompact, formaterSigne } from '@/lib/argent'
import { jourRelatif } from '@/lib/date'

/** Total net et une ligne par compte. Ne s'affiche pas sans compte. */
export async function ComptesWidget() {
  const [liste, total] = await Promise.all([comptesActifs(), totalNet()])
  if (liste.length === 0) return null

  return (
    <Widget
      libelle="Comptes"
      action={
        <Link href="/argent" className="libelle">
          Tout
        </Link>
      }
    >
      <p className="chiffres text-40 leading-none">{formaterCompact(total)}</p>

      <ul className="mt-4">
        {liste.map((compte) => (
          <li
            key={compte.id}
            className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
          >
            <span className="truncate text-13">{compte.nom}</span>
            <span className="chiffres shrink-0 text-13">{formater(compte.soldeCents)}</span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

/**
 * Le mois en argent.
 *
 * Le net exclut virements et ajustements : un virement entre ses propres
 * comptes n'est ni un revenu ni une dépense, et un ajustement est une
 * correction de mesure. Les ajustements restent visibles à part — s'ils
 * grossissent, c'est qu'on oublie de saisir des transactions.
 */
export async function MoisEnArgentWidget() {
  const { courant, precedent } = await moisEnArgent()

  if (courant.entreesCents === 0 && courant.sortiesCents === 0) return null

  const variation = courant.netCents - precedent.netCents

  return (
    <Widget libelle="Le mois en argent">
      <div className="flex justify-between gap-4">
        <span>
          <span className="libelle block">Entrées</span>
          <span className="chiffres text-18">{formater(courant.entreesCents)}</span>
        </span>
        <span className="text-right">
          <span className="libelle block">Sorties</span>
          <span className="chiffres text-18">{formater(courant.sortiesCents)}</span>
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-trait pt-3">
        <span className="libelle">Solde du mois</span>
        <span className="chiffres text-24">{formaterSigne(courant.netCents)}</span>
      </div>

      {precedent.netCents !== 0 ? (
        <p className="chiffres mt-1 text-right text-11 text-secondaire">
          {formaterSigne(variation)} vs mois dernier
        </p>
      ) : null}

      {courant.ajustementsCents !== 0 ? (
        <p className="mt-3 border-l-2 border-l-texte pl-3 text-11 text-secondaire">
          dont <span className="chiffres">{formaterSigne(courant.ajustementsCents)}</span>{' '}
          d&apos;écarts de rapprochement, hors du solde ci-dessus
        </p>
      ) : null}
    </Widget>
  )
}

/** Les trois prochaines échéances. */
export async function PaiementsAVenirWidget() {
  const echeances = await echeancesAVenir(3)
  if (echeances.length === 0) return null

  return (
    <Widget
      libelle="Paiements à venir"
      action={
        <Link href="/argent/echeances" className="libelle">
          Tout
        </Link>
      }
    >
      <ul>
        {echeances.map((echeance) => (
          <li
            key={echeance.id}
            className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block truncate text-13">{echeance.nom}</span>
              <span className="chiffres block text-11 text-secondaire">
                {jourRelatif(echeance.jour)}
              </span>
            </span>
            <span className="chiffres shrink-0 text-13">
              {formater(echeance.montantCents)}
            </span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}
