import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { Invitation, Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { detailObjectif } from '@/lib/donnees/objectifs'
import {
  ajouterResultatCle,
  modifierObjectif,
  releverResultatCle,
  supprimerObjectif,
  supprimerResultatCle,
} from '@/lib/actions/objectifs'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_PRIORITE, PRIORITES, type Priorite } from '@/lib/enums'

export const metadata = { title: 'Objectif' }

const STATUTS = [
  { valeur: 'active', libelle: 'En cours' },
  { valeur: 'pause', libelle: 'En pause' },
  { valeur: 'termine', libelle: 'Terminé' },
  { valeur: 'abandonne', libelle: 'Abandonné' },
]

export default async function PageObjectif({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const objectif = await detailObjectif(id)
  if (!objectif) notFound()

  const modifier = modifierObjectif.bind(null, id)
  const ajouter = ajouterResultatCle.bind(null, id)
  const supprimer = supprimerObjectif.bind(null, id)

  return (
    <>
      <EnTeteSection titre={objectif.nom} retour="/objectifs" />

      <Carte>
        <p className="chiffres text-40 leading-none">
          {objectif.progression === null ? '—' : Math.round(objectif.progression * 100)}
          {objectif.progression === null ? null : (
            <span className="text-18 text-secondaire"> %</span>
          )}
        </p>
        <div className="mt-3">
          <Jauge valeur={objectif.progression} hauteur={6} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 text-11 text-secondaire">
          <span>{STATUTS.find((s) => s.valeur === objectif.statut)?.libelle}</span>
          {objectif.categorie ? <span>{objectif.categorie}</span> : null}
          {objectif.echeance ? <span>{jourRelatif(objectif.echeance)}</span> : null}
        </p>
      </Carte>

      <Widget
        libelle="Résultats clés"
        action={<span className="chiffres text-13">{objectif.nbResultats}</span>}
      >
        {objectif.resultats.length === 0 ? (
          <Invitation>
            Aucun résultat clé. Sans mesure, la progression reste un tiret — c&apos;est
            plus honnête qu&apos;un pourcentage inventé.
          </Invitation>
        ) : (
          <ul>
            {objectif.resultats.map((resultat) => {
              const relever = releverResultatCle.bind(null, resultat.id, id)
              const decroissant = resultat.cible < resultat.depart

              return (
                <li
                  key={resultat.id}
                  className="border-b border-trait py-3 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-13">{resultat.nom}</span>
                    <span className="chiffres shrink-0 text-13 text-secondaire">
                      {Math.round(resultat.progression * 100)} %
                    </span>
                  </div>

                  <div className="mt-2">
                    <Jauge valeur={resultat.progression} />
                  </div>

                  {/* Le départ est affiché autant que la cible : c'est lui qui
                      rend la mesure lisible sur un objectif décroissant —
                      86 → 78 kg avec 82 aujourd'hui, c'est la moitié du chemin,
                      pas 105 % de la cible. */}
                  <p className="mt-1.5 chiffres text-11 text-secondaire">
                    {resultat.depart} {decroissant ? '↓' : '→'} {resultat.cible}
                    {resultat.unite ? ` ${resultat.unite}` : ''}
                  </p>

                  <div className="mt-2 flex items-end gap-2">
                    <form action={relever} className="flex flex-1 items-end gap-2">
                      <span className="flex-1">
                        <Champ libelle="Valeur du jour">
                          <Saisie
                            name="actuel"
                            inputMode="decimal"
                            defaultValue={String(resultat.actuel)}
                            autoComplete="off"
                          />
                        </Champ>
                      </span>
                      <button type="submit" className="cible px-2 text-13 underline">
                        Relever
                      </button>
                    </form>

                    <form action={supprimerResultatCle.bind(null, resultat.id, id)}>
                      <button
                        type="submit"
                        aria-label={`Supprimer le résultat clé : ${resultat.nom}`}
                        className="cible px-2 text-13 text-secondaire"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Widget>

      <Widget libelle="Ajouter un résultat clé">
        <form action={ajouter}>
          <Champ libelle="Nom">
            <Saisie name="nom" required autoComplete="off" placeholder="Poids" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Départ">
                <Saisie name="depart" inputMode="decimal" required placeholder="86" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Actuel">
                <Saisie name="actuel" inputMode="decimal" placeholder="86" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Cible">
                <Saisie name="cible" inputMode="decimal" required placeholder="78" />
              </Champ>
            </div>
          </div>

          <Champ
            libelle="Unité"
            aide="La cible peut être inférieure au départ : perdre du poids se mesure comme le reste."
          >
            <Saisie name="unite" autoComplete="off" placeholder="kg" />
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Ajouter</BoutonPrincipal>
          </div>
        </form>
      </Widget>

      <Widget libelle="Modifier">
        <form action={modifier}>
          <Champ libelle="Nom">
            <Saisie name="nom" defaultValue={objectif.nom} required autoComplete="off" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Statut">
                <Menu name="statut" defaultValue={objectif.statut}>
                  {STATUTS.map((s) => (
                    <option key={s.valeur} value={s.valeur}>
                      {s.libelle}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Priorité">
                <Menu name="priorite" defaultValue={String(objectif.priorite ?? 0)}>
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
              <Champ libelle="Catégorie">
                <Saisie name="categorie" defaultValue={objectif.categorie ?? ''} />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Échéance">
                <Saisie type="date" name="echeance" defaultValue={objectif.echeance ?? ''} />
              </Champ>
            </div>
          </div>

          <input type="hidden" name="debut" value={objectif.debut ?? ''} />

          <div className="mt-4">
            <BoutonPrincipal type="submit">Enregistrer</BoutonPrincipal>
          </div>
        </form>

        <form action={supprimer} className="mt-6">
          <button type="submit" className="cible text-13 text-secondaire underline">
            Supprimer l&apos;objectif
          </button>
          <p className="text-11 text-secondaire">
            Ses {objectif.nbResultats} résultats clés partent avec.
          </p>
        </form>
      </Widget>
    </>
  )
}
