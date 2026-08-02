import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { Saisie } from '@/components/ui/Champ'
import { ListeTaches } from '@/components/taches/ListeTaches'
import { FormulaireProjet } from '@/components/projets/FormulaireProjet'
import { detailProjet } from '@/lib/donnees/projets'
import { tachesDuProjet } from '@/lib/donnees/taches'
import { modifierProjet, supprimerProjet } from '@/lib/actions/projets'
import { creerTache } from '@/lib/actions/taches'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_STATUT_PROJET } from '@/lib/enums'

export const metadata = { title: 'Projet' }

export default async function PageProjet({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [projet, taches] = await Promise.all([detailProjet(id), tachesDuProjet(id)])

  if (!projet) notFound()

  const ouvertes = taches.filter((t) => t.statut === 'a_faire' || t.statut === 'en_cours')
  const modifier = modifierProjet.bind(null, id)
  const supprimer = supprimerProjet.bind(null, id)

  return (
    <>
      <EnTeteSection titre={projet.nom} retour="/projets" />

      <Carte>
        <div className="flex items-end justify-between gap-4">
          <p className="chiffres text-40 leading-none">
            {projet.avancement === null ? '—' : Math.round(projet.avancement * 100)}
            {projet.avancement === null ? null : (
              <span className="text-18 text-secondaire"> %</span>
            )}
          </p>
          <p className="text-right text-11 text-secondaire">
            <span className="chiffres block text-13 text-texte">
              {projet.tachesFaites}/{projet.tachesTotal}
            </span>
            tâches
          </p>
        </div>

        <div className="mt-3">
          <Jauge valeur={projet.avancement} hauteur={6} />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 text-11 text-secondaire">
          <span>{LIBELLE_STATUT_PROJET[projet.statut]}</span>
          {projet.echeance ? (
            <span
              className={
                projet.joursRestants !== null && projet.joursRestants < 0
                  ? 'text-texte'
                  : undefined
              }
            >
              {jourRelatif(projet.echeance)}
              {projet.joursRestants !== null && projet.joursRestants >= 0
                ? ` · ${projet.joursRestants} j restants`
                : ''}
            </span>
          ) : null}
        </div>
      </Carte>

      <Widget
        libelle="Tâches ouvertes"
        action={
          <Link href={`/taches?vue=toutes&projet=${id}`} className="action">
            Tout voir
          </Link>
        }
      >
        <ListeTaches
          taches={ouvertes}
          vide={<Invitation>Aucune tâche ouverte sur ce projet.</Invitation>}
        />

        <form action={creerTache} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="projet" value={id} />
          <Saisie
            name="titre"
            required
            autoComplete="off"
            placeholder="Ajouter une tâche"
            aria-label="Ajouter une tâche à ce projet"
          />
          <button type="submit" className="cible shrink-0 px-2 text-13 underline">
            Ajouter
          </button>
        </form>
      </Widget>

      <Widget libelle="Modifier">
        <FormulaireProjet action={modifier} projet={projet} />

        {/* Supprimer un projet ne supprime pas ses tâches : la clé étrangère
            est en `on delete set null`. Ranger du travail dans un projet ne
            doit jamais devenir un moyen de le perdre. */}
        <form action={supprimer} className="mt-6">
          <button type="submit" className="cible text-13 text-secondaire underline">
            Supprimer le projet
          </button>
          <p className="text-11 text-secondaire">
            Les {taches.length} tâches associées sont conservées, sans projet.
          </p>
        </form>
      </Widget>
    </>
  )
}
