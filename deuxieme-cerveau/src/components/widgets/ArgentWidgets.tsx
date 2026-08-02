import Link from 'next/link'
import { Widget } from '@/components/ui/Widget'
import { comptes, echeancesAVenir, moisEnArgent } from '@/lib/donnees/finances'
import { euros, teinteMontant, teinteSolde } from '@/lib/argent'
import { aujourdhui, jourRelatif, moisLong } from '@/lib/date'

/**
 * Les trois widgets « argent » du tableau de bord.
 *
 * Aucun ne s'affiche à vide : un widget « 0,00 € » sur un compte inexistant
 * occupe une place et ne dit rien. Ils apparaissent quand il y a quelque chose
 * à savoir, et disparaissent sinon.
 */

/**
 * Les soldes, et c'est le solde POINTÉ qui s'affiche — arrêté à aujourd'hui.
 * C'est celui qu'on compare à l'application bancaire ; le solde incluant les
 * écritures post-datées est une autre question, et elle n'a pas sa place sur
 * l'écran d'accueil.
 */
export async function ComptesWidget() {
  const liste = await comptes()
  if (liste.length === 0) return null

  const total = liste.reduce((somme, c) => somme + c.soldePointeCents, 0)

  return (
    <Widget
      libelle="Comptes"
      emoji="🏦"
      action={
        <Link href="/argent" className="action">
          Détail
        </Link>
      }
    >
      <div className="flex items-end justify-between gap-4">
        <p className={['chiffres text-40 leading-none', teinteSolde(total)].join(' ')}>
          {euros(total)}
        </p>
      </div>

      <ul className="mt-3">
        {liste.slice(0, 4).map((compte) => (
          <li
            key={compte.id}
            className="flex items-baseline justify-between gap-4 border-b border-trait py-1.5 last:border-b-0"
          >
            <span className="truncate text-13">{compte.nom}</span>
            <span className="chiffres shrink-0 text-13 text-secondaire">
              {euros(compte.soldePointeCents)}
            </span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

export async function MoisEnArgentWidget() {
  const mois = await moisEnArgent()
  if (mois.nbEcritures === 0) return null

  return (
    <Widget
      libelle={`Le mois — ${moisLong(aujourdhui())}`}
      emoji="💶"
      action={
        <Link href="/argent" className="action">
          Saisir
        </Link>
      }
    >
      <div className="flex items-end justify-between gap-4">
        <p
          className={['chiffres text-40 leading-none', teinteMontant(mois.netCents)].join(
            ' ',
          )}
        >
          {mois.netCents >= 0 ? '+' : ''}
          {euros(mois.netCents)}
        </p>
        <div className="pb-1 text-right text-11 text-secondaire">
          <p className="chiffres text-13 text-reussite">{euros(mois.entreesCents)}</p>
          <p>entrées</p>
          <p className="chiffres mt-1 text-13 text-echec">{euros(-mois.sortiesCents)}</p>
          <p>sorties</p>
        </div>
      </div>
    </Widget>
  )
}

/**
 * Les paiements à venir dans les quinze jours, retards compris.
 *
 * Quinze jours et non trente : au-delà, ce n'est plus une alerte, c'est une
 * liste, et une liste n'a rien à faire sur un tableau de bord qu'on consulte
 * en dix secondes.
 */
export async function PaiementsAVenirWidget() {
  const echeances = await echeancesAVenir(15)
  if (echeances.length === 0) return null

  const jour = aujourdhui()
  const total = echeances.reduce((somme, e) => somme + e.montantCents, 0)

  return (
    <Widget
      libelle="Paiements à venir"
      emoji="📆"
      action={<span className="chiffres text-13">{euros(-total)}</span>}
    >
      <ul>
        {echeances.slice(0, 5).map((echeance) => {
          const enRetard = echeance.echeance < jour
          return (
            <li
              key={echeance.id}
              className={[
                'flex items-baseline justify-between gap-4 border-b border-trait py-1.5 last:border-b-0',
                enRetard ? 'border-l-2 border-l-echec pl-2' : '',
              ].join(' ')}
            >
              <span className="min-w-0">
                <span className="block truncate text-13">{echeance.nom}</span>
                <span
                  className={[
                    'block text-11',
                    enRetard ? 'text-texte' : 'text-secondaire',
                  ].join(' ')}
                >
                  {jourRelatif(echeance.echeance, jour)}
                </span>
              </span>
              <span className="chiffres shrink-0 text-13">
                {euros(-echeance.montantCents)}
              </span>
            </li>
          )
        })}
      </ul>

      <Link
        href="/argent?vue=echeances"
        className="mt-3 block text-13 text-secondaire underline"
      >
        Toutes les échéances
      </Link>
    </Widget>
  )
}
