import Link from 'next/link'
import { Widget, Invitation } from '@/components/ui/Widget'
import { ListeTaches } from '@/components/taches/ListeTaches'
import { Jauge } from '@/components/ui/Jauge'
import { septProchainsJours, tachesDuJour } from '@/lib/donnees/taches'
import { projetsEnCours } from '@/lib/donnees/projets'
import { jourSemaineCourt } from '@/lib/date'

/**
 * Tâches d'aujourd'hui. Avec « Habitudes du jour », c'est l'un des deux seuls
 * widgets qui restent visibles à vide — mais avec une invitation à agir, pas un
 * « aucune donnée ».
 */
export async function TachesDuJourWidget() {
  const { dues } = await tachesDuJour()

  return (
    <Widget
      libelle="Tâches d'aujourd'hui"
      action={dues.length > 0 ? <span className="chiffres text-13">{dues.length}</span> : null}
    >
      {dues.length === 0 ? (
        <Invitation>
          Rien de prévu.{' '}
          <Link href="/taches" className="underline">
            En ajouter une
          </Link>
          .
        </Invitation>
      ) : (
        <ListeTaches taches={dues} />
      )}
    </Widget>
  )
}

/** N'apparaît que s'il y a des retards — sinon le widget n'existe pas. */
export async function RetardsWidget() {
  const { retards } = await tachesDuJour()
  if (retards.length === 0) return null

  return (
    <Widget
      libelle="Retards"
      action={<span className="chiffres text-13">{retards.length}</span>}
    >
      <ListeTaches taches={retards} montrerJour />
    </Widget>
  )
}

/** Le compte par jour, cliquable. Pas la liste : ce serait trop sur l'accueil. */
export async function SeptJoursWidget() {
  const groupes = await septProchainsJours()
  if (groupes.length === 0) return null

  return (
    <Widget libelle="7 prochains jours">
      <Link href="/taches?vue=semaine" className="flex gap-px">
        {groupes.map((groupe) => (
          <span key={groupe.jour} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-11 text-secondaire">
              {jourSemaineCourt(groupe.jour).replace('.', '')}
            </span>
            <span className="chiffres text-18">{groupe.taches.length}</span>
          </span>
        ))}
      </Link>
    </Widget>
  )
}

export async function ProjetsEnCoursWidget() {
  const projets = await projetsEnCours()
  if (projets.length === 0) return null

  return (
    <Widget libelle="Projets en cours">
      <ul>
        {projets.map((projet) => (
          <li key={projet.id} className="border-b border-trait py-3 last:border-b-0">
            <Link href="/projets" className="block">
              <span className="flex items-baseline justify-between gap-4">
                <span className="truncate text-15">{projet.nom}</span>
                <span className="chiffres shrink-0 text-11 text-secondaire">
                  {/* Un projet sans tâche est indéterminé, pas à 0 %. */}
                  {projet.avancement === null
                    ? '—'
                    : `${Math.round(projet.avancement * 100)} %`}
                  {projet.joursRestants !== null
                    ? ` · ${projet.joursRestants} j`
                    : ''}
                </span>
              </span>
              <span className="mt-2 block">
                <Jauge valeur={projet.avancement} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  )
}
