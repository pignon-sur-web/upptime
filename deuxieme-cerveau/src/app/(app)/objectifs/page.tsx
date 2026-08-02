import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Onglets } from '@/components/ui/Pilule'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { listerObjectifs } from '@/lib/donnees/objectifs'
import { creerObjectif } from '@/lib/actions/objectifs'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_PRIORITE, PRIORITES, type Priorite } from '@/lib/enums'

export const metadata = { title: 'Objectifs' }

export default async function PageObjectifs({
  searchParams,
}: {
  searchParams: Promise<{ tous?: string }>
}) {
  const { tous } = await searchParams
  const objectifs = await listerObjectifs(tous === '1')

  return (
    <>
      <EnTeteSection titre="Objectifs" />

      <Onglets
        libelle="Portée"
        onglets={[
          { href: '/objectifs', libelle: 'En cours', actif: tous !== '1' },
          { href: '/objectifs?tous=1', libelle: 'Tous', actif: tous === '1' },
        ]}
      />

      <Widget libelle={`${objectifs.length} objectif${objectifs.length > 1 ? 's' : ''}`}>
        {objectifs.length === 0 ? (
          <Invitation>
            Aucun objectif. Un objectif sans résultat clé n&apos;affiche pas 0 % mais un
            tiret : il n&apos;est pas raté, il est simplement sans mesure.
          </Invitation>
        ) : (
          <ul>
            {objectifs.map((objectif) => (
              <li key={objectif.id} className="border-b border-trait last:border-b-0">
                <Link href={`/objectifs/${objectif.id}`} className="block py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-15">{objectif.nom}</span>
                    {/* Un tiret, pas 0 % : un objectif sans résultat clé est
                        indéterminé, pas à zéro. */}
                    <span className="chiffres shrink-0 text-13 text-secondaire">
                      {objectif.progression === null
                        ? '—'
                        : `${Math.round(objectif.progression * 100)} %`}
                    </span>
                  </div>

                  <div className="mt-2">
                    <Jauge valeur={objectif.progression} />
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-11 text-secondaire">
                    <span className="chiffres">
                      {objectif.nbResultats} résultat{objectif.nbResultats > 1 ? 's' : ''}{' '}
                      clé{objectif.nbResultats > 1 ? 's' : ''}
                    </span>
                    {objectif.categorie ? <span>{objectif.categorie}</span> : null}
                    {objectif.echeance ? <span>{jourRelatif(objectif.echeance)}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Nouvel objectif">
        <form action={creerObjectif}>
          <Champ libelle="Nom">
            <Saisie name="nom" required autoComplete="off" placeholder="Perdre 8 kg" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Catégorie">
                <Saisie name="categorie" autoComplete="off" placeholder="Santé" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Priorité">
                <Menu name="priorite" defaultValue="0">
                  {PRIORITES.map((p) => (
                    <option key={p} value={p}>
                      {LIBELLE_PRIORITE[p as Priorite]}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Début">
                <Saisie type="date" name="debut" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Échéance">
                <Saisie type="date" name="echeance" />
              </Champ>
            </div>
          </div>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Créer l&apos;objectif</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}
