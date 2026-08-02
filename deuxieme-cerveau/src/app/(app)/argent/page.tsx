import Link from 'next/link'
import type { Route } from 'next'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Onglets } from '@/components/ui/Pilule'
import { SaisieRapide } from '@/components/finances/SaisieRapide'
import { ListeTransactions } from '@/components/finances/ListeTransactions'
import {
  BarresCategories,
  TotalCategories,
} from '@/components/graphiques/BarresCategories'
import { ListeEcheances } from '@/components/finances/ListeEcheances'
import { FormulaireBudgets } from '@/components/finances/FormulaireBudgets'
import {
  budgets,
  categoriesConnues,
  categoriesDuMois,
  comptes,
  echeancesAVenir,
  moisEnArgent,
  transactions,
} from '@/lib/donnees/finances'
import { euros, teinteMontant, teinteSolde } from '@/lib/argent'
import { aujourdhui, moisLong } from '@/lib/date'

export const metadata = { title: 'Argent' }

const VUES = [
  { cle: 'mois', libelle: 'Le mois' },
  { cle: 'livre', libelle: 'Grand livre' },
  { cle: 'echeances', libelle: 'À venir' },
  { cle: 'budgets', libelle: 'Budgets' },
] as const

type Vue = (typeof VUES)[number]['cle']

export default async function PageArgent({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>
}) {
  const { vue: vueDemandee } = await searchParams
  const vue: Vue = VUES.some((v) => v.cle === vueDemandee)
    ? (vueDemandee as Vue)
    : 'mois'

  const liste = await comptes()

  return (
    <>
      <EnTeteSection
        titre="Argent"
        action={
          <Link href="/argent/comptes/nouveau" className="action">
            Compte
          </Link>
        }
      />

      <Onglets
        libelle="Vue"
        onglets={VUES.map((v) => ({
          href: (v.cle === 'mois' ? '/argent' : `/argent?vue=${v.cle}`) as Route,
          libelle: v.libelle,
          actif: v.cle === vue,
        }))}
      />

      {liste.length === 0 ? (
        <Widget libelle="Comptes">
          <Invitation>
            Aucun compte.{' '}
            <Link href="/argent/comptes/nouveau" className="underline">
              En créer un
            </Link>{' '}
            pour commencer à saisir.
          </Invitation>
        </Widget>
      ) : (
        <>
          <Comptes />
          {vue === 'mois' ? <VueMois /> : null}
          {vue === 'livre' ? <VueLivre /> : null}
          {vue === 'echeances' ? <VueEcheances /> : null}
          {vue === 'budgets' ? <VueBudgets /> : null}
        </>
      )}
    </>
  )
}

/**
 * Les comptes et leurs soldes.
 *
 * Le solde affiché est le solde **pointé**, arrêté à aujourd'hui : c'est celui
 * qui doit coller à l'application bancaire. Quand une écriture est post-datée,
 * le solde total apparaît en dessous, en petit — sinon « pourquoi mon
 * application ne dit pas la même chose que ma banque » devient une enquête.
 */
async function Comptes() {
  const liste = await comptes()
  const total = liste.reduce((somme, c) => somme + c.soldePointeCents, 0)

  return (
    <Widget
      libelle="Comptes"
      action={<span className="chiffres text-13">{euros(total)}</span>}
    >
      <ul>
        {liste.map((compte) => (
          <li key={compte.id} className="border-b border-trait last:border-b-0">
            <Link
              href={`/argent/comptes/${compte.id}`}
              className="cible flex items-center justify-between gap-4 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-15">{compte.nom}</span>
                {compte.soldeCents !== compte.soldePointeCents ? (
                  <span className="chiffres block text-11 text-secondaire">
                    {euros(compte.soldeCents)} avec les écritures à venir
                  </span>
                ) : null}
              </span>
              <span
                className={[
                  'chiffres shrink-0 text-18',
                  teinteSolde(compte.soldePointeCents),
                ].join(' ')}
              >
                {euros(compte.soldePointeCents)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-4 text-13">
        <Link href="/argent/virement" className="underline">
          Virement
        </Link>
        <Link href="/argent/rapprochement" className="underline">
          Rapprocher
        </Link>
      </div>
    </Widget>
  )
}

async function VueMois() {
  const [liste, categories, mois, cats] = await Promise.all([
    comptes(),
    categoriesConnues(),
    moisEnArgent(),
    categoriesDuMois(),
  ])

  return (
    <>
      <Widget libelle="Saisie rapide">
        <SaisieRapide
          comptes={liste.map((c) => ({ id: c.id, nom: c.nom }))}
          categories={categories}
        />
      </Widget>

      <Widget
        libelle={`Le mois — ${moisLong(aujourdhui())}`}
        action={
          <span className="chiffres text-13">
            {mois.nbEcritures} écriture{mois.nbEcritures > 1 ? 's' : ''}
          </span>
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
          <div className="text-right text-11 text-secondaire">
            <p className="chiffres text-13 text-reussite">{euros(mois.entreesCents)}</p>
            <p>entrées</p>
            <p className="chiffres mt-1 text-13 text-echec">{euros(-mois.sortiesCents)}</p>
            <p>sorties</p>
          </div>
        </div>

        {/* Le total des ajustements reste visible à part, et c'est délibéré :
            s'il grossit, c'est le signe qu'on oublie de saisir. */}
        {mois.ajustementsCents !== 0 ? (
          <p className="mt-4 border-t border-trait pt-2 text-11 text-secondaire">
            Hors net :{' '}
            <span className="chiffres">{euros(mois.ajustementsCents)}</span>{' '}
            d&apos;ajustements. Les virements et les corrections de solde ne sont ni
            des revenus ni des dépenses.
          </p>
        ) : null}
      </Widget>

      <Widget
        libelle="Dépenses par catégorie"
        action={
          <Link href="/argent?vue=budgets" className="action">
            Budgets
          </Link>
        }
      >
        {cats.length === 0 ? (
          <Invitation>
            Aucune dépense catégorisée ce mois-ci. La catégorie se saisit à côté du
            libellé.
          </Invitation>
        ) : (
          <>
            <BarresCategories categories={cats} />
            <TotalCategories categories={cats} />
          </>
        )}
      </Widget>
    </>
  )
}

async function VueLivre() {
  const lignes = await transactions({ limite: 100 })

  return (
    <Widget
      libelle="Grand livre"
      action={<span className="chiffres text-13">{lignes.length}</span>}
    >
      {lignes.length === 0 ? (
        <Invitation>Aucune écriture pour l&apos;instant.</Invitation>
      ) : (
        <ListeTransactions transactions={lignes} />
      )}
    </Widget>
  )
}

async function VueEcheances() {
  const [echeances, liste] = await Promise.all([echeancesAVenir(60), comptes()])

  return (
    <ListeEcheances
      echeances={echeances}
      comptes={liste.map((c) => ({ id: c.id, nom: c.nom }))}
    />
  )
}

async function VueBudgets() {
  const [liste, categories, cats] = await Promise.all([
    budgets(),
    categoriesConnues(),
    categoriesDuMois(),
  ])

  return <FormulaireBudgets budgets={liste} categories={categories} statuts={cats} />
}
