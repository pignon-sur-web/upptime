import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import {
  LIBELLE_PRIORITE,
  LIBELLE_STATUT_PROJET,
  PRIORITES,
  STATUTS_PROJET,
  type Priorite,
} from '@/lib/enums'
import type { Projet } from '@/lib/donnees/projets'

/** Formulaire de projet, partagé par la création et la modification. */
export function FormulaireProjet({
  action,
  projet,
  libelleEnvoi = 'Enregistrer',
}: {
  action: (donnees: FormData) => Promise<void>
  projet?: Projet
  libelleEnvoi?: string
}) {
  return (
    <form action={action}>
      <Champ libelle="Nom">
        <Saisie name="nom" defaultValue={projet?.nom ?? ''} required autoComplete="off" />
      </Champ>

      <div className="flex gap-4">
        <div className="flex-1">
          <Champ libelle="Statut">
            <Menu name="statut" defaultValue={projet?.statut ?? 'active'}>
              {STATUTS_PROJET.map((s) => (
                <option key={s} value={s}>
                  {LIBELLE_STATUT_PROJET[s]}
                </option>
              ))}
            </Menu>
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Priorité">
            <Menu name="priorite" defaultValue={String(projet?.priorite ?? 0)}>
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
            <Saisie type="date" name="debut" defaultValue={projet?.debut ?? ''} />
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Échéance">
            <Saisie type="date" name="echeance" defaultValue={projet?.echeance ?? ''} />
          </Champ>
        </div>
      </div>

      <div className="mt-6">
        <BoutonPrincipal type="submit">{libelleEnvoi}</BoutonPrincipal>
      </div>
    </form>
  )
}
