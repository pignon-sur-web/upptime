import { BoutonPrincipal, Champ, Menu, Saisie, Zone } from '@/components/ui/Champ'
import {
  ANCRAGES,
  LIBELLE_CONTEXTE,
  LIBELLE_PRIORITE,
  PRIORITES,
  RECURRENCES,
  CONTEXTES,
  type Priorite,
} from '@/lib/enums'
import type { Tache } from '@/lib/donnees/taches'

/**
 * Le formulaire de tâche, partagé par la création et la modification.
 *
 * Il n'y a pas de composant client ici : un `<form action={…}>` avec une
 * Server Action fonctionne sans JavaScript, ce qui compte sur un téléphone où
 * le script peut mettre trois secondes à arriver. La seule chose qu'on
 * perdrait serait l'affichage instantané, pas la capacité de saisir.
 */
export function FormulaireTache({
  action,
  tache,
  projets,
  parentId,
  libelleEnvoi = 'Enregistrer',
}: {
  action: (donnees: FormData) => Promise<void>
  tache?: Tache
  projets: readonly { id: string; nom: string }[]
  /** Renseigné quand on crée une sous-tâche depuis un écran de détail. */
  parentId?: string
  libelleEnvoi?: string
}) {
  return (
    <form action={action}>
      {parentId ? <input type="hidden" name="parent" value={parentId} /> : null}

      <Champ libelle="Titre">
        <Saisie
          name="titre"
          defaultValue={tache?.titre ?? ''}
          required
          autoComplete="off"
          placeholder="Ce qu'il y a à faire"
        />
      </Champ>

      <div className="flex gap-4">
        <div className="flex-1">
          <Champ libelle="Échéance">
            <Saisie type="date" name="echeance" defaultValue={tache?.echeance ?? ''} />
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Priorité">
            <Menu name="priorite" defaultValue={String(tache?.priorite ?? 0)}>
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
          <Champ libelle="Projet">
            <Menu name="projet" defaultValue={tache?.projetId ?? ''}>
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Menu>
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Contexte">
            <Menu name="contexte" defaultValue={tache?.contexte ?? ''}>
              <option value="">Aucun</option>
              {CONTEXTES.map((c) => (
                <option key={c} value={c}>
                  {LIBELLE_CONTEXTE[c]}
                </option>
              ))}
            </Menu>
          </Champ>
        </div>
      </div>

      <Champ
        libelle="Récurrence"
        aide="Une tâche récurrente a besoin d'une première échéance."
      >
        <Menu name="recurrence" defaultValue={tache?.recurrence ?? ''}>
          <option value="">Aucune</option>
          {RECURRENCES.map((r) => (
            <option key={r.valeur} value={r.valeur}>
              {r.libelle}
            </option>
          ))}
        </Menu>
      </Champ>

      {/* Deux récurrences vraiment différentes, pas deux cas limites : se
          tromper est visible et agaçant, demander une fois est une tape. */}
      <Champ libelle="Le compteur repart">
        <Menu name="ancrage" defaultValue={tache?.ancrage ?? 'schedule'}>
          {ANCRAGES.map((a) => (
            <option key={a.valeur} value={a.valeur}>
              {a.libelle} — {a.detail}
            </option>
          ))}
        </Menu>
      </Champ>

      <Champ libelle="Note">
        <Zone name="note" rows={3} defaultValue={tache?.note ?? ''} />
      </Champ>

      <div className="mt-6">
        <BoutonPrincipal type="submit">{libelleEnvoi}</BoutonPrincipal>
      </div>
    </form>
  )
}
