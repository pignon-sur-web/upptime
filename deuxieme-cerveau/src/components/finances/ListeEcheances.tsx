import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { euros } from '@/lib/argent'
import { aujourdhui, jourRelatif } from '@/lib/date'
import { RECURRENCES } from '@/lib/enums'
import {
  creerEcheance,
  payerEcheance,
  supprimerEcheance,
} from '@/lib/actions/finances'
import type { Echeance } from '@/lib/donnees/finances'

/**
 * Les paiements à venir.
 *
 * Marquer « payé » crée l'écriture correspondante — c'est la RPC qui s'en
 * charge, et c'est ce qui empêche « payé » de devenir un booléen flottant à
 * côté de l'argent réel pendant que les soldes dérivent en silence. Une
 * échéance récurrente prépare la suivante au passage, sans dérive de fin de
 * mois.
 *
 * Les échéances en retard restent dans la liste, marquées d'un filet gauche :
 * les sortir reviendrait à les faire disparaître au moment précis où elles
 * comptent le plus.
 */
export function ListeEcheances({
  echeances,
  comptes,
}: {
  echeances: readonly Echeance[]
  comptes: readonly { id: string; nom: string }[]
}) {
  const jour = aujourdhui()
  const total = echeances.reduce((somme, e) => somme + e.montantCents, 0)

  return (
    <>
      <Widget
        libelle="À venir"
        action={
          echeances.length > 0 ? (
            <span className="chiffres text-13">{euros(-total)}</span>
          ) : null
        }
      >
        {echeances.length === 0 ? (
          <Invitation>Aucune échéance dans les soixante prochains jours.</Invitation>
        ) : (
          <ul>
            {echeances.map((echeance) => {
              const enRetard = echeance.echeance < jour
              const payer = payerEcheance.bind(null, echeance.id, echeance.compteId ?? undefined)

              return (
                <li
                  key={echeance.id}
                  className={[
                    'flex items-center gap-3 border-b border-trait py-2 last:border-b-0',
                    enRetard ? 'border-l-2 border-l-echec pl-3' : '',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13">{echeance.nom}</span>
                    <span className="block text-11 text-secondaire">
                      <span className={enRetard ? 'text-texte' : undefined}>
                        {jourRelatif(echeance.echeance, jour)}
                      </span>
                      {echeance.categorie ? ` · ${echeance.categorie}` : ''}
                      {echeance.recurrence ? ' · ↻' : ''}
                    </span>
                  </span>

                  <span className="chiffres shrink-0 text-13">
                    {euros(-echeance.montantCents)}
                  </span>

                  <form action={payer}>
                    <button
                      type="submit"
                      disabled={!echeance.compteId && comptes.length === 0}
                      className="cible shrink-0 px-2 text-13 underline disabled:opacity-40"
                    >
                      Payer
                    </button>
                  </form>

                  <form action={supprimerEcheance.bind(null, echeance.id)}>
                    <button
                      type="submit"
                      aria-label={`Supprimer l'échéance : ${echeance.nom}`}
                      className="shrink-0 px-1 text-13 text-secondaire"
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

      <Widget libelle="Nouvelle échéance">
        <form action={creerEcheance}>
          <Champ libelle="Nom">
            <Saisie name="nom" required autoComplete="off" placeholder="Loyer" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Montant">
                <Saisie
                  name="montant"
                  inputMode="decimal"
                  required
                  placeholder="750,00"
                  autoComplete="off"
                />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Échéance">
                <Saisie type="date" name="echeance" required />
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Compte">
                <Menu name="compte" defaultValue={comptes[0]?.id ?? ''}>
                  <option value="">Au moment du paiement</option>
                  {comptes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Catégorie">
                <Saisie name="categorie" autoComplete="off" placeholder="Logement" />
              </Champ>
            </div>
          </div>

          <Champ libelle="Récurrence">
            <Menu name="recurrence" defaultValue="">
              <option value="">Une seule fois</option>
              {RECURRENCES.map((r) => (
                <option key={r.valeur} value={r.valeur}>
                  {r.libelle}
                </option>
              ))}
            </Menu>
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Ajouter l&apos;échéance</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}
