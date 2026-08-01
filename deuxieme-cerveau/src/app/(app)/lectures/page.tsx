import Image from 'next/image'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { livres, type Livre } from '@/lib/donnees/vie'
import { enregistrerLivre, supprimerLivre } from '@/lib/actions/vie'
import { jourRelatif } from '@/lib/date'

export const metadata = { title: 'Lectures' }

const STATUTS = [
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'a_lire', libelle: 'À lire' },
  { valeur: 'lu', libelle: 'Lus' },
  { valeur: 'abandonne', libelle: 'Abandonnés' },
] as const

export default async function PageLectures() {
  const tous = await livres()

  return (
    <>
      <EnTeteSection titre="Lectures" />

      {STATUTS.map((statut) => {
        const groupe = tous.filter((l) => l.statut === statut.valeur)
        if (groupe.length === 0) return null

        return (
          <Widget
            key={statut.valeur}
            libelle={statut.libelle}
            action={<span className="chiffres text-13">{groupe.length}</span>}
          >
            <ul>
              {groupe.map((livre) => (
                <LigneLivre key={livre.id} livre={livre} />
              ))}
            </ul>
          </Widget>
        )
      })}

      {tous.length === 0 ? (
        <Widget libelle="Lectures">
          <Invitation>Aucun livre pour l&apos;instant.</Invitation>
        </Widget>
      ) : null}

      <Widget libelle="Ajouter un livre">
        {/*
          Le formulaire porte enctype multipart : sans lui, le fichier de
          couverture n'arriverait pas dans le FormData de la Server Action et
          l'échec serait silencieux.
        */}
        <form action={enregistrerLivre} encType="multipart/form-data">
          <Champ libelle="Titre">
            <Saisie name="titre" required autoComplete="off" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Auteur">
                <Saisie name="auteur" autoComplete="off" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Catégorie">
                <Saisie name="categorie" autoComplete="off" />
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Statut">
                <Menu name="statut" defaultValue="a_lire">
                  {STATUTS.map((s) => (
                    <option key={s.valeur} value={s.valeur}>
                      {s.libelle}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Note">
                <Menu name="note" defaultValue="">
                  <option value="">Aucune</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}/5
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
          </div>

          <Champ
            libelle="Couverture"
            aide="Bucket public, nom aléatoire. Une couverture de livre n'est pas un secret, et une URL signée expirerait en cassant le cache des images."
          >
            <input
              type="file"
              name="couverture"
              accept="image/*"
              className="w-full py-3 text-13 file:mr-3 file:border file:border-trait file:bg-transparent file:px-3 file:py-2 file:text-13 file:text-texte"
            />
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Ajouter</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}

function LigneLivre({ livre }: { livre: Livre }) {
  return (
    <li className="flex items-start gap-3 border-b border-trait py-3 last:border-b-0">
      {livre.urlCouverture ? (
        <Image
          src={livre.urlCouverture}
          alt=""
          width={40}
          height={60}
          className="h-15 w-10 shrink-0 border border-trait object-cover"
        />
      ) : (
        <span aria-hidden className="h-15 w-10 shrink-0 border border-trait" />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-15">{livre.titre}</span>
        <span className="block text-11 text-secondaire">
          {[
            livre.auteur,
            livre.categorie,
            livre.note ? `${livre.note}/5` : null,
            livre.finiLe ? `fini ${jourRelatif(livre.finiLe)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>

        <form action={enregistrerLivre} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="id" value={livre.id} />
          <input type="hidden" name="titre" value={livre.titre} />
          <input type="hidden" name="auteur" value={livre.auteur ?? ''} />
          <input type="hidden" name="categorie" value={livre.categorie ?? ''} />
          <input type="hidden" name="note" value={livre.note ?? ''} />
          <Menu name="statut" defaultValue={livre.statut} aria-label="Statut du livre">
            {STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </Menu>
          <button type="submit" className="cible shrink-0 px-2 text-13 underline">
            Changer
          </button>
        </form>
      </span>

      <form action={supprimerLivre.bind(null, livre.id)}>
        <button
          type="submit"
          aria-label={`Supprimer : ${livre.titre}`}
          className="shrink-0 px-1 text-13 text-secondaire"
        >
          ×
        </button>
      </form>
    </li>
  )
}
