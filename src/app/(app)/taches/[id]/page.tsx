import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { FormulaireTache } from '@/components/taches/FormulaireTache'
import { ListeTaches } from '@/components/taches/ListeTaches'
import { Saisie } from '@/components/ui/Champ'
import { detailTache } from '@/lib/donnees/taches'
import { optionsProjets } from '@/lib/donnees/projets'
import {
  completerTache,
  creerTache,
  modifierTache,
  passerTache,
  rouvrirTache,
  supprimerTacheEtRevenir,
} from '@/lib/actions/taches'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_STATUT_TACHE, libelleRecurrence } from '@/lib/enums'

export const metadata = { title: 'Tâche' }

export default async function PageTache({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [tache, projets] = await Promise.all([detailTache(id), optionsProjets()])

  if (!tache) notFound()

  const faite = tache.statut === 'fait'
  const annulee = tache.statut === 'annule'

  const modifier = modifierTache.bind(null, id)
  const completer = completerTache.bind(null, id)
  const rouvrir = rouvrirTache.bind(null, id)
  const passer = passerTache.bind(null, id)
  const supprimer = supprimerTacheEtRevenir.bind(null, id)

  return (
    <>
      <EnTeteSection titre={tache.titre} retour="/taches" />

      {/* L'état, en une ligne : c'est ce qu'on vient vérifier en ouvrant
          l'écran, avant même de vouloir modifier quoi que ce soit. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-trait px-5 py-3 text-13 text-secondaire">
        <span className={faite || annulee ? undefined : 'text-texte'}>
          {LIBELLE_STATUT_TACHE[tache.statut]}
        </span>
        {tache.echeance ? (
          <span className="chiffres">{jourRelatif(tache.echeance)}</span>
        ) : (
          <span>sans échéance</span>
        )}
        {tache.recurrence ? <span>↻ {libelleRecurrence(tache.recurrence)}</span> : null}
        {tache.projetNom ? <span>{tache.projetNom}</span> : null}
      </div>

      {/* Les gestes, avant le formulaire : on ouvre cet écran dix fois pour
          cocher, une fois pour modifier. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-trait px-5 py-3">
        {faite ? (
          <form action={rouvrir}>
            <button type="submit" className="cible text-13 underline">
              Rouvrir
            </button>
          </form>
        ) : (
          <form action={completer}>
            <button type="submit" className="cible text-13 underline">
              Marquer comme faite
            </button>
          </form>
        )}

        {tache.recurrence && !faite && !annulee ? (
          <form action={passer}>
            {/* Sans ce geste, « sauté » serait indiscernable de « en retard »
                et la liste se remplirait de reproches. */}
            <button type="submit" className="cible text-13 text-secondaire underline">
              Passer cette occurrence
            </button>
          </form>
        ) : null}

        <form action={supprimer} className="ml-auto">
          <button type="submit" className="cible text-13 text-secondaire underline">
            Supprimer
            {tache.sousTaches.length > 0
              ? ` (et ${tache.sousTaches.length} sous-tâche${tache.sousTaches.length > 1 ? 's' : ''})`
              : ''}
          </button>
        </form>
      </div>

      {tache.parent ? (
        <div className="border-b border-trait px-5 py-3 text-13">
          <Link href={`/taches/${tache.parent.id}`} className="text-secondaire underline">
            ↑ {tache.parent.titre}
          </Link>
        </div>
      ) : null}

      <Widget
        libelle={`Sous-tâches${tache.sousTaches.length > 0 ? ` — ${tache.sousTaches.filter((s) => s.statut === 'fait').length}/${tache.sousTaches.length}` : ''}`}
      >
        <ListeTaches
          taches={tache.sousTaches.filter((s) => s.statut !== 'fait')}
          reportable={false}
          vide={<Invitation>Aucune sous-tâche ouverte.</Invitation>}
        />

        {/* Ajout au fil de l'eau : un champ, une touche Entrée. Découper une
            tâche est un geste qu'on fait en y pensant, pas en changeant
            d'écran. */}
        <form action={creerTache} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="parent" value={id} />
          {tache.projetId ? (
            <input type="hidden" name="projet" value={tache.projetId} />
          ) : null}
          <Saisie
            name="titre"
            required
            autoComplete="off"
            placeholder="Ajouter une sous-tâche"
            aria-label="Ajouter une sous-tâche"
          />
          <button type="submit" className="cible shrink-0 px-2 text-13 underline">
            Ajouter
          </button>
        </form>
      </Widget>

      <Widget libelle="Modifier">
        <FormulaireTache action={modifier} tache={tache} projets={projets} />
      </Widget>
    </>
  )
}
