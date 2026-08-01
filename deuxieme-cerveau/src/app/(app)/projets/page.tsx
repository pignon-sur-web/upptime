import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { listerProjets } from '@/lib/donnees/projets'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_STATUT_PROJET } from '@/lib/enums'

export const metadata = { title: 'Projets' }

export default async function PageProjets({
  searchParams,
}: {
  searchParams: Promise<{ tous?: string }>
}) {
  const { tous } = await searchParams
  const projets = await listerProjets(tous === '1')

  return (
    <>
      <EnTeteSection
        titre="Projets"
        action={
          <Link href="/projets/nouveau" className="libelle">
            Nouveau
          </Link>
        }
      />

      <div className="flex gap-4 border-b border-trait px-5 py-3 text-13">
        <Link
          href="/projets"
          className={tous === '1' ? 'text-secondaire' : 'text-texte underline'}
        >
          En cours
        </Link>
        <Link
          href="/projets?tous=1"
          className={tous === '1' ? 'text-texte underline' : 'text-secondaire'}
        >
          Tous
        </Link>
      </div>

      <Widget libelle={`${projets.length} projet${projets.length > 1 ? 's' : ''}`}>
        {projets.length === 0 ? (
          <Invitation>
            Aucun projet.{' '}
            <Link href="/projets/nouveau" className="underline">
              En créer un
            </Link>
            .
          </Invitation>
        ) : (
          <ul>
            {projets.map((projet) => (
              <li key={projet.id} className="border-b border-trait last:border-b-0">
                <Link href={`/projets/${projet.id}`} className="block py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-15">{projet.nom}</span>
                    {/* Un projet sans tâche affiche un tiret et non 0 % : il
                        n'est pas à zéro, il est indéterminé. */}
                    <span className="chiffres shrink-0 text-13 text-secondaire">
                      {projet.avancement === null
                        ? '—'
                        : `${Math.round(projet.avancement * 100)} %`}
                    </span>
                  </div>

                  <div className="mt-2">
                    <Jauge valeur={projet.avancement} />
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-11 text-secondaire">
                    <span>{LIBELLE_STATUT_PROJET[projet.statut]}</span>
                    {projet.tachesTotal > 0 ? (
                      <span className="chiffres">
                        {projet.tachesFaites}/{projet.tachesTotal} tâches
                      </span>
                    ) : null}
                    {projet.echeance ? (
                      <span
                        className={
                          projet.joursRestants !== null && projet.joursRestants < 0
                            ? 'text-texte'
                            : undefined
                        }
                      >
                        {jourRelatif(projet.echeance)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
