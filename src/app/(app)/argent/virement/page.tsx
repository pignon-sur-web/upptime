import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie, Zone } from '@/components/ui/Champ'
import { comptes } from '@/lib/donnees/finances'
import { enregistrerVirement } from '@/lib/actions/finances'
import { aujourdhui } from '@/lib/date'
import { euros } from '@/lib/argent'

export const metadata = { title: 'Virement' }

export default async function PageVirement() {
  const liste = await comptes()

  if (liste.length < 2) {
    return (
      <>
        <EnTeteSection titre="Virement" retour="/argent" />
        <Widget libelle="Virement">
          <Invitation>
            Un virement demande deux comptes. Il n&apos;y en a
            {liste.length === 0 ? ' aucun' : " qu'un"} pour l&apos;instant.
          </Invitation>
        </Widget>
      </>
    )
  }

  return (
    <>
      <EnTeteSection titre="Virement" retour="/argent" />

      <Widget libelle="Entre deux comptes">
        {/* Une seule fonction SQL crée les deux jambes. Deux insertions dans
            une action serveur peuvent réussir à moitié : l'argent quitterait
            le compte source sans arriver nulle part, et le solde serait faux
            en silence pendant trois semaines. */}
        <form action={enregistrerVirement}>
          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Depuis">
                <Menu name="source" defaultValue={liste[0]?.id}>
                  {liste.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Vers">
                <Menu name="destination" defaultValue={liste[1]?.id}>
                  {liste.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Montant">
                <Saisie
                  name="montant"
                  inputMode="decimal"
                  required
                  placeholder="500,00"
                  autoComplete="off"
                />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Date">
                <Saisie type="date" name="date" defaultValue={aujourdhui()} />
              </Champ>
            </div>
          </div>

          <Champ libelle="Libellé">
            <Saisie name="libelle" defaultValue="Virement" autoComplete="off" />
          </Champ>

          <Champ libelle="Note">
            <Zone name="note" rows={2} />
          </Champ>

          <div className="mt-6">
            <BoutonPrincipal type="submit">Enregistrer le virement</BoutonPrincipal>
          </div>
        </form>

        <p className="mt-4 text-11 text-secondaire">
          Un virement n&apos;est ni un revenu ni une dépense : il ne change pas le net
          du mois, seulement la répartition entre vos comptes. Il se supprime d&apos;un
          bloc depuis le grand livre, jamais jambe par jambe.
        </p>
      </Widget>

      <Widget libelle="Soldes actuels">
        <ul>
          {liste.map((c) => (
            <li
              key={c.id}
              className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
            >
              <span className="truncate text-13">{c.nom}</span>
              <span className="chiffres shrink-0 text-13">
                {euros(c.soldePointeCents)}
              </span>
            </li>
          ))}
        </ul>
      </Widget>
    </>
  )
}
