import Link from 'next/link'
import type { Route } from 'next'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { ListeTaches } from '@/components/taches/ListeTaches'
import {
  listerTaches,
  tachesDuJour,
  tachesEnRetard,
  tachesSeptJours,
  type Tache,
} from '@/lib/donnees/taches'
import { optionsProjets } from '@/lib/donnees/projets'
import { aujourdhui, jourLong } from '@/lib/date'
import { CONTEXTES, LIBELLE_CONTEXTE } from '@/lib/enums'

export const metadata = { title: 'Tâches' }

const VUES = [
  { cle: 'jour', libelle: "Aujourd'hui" },
  { cle: 'semaine', libelle: '7 jours' },
  { cle: 'toutes', libelle: 'Toutes' },
] as const

type Vue = (typeof VUES)[number]['cle']

type Parametres = {
  vue?: string
  statut?: string
  projet?: string
  contexte?: string
}

export default async function PageTaches({
  searchParams,
}: {
  searchParams: Promise<Parametres>
}) {
  const parametres = await searchParams
  const vue: Vue = VUES.some((v) => v.cle === parametres.vue)
    ? (parametres.vue as Vue)
    : 'jour'

  return (
    <>
      <EnTeteSection
        titre="Tâches"
        action={
          <Link href="/taches/nouvelle" className="libelle">
            Nouvelle
          </Link>
        }
      />

      {/* L'état de la vue est porté par l'URL : l'écran reste utilisable sans
          JavaScript, et le retour arrière ramène là où on était. */}
      <nav className="flex border-b border-trait" aria-label="Vue">
        {VUES.map((v) => {
          const actif = v.cle === vue
          return (
            <Link
              key={v.cle}
              href={v.cle === 'jour' ? '/taches' : `/taches?vue=${v.cle}`}
              aria-current={actif ? 'page' : undefined}
              className={[
                'cible flex flex-1 items-center justify-center border-t-2 text-13',
                actif
                  ? 'border-t-texte font-medium'
                  : 'border-t-transparent text-secondaire',
              ].join(' ')}
            >
              {v.libelle}
            </Link>
          )
        })}
      </nav>

      {vue === 'jour' ? <VueJour /> : null}
      {vue === 'semaine' ? <VueSemaine /> : null}
      {vue === 'toutes' ? <VueToutes parametres={parametres} /> : null}
    </>
  )
}

/**
 * Aujourd'hui montre aussi les retards, dans la même liste.
 *
 * Les reléguer dans un écran séparé reviendrait à les cacher : une tâche en
 * retard qu'on ne voit pas en ouvrant l'application est une tâche qu'on ne
 * fera pas. Le filet de 2px à gauche suffit à les distinguer sans les
 * transformer en reproche.
 */
async function VueJour() {
  const [taches, retards] = await Promise.all([tachesDuJour(), tachesEnRetard()])

  return (
    <Widget
      libelle={jourLong(aujourdhui())}
      action={
        taches.length > 0 ? (
          <span className="chiffres text-13">
            {taches.length}
            {retards.length > 0 ? ` · ${retards.length} en retard` : ''}
          </span>
        ) : null
      }
    >
      <ListeTaches
        taches={taches}
        vide={
          <Invitation>
            Rien pour aujourd&apos;hui.{' '}
            <Link href="/taches/nouvelle" className="underline">
              Ajouter une tâche
            </Link>
            .
          </Invitation>
        }
      />
    </Widget>
  )
}

/** Les sept prochains jours, groupés par date. */
async function VueSemaine() {
  const taches = await tachesSeptJours()

  if (taches.length === 0) {
    return (
      <Widget libelle="Sept prochains jours">
        <Invitation>Rien de prévu d&apos;ici une semaine.</Invitation>
      </Widget>
    )
  }

  const parJour = new Map<string, Tache[]>()
  for (const tache of taches) {
    const cle = tache.echeance ?? ''
    parJour.set(cle, [...(parJour.get(cle) ?? []), tache])
  }

  return (
    <>
      {[...parJour.entries()].map(([jour, groupe]) => (
        <Widget
          key={jour}
          libelle={jourLong(jour)}
          action={<span className="chiffres text-13">{groupe.length}</span>}
        >
          <ListeTaches taches={groupe} />
        </Widget>
      ))}
    </>
  )
}

async function VueToutes({ parametres }: { parametres: Parametres }) {
  const statut =
    parametres.statut === 'faites' || parametres.statut === 'toutes'
      ? parametres.statut
      : 'ouvertes'

  const [taches, projets] = await Promise.all([
    listerTaches({
      statut,
      projetId: parametres.projet,
      contexte: parametres.contexte,
    }),
    optionsProjets(),
  ])

  /**
   * Reconstruit l'URL en ne changeant qu'un filtre.
   *
   * La chaîne est assemblée à l'exécution, donc `typedRoutes` ne peut pas la
   * vérifier : le préfixe est écrit en dur juste au-dessus, c'est ce qui la
   * rend sûre.
   */
  const lien = (remplacement: Record<string, string | undefined>): Route => {
    const fusion: Record<string, string | undefined> = {
      statut,
      projet: parametres.projet,
      contexte: parametres.contexte,
      ...remplacement,
    }
    const params = new URLSearchParams({ vue: 'toutes' })
    for (const [cle, valeur] of Object.entries(fusion)) {
      if (!valeur) continue
      if (cle === 'statut' && valeur === 'ouvertes') continue
      params.set(cle, valeur)
    }
    return `/taches?${params.toString()}` as Route
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-trait px-5 py-3 text-13">
        {(['ouvertes', 'faites', 'toutes'] as const).map((s) => (
          <Link
            key={s}
            href={lien({ statut: s })}
            className={s === statut ? 'text-texte underline' : 'text-secondaire'}
          >
            {s === 'ouvertes' ? 'Ouvertes' : s === 'faites' ? 'Faites' : 'Tout'}
          </Link>
        ))}

        <span aria-hidden className="text-trait">
          |
        </span>

        {CONTEXTES.map((c) => (
          <Link
            key={c}
            href={lien({ contexte: parametres.contexte === c ? undefined : c })}
            className={
              parametres.contexte === c ? 'text-texte underline' : 'text-secondaire'
            }
          >
            {LIBELLE_CONTEXTE[c]}
          </Link>
        ))}

        {parametres.projet ? (
          <Link href={lien({ projet: undefined })} className="text-texte underline">
            {projets.find((p) => p.id === parametres.projet)?.nom ?? 'Projet'} ×
          </Link>
        ) : null}
      </div>

      <Widget
        libelle={`${taches.length} tâche${taches.length > 1 ? 's' : ''}`}
        action={
          <Link href="/taches/importer" className="libelle">
            Importer
          </Link>
        }
      >
        <ListeTaches
          taches={taches}
          reportable={statut !== 'faites'}
          vide={<Invitation>Aucune tâche ne correspond à ce filtre.</Invitation>}
        />
      </Widget>
    </>
  )
}
