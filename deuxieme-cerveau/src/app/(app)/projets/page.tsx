import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { projets as tousProjets } from '@/lib/donnees/projets'
import { STATUTS_PROJET } from '@/lib/enums'
import { jourMoyen } from '@/lib/date'

export const metadata = { title: 'Projets' }

export default async function PageProjets() {
  const projets = await tousProjets()
  const enCours = projets.filter((p) => p.statut === 'active')
  const autres = projets.filter((p) => p.statut !== 'active')

  return (
    <>
      <EnTeteSection titre="Projets" />

      <Widget libelle={`En cours — ${enCours.length}`}>
        {enCours.length === 0 ? (
          <Invitation>
            Aucun projet en cours. Les projets se créent aussi tout seuls à
            l&apos;import d&apos;un CSV.
          </Invitation>
        ) : (
          <ul>
            {enCours.map((projet) => (
              <li key={projet.id} className="border-b border-trait py-3 last:border-b-0">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-15">{projet.nom}</span>
                  <span className="chiffres shrink-0 text-13">
                    {projet.avancement === null
                      ? '—'
                      : `${Math.round(projet.avancement * 100)} %`}
                  </span>
                </span>

                <span className="mt-2 block">
                  <Jauge valeur={projet.avancement} />
                </span>

                <span className="mt-1 flex justify-between gap-4 text-11 text-secondaire">
                  <span className="chiffres">
                    {projet.tachesFaites}/{projet.tachesTotal} tâches
                  </span>
                  {projet.echeance ? (
                    <span className="chiffres">
                      {jourMoyen(projet.echeance)}
                      {projet.joursRestants !== null
                        ? ` · ${projet.joursRestants} j`
                        : ''}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      {autres.length > 0 ? (
        <Widget libelle="Le reste">
          <ul>
            {autres.map((projet) => (
              <li
                key={projet.id}
                className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
              >
                <span className="truncate text-13">{projet.nom}</span>
                <span className="shrink-0 text-11 text-secondaire">
                  {STATUTS_PROJET[projet.statut]}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      ) : null}
    </>
  )
}
