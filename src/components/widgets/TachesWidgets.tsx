import Link from 'next/link'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { ListeTaches } from '@/components/taches/ListeTaches'
import {
  tachesDuJour,
  tachesEnRetard,
  tachesSeptJours,
} from '@/lib/donnees/taches'
import { listerProjets } from '@/lib/donnees/projets'
import { jourRelatif, jourSemaineCourt } from '@/lib/date'

/**
 * Les quatre widgets « travail » du tableau de bord.
 *
 * Chacun est un composant serveur autonome qui va chercher ses propres
 * données. Les lectures de `lib/donnees/` passant par `cache()`, « Tâches
 * d'aujourd'hui » et « En retard » ne déclenchent pas deux requêtes malgré
 * leur recouvrement.
 */

/**
 * L'un des deux seuls widgets qui restent visibles à vide, avec Habitudes du
 * jour : il affiche alors une invitation, jamais un « aucune donnée ».
 */
export async function TachesDuJourWidget() {
  const taches = await tachesDuJour()

  return (
    <Widget
      libelle="Tâches du jour"
      action={
        taches.length > 0 ? (
          <span className="chiffres text-13">{taches.length}</span>
        ) : (
          <Link href="/taches/nouvelle" className="libelle">
            Ajouter
          </Link>
        )
      }
    >
      <ListeTaches
        taches={taches.slice(0, 7)}
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
      {taches.length > 7 ? (
        <Link href="/taches" className="mt-3 block text-13 text-secondaire underline">
          {taches.length - 7} de plus
        </Link>
      ) : null}
    </Widget>
  )
}

/**
 * Les retards, à part et seulement quand il y en a.
 *
 * Un widget « 0 en retard » félicite d'un travail qu'on n'a pas fourni et
 * occupe la place utilement prise par autre chose. À vide, il disparaît.
 */
export async function RetardsWidget() {
  const taches = await tachesEnRetard()
  if (taches.length === 0) return null

  return (
    <Widget
      libelle="En retard"
      action={<span className="chiffres text-13">{taches.length}</span>}
    >
      <ListeTaches taches={taches.slice(0, 5)} />
      {taches.length > 5 ? (
        <Link href="/taches" className="mt-3 block text-13 text-secondaire underline">
          {taches.length - 5} de plus
        </Link>
      ) : null}
    </Widget>
  )
}

/**
 * Les sept prochains jours en une ligne par jour : le compte, pas la liste.
 *
 * Ce qu'on veut savoir en un coup d'œil, c'est où se trouve la bosse — pas ce
 * qu'elle contient. Le détail est à une tape.
 */
export async function SeptJoursWidget() {
  const taches = await tachesSeptJours()
  if (taches.length === 0) return null

  const parJour = new Map<string, number>()
  for (const tache of taches) {
    if (!tache.echeance) continue
    parJour.set(tache.echeance, (parJour.get(tache.echeance) ?? 0) + 1)
  }

  const maximum = Math.max(...parJour.values(), 1)

  return (
    <Widget
      libelle="Sept prochains jours"
      action={
        <Link href="/taches?vue=semaine" className="libelle">
          Détail
        </Link>
      }
    >
      <ul>
        {[...parJour.entries()].map(([jour, compte]) => (
          <li
            key={jour}
            className="flex items-center gap-3 border-b border-trait py-2 last:border-b-0"
          >
            <span className="w-16 shrink-0 text-13 text-secondaire">
              {jourSemaineCourt(jour)}
            </span>
            <span className="flex-1">
              {/* Une barre en Encre, pas un histogramme : c'est une densité
                  qu'on lit d'un regard, pas une mesure. */}
              <Jauge valeur={compte / maximum} />
            </span>
            <span className="chiffres w-6 shrink-0 text-right text-13">{compte}</span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

export async function ProjetsEnCoursWidget() {
  const projets = await listerProjets()
  if (projets.length === 0) return null

  return (
    <Widget
      libelle="Projets en cours"
      action={
        <Link href="/projets" className="libelle">
          Tout voir
        </Link>
      }
    >
      <ul>
        {projets.slice(0, 4).map((projet) => (
          <li key={projet.id} className="border-b border-trait py-2 last:border-b-0">
            <Link href={`/projets/${projet.id}`} className="block">
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-13">{projet.nom}</span>
                <span className="chiffres shrink-0 text-11 text-secondaire">
                  {projet.avancement === null
                    ? '—'
                    : `${Math.round(projet.avancement * 100)} %`}
                  {projet.echeance ? ` · ${jourRelatif(projet.echeance)}` : ''}
                </span>
              </div>
              <div className="mt-1.5">
                <Jauge valeur={projet.avancement} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  )
}
