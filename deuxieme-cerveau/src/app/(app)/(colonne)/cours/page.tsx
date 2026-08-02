import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { cours } from '@/lib/donnees/vie'
import { enregistrerCours, supprimerCours } from '@/lib/actions/vie'

export const metadata = { title: 'Cours' }

const STATUTS = [
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'prevu', libelle: 'Prévus' },
  { valeur: 'termine', libelle: 'Terminés' },
  { valeur: 'abandonne', libelle: 'Abandonnés' },
] as const

export default async function PageCours() {
  const tous = await cours()

  return (
    <>
      <EnTeteSection titre="Cours" />

      {STATUTS.map((statut) => {
        const groupe = tous.filter((c) => c.statut === statut.valeur)
        if (groupe.length === 0) return null

        return (
          <Widget
            key={statut.valeur}
            libelle={statut.libelle}
            action={<span className="chiffres text-13">{groupe.length}</span>}
          >
            <ul>
              {groupe.map((formation) => (
                <li
                  key={formation.id}
                  className="border-b border-trait py-3 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-15">
                      {formation.url ? (
                        <a
                          href={formation.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline"
                        >
                          {formation.nom}
                        </a>
                      ) : (
                        formation.nom
                      )}
                    </span>
                    <span className="chiffres shrink-0 text-13 text-secondaire">
                      {formation.avancement} %
                    </span>
                  </div>

                  <div className="mt-2">
                    <Jauge valeur={formation.avancement / 100} />
                  </div>

                  {formation.matiere ? (
                    <p className="mt-1 text-11 text-secondaire">{formation.matiere}</p>
                  ) : null}

                  {/* L'avancement se relève au fil de l'eau : un champ et une
                      tape, pas un écran de détail à ouvrir. */}
                  <div className="mt-2 flex items-end gap-2">
                    <form action={enregistrerCours} className="flex flex-1 items-end gap-2">
                      <input type="hidden" name="id" value={formation.id} />
                      <input type="hidden" name="nom" value={formation.nom} />
                      <input type="hidden" name="matiere" value={formation.matiere ?? ''} />
                      <input type="hidden" name="url" value={formation.url ?? ''} />
                      <span className="flex-1">
                        <Champ libelle="Avancement">
                          <Saisie
                            name="avancement"
                            inputMode="numeric"
                            defaultValue={String(formation.avancement)}
                          />
                        </Champ>
                      </span>
                      <span className="flex-1">
                        <Champ libelle="Statut">
                          <Menu name="statut" defaultValue={formation.statut}>
                            {STATUTS.map((s) => (
                              <option key={s.valeur} value={s.valeur}>
                                {s.libelle}
                              </option>
                            ))}
                          </Menu>
                        </Champ>
                      </span>
                      <button type="submit" className="cible px-2 text-13 underline">
                        Relever
                      </button>
                    </form>

                    <form action={supprimerCours.bind(null, formation.id)}>
                      <button
                        type="submit"
                        aria-label={`Supprimer : ${formation.nom}`}
                        className="cible px-2 text-13 text-secondaire"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Widget>
        )
      })}

      {tous.length === 0 ? (
        <Widget libelle="Cours">
          <Invitation>Aucune formation suivie.</Invitation>
        </Widget>
      ) : null}

      <Widget libelle="Ajouter un cours">
        <form action={enregistrerCours}>
          <Champ libelle="Nom">
            <Saisie name="nom" required autoComplete="off" />
          </Champ>
          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Matière">
                <Saisie name="matiere" autoComplete="off" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Statut">
                <Menu name="statut" defaultValue="prevu">
                  {STATUTS.map((s) => (
                    <option key={s.valeur} value={s.valeur}>
                      {s.libelle}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
          </div>
          <Champ libelle="Lien">
            <Saisie type="url" name="url" autoComplete="off" placeholder="https://" />
          </Champ>
          <div className="mt-4">
            <BoutonPrincipal type="submit">Ajouter</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}
