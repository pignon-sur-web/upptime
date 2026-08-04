import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { CarteObjectif } from '@/components/vie/CarteObjectif'
import { creerObjectif } from '@/lib/actions/vie'
import { objectifs as tousObjectifs } from '@/lib/donnees/vie'
import { STATUTS_OBJECTIF } from '@/lib/enums'

export const metadata = { title: 'Objectifs' }

export default async function PageObjectifs() {
  const objectifs = await tousObjectifs()
  const actifs = objectifs.filter((o) => o.statut === 'active')
  const autres = objectifs.filter((o) => o.statut !== 'active')

  return (
    <>
      <EnTeteSection titre="Objectifs" />

      {actifs.length === 0 ? (
        <Widget libelle="En cours">
          <Invitation>
            Un objectif se mesure par ses résultats clés : une valeur de départ,
            une cible, et la valeur du moment.
          </Invitation>
        </Widget>
      ) : (
        actifs.map((objectif) => <CarteObjectif key={objectif.id} objectif={objectif} />)
      )}

      {autres.length > 0 ? (
        <Widget libelle="Le reste">
          <ul>
            {autres.map((objectif) => (
              <li
                key={objectif.id}
                className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
              >
                <span className="truncate text-13">{objectif.nom}</span>
                <span className="shrink-0 text-11 text-secondaire">
                  {STATUTS_OBJECTIF[objectif.statut]}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      ) : null}

      <Widget libelle="Ajouter un objectif">
        <form action={creerObjectif}>
          <input
            name="nom"
            required
            maxLength={120}
            aria-label="Nom de l'objectif"
            placeholder="Courir un semi-marathon…"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="categorie"
              maxLength={60}
              aria-label="Catégorie"
              placeholder="Catégorie"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="echeance"
              type="date"
              aria-label="Échéance"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
          </div>
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter
          </button>
        </form>
      </Widget>
    </>
  )
}
