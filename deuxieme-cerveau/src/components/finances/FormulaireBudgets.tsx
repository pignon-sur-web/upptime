import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { euros, eurosAbsolus } from '@/lib/argent'
import { debutDuMois, aujourdhui, moisLong } from '@/lib/date'
import { enregistrerBudget, supprimerBudget } from '@/lib/actions/finances'
import type { Budget, CategorieDuMois } from '@/lib/donnees/finances'

/**
 * Les budgets.
 *
 * Un plafond sans mois vaut pour tous les mois ; avec un mois, il ne vaut que
 * pour celui-là. Ça donne « 80 €/mois de courses, sauf en décembre où c'est
 * 200 € » sans seconde table et sans notion d'exception à inventer.
 *
 * Le dépassement se lit par inversion de la ligne, ici comme dans les barres
 * de catégories : aucun rouge n'est disponible, et l'inversion crie de toute
 * façon plus fort.
 */
export function FormulaireBudgets({
  budgets,
  categories,
  statuts,
}: {
  budgets: readonly Budget[]
  categories: readonly string[]
  statuts: readonly CategorieDuMois[]
}) {
  const parCategorie = new Map(statuts.map((s) => [s.categorie, s]))
  const moisCourant = debutDuMois(aujourdhui())

  return (
    <>
      <Widget
        libelle={`Consommation — ${moisLong(aujourdhui())}`}
        action={<span className="chiffres text-13">{budgets.length}</span>}
      >
        {budgets.length === 0 ? (
          <Invitation>
            Aucun budget. Un plafond par catégorie suffit à rendre le dépassement
            visible sans y penser.
          </Invitation>
        ) : (
          <ul>
            {budgets.map((budget) => {
              const statut = parCategorie.get(budget.categorie)
              const depense = statut?.depenseCents ?? 0
              const depasse = depense > budget.plafondCents

              return (
                <li
                  key={budget.id}
                  className={[
                    'flex items-center gap-3 border-b border-trait py-2 last:border-b-0',
                    depasse ? 'rounded-petit bg-echec-fond px-2 text-echec' : '',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13">{budget.categorie}</span>
                    <span
                      className={[
                        'block text-11',
                        depasse ? 'text-echec/80' : 'text-secondaire',
                      ].join(' ')}
                    >
                      {budget.mois === null
                        ? 'plafond par défaut'
                        : `plafond de ${moisLong(budget.mois)}`}
                    </span>
                  </span>

                  <span className="chiffres shrink-0 text-13">
                    {eurosAbsolus(depense)} / {eurosAbsolus(budget.plafondCents)}
                  </span>

                  <form action={supprimerBudget.bind(null, budget.id)}>
                    <button
                      type="submit"
                      aria-label={`Supprimer le budget ${budget.categorie}`}
                      className={[
                        'shrink-0 px-1 text-13',
                        depasse ? 'text-echec' : 'text-secondaire',
                      ].join(' ')}
                    >
                      ×
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </Widget>

      <Widget libelle="Poser un plafond">
        <form action={enregistrerBudget}>
          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Catégorie">
                <Saisie
                  name="categorie"
                  required
                  list="categories-budget"
                  autoComplete="off"
                  placeholder="Courses"
                />
                <datalist id="categories-budget">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Plafond mensuel">
                <Saisie
                  name="plafond"
                  inputMode="decimal"
                  required
                  placeholder="80,00"
                  autoComplete="off"
                />
              </Champ>
            </div>
          </div>

          <Champ
            libelle="Ne vaut que pour un mois"
            aide="Laisser vide pour un plafond valable tous les mois."
          >
            <Menu name="mois" defaultValue="">
              <option value="">Tous les mois</option>
              <option value={moisCourant}>{moisLong(moisCourant)}</option>
            </Menu>
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Enregistrer le plafond</BoutonPrincipal>
          </div>
        </form>

        <p className="mt-4 text-11 text-secondaire">
          Le total dépensé ce mois-ci, toutes catégories confondues, est de{' '}
          <span className="chiffres">
            {euros(statuts.reduce((somme, s) => somme + s.depenseCents, 0))}
          </span>
          .
        </p>
      </Widget>
    </>
  )
}
