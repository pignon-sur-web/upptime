import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie, Zone } from '@/components/ui/Champ'
import { clients, SEUIL_RELANCE_JOURS, type Client } from '@/lib/donnees/vie'
import {
  enregistrerClient,
  marquerContacte,
  supprimerClient,
} from '@/lib/actions/vie'
import { euros } from '@/lib/argent'
import { jourRelatif } from '@/lib/date'

export const metadata = { title: 'Clients' }

const STATUTS = [
  { valeur: 'piste', libelle: 'Piste' },
  { valeur: 'actif', libelle: 'Actif' },
  { valeur: 'pause', libelle: 'En pause' },
  { valeur: 'gagne', libelle: 'Gagné' },
  { valeur: 'perdu', libelle: 'Perdu' },
]

export default async function PageClients({
  searchParams,
}: {
  searchParams: Promise<{ tous?: string }>
}) {
  const { tous } = await searchParams
  const liste = await clients(tous === '1')

  const aRelancer = liste.filter((c) => c.aRelancer)
  const reste = liste.filter((c) => !c.aRelancer)

  return (
    <>
      <EnTeteSection titre="Clients" />

      <div className="flex gap-4 border-b border-trait px-5 py-3 text-13">
        <Link
          href="/clients"
          className={tous === '1' ? 'text-secondaire' : 'text-texte underline'}
        >
          En cours
        </Link>
        <Link
          href="/clients?tous=1"
          className={tous === '1' ? 'text-texte underline' : 'text-secondaire'}
        >
          Tous
        </Link>
      </div>

      {aRelancer.length > 0 ? (
        <Widget
          libelle="À relancer"
          action={<span className="chiffres text-13">{aRelancer.length}</span>}
        >
          {/*
            Deux façons de mériter une relance : une date de relance échue, ou
            plus de trente jours sans contact. La seconde attrape ce que la
            première rate — on oublie de poser une date bien plus souvent qu'on
            oublie de rappeler.
          */}
          <ul>
            {aRelancer.map((client) => (
              <LigneClient key={client.id} client={client} alerte />
            ))}
          </ul>
        </Widget>
      ) : null}

      <Widget
        libelle="Portefeuille"
        action={<span className="chiffres text-13">{liste.length}</span>}
      >
        {liste.length === 0 ? (
          <Invitation>Aucun client enregistré.</Invitation>
        ) : reste.length === 0 ? (
          <p className="text-13 text-secondaire">
            Tout le portefeuille est dans la liste des relances.
          </p>
        ) : (
          <ul>
            {reste.map((client) => (
              <LigneClient key={client.id} client={client} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Ajouter un client">
        <form action={enregistrerClient}>
          <Champ libelle="Nom">
            <Saisie name="nom" required autoComplete="off" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Statut">
                <Menu name="statut" defaultValue="piste">
                  {STATUTS.map((s) => (
                    <option key={s.valeur} value={s.valeur}>
                      {s.libelle}
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Valeur estimée (€)">
                <Saisie name="valeur" inputMode="decimal" placeholder="2500" />
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Dernier contact">
                <Saisie type="date" name="dernierContact" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Prochaine relance">
                <Saisie type="date" name="relance" />
              </Champ>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Courriel">
                <Saisie type="email" name="email" autoComplete="off" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Téléphone">
                <Saisie type="tel" name="telephone" autoComplete="off" />
              </Champ>
            </div>
          </div>

          <Champ libelle="Notes">
            <Zone name="notes" rows={2} />
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Ajouter</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}

function LigneClient({ client, alerte = false }: { client: Client; alerte?: boolean }) {
  return (
    <li
      className={[
        'border-b border-trait py-3 last:border-b-0',
        alerte ? 'border-l-2 border-l-texte pl-3' : '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-15">{client.nom}</span>
        {client.valeurCents !== null ? (
          <span className="chiffres shrink-0 text-13 text-secondaire">
            {euros(client.valeurCents)}
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 flex flex-wrap gap-x-3 text-11 text-secondaire">
        <span>{STATUTS.find((s) => s.valeur === client.statut)?.libelle}</span>
        <span className={alerte ? 'text-texte' : undefined}>
          {client.joursSansContact === null
            ? 'jamais contacté'
            : `${client.joursSansContact} j sans contact`}
        </span>
        {client.prochaineRelance ? (
          <span>relance {jourRelatif(client.prochaineRelance)}</span>
        ) : null}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <form action={marquerContacte.bind(null, client.id)}>
          <button type="submit" className="cible text-13 underline">
            Contacté aujourd&apos;hui
          </button>
        </form>
        {client.email ? (
          <a href={`mailto:${client.email}`} className="cible text-13 text-secondaire underline">
            Écrire
          </a>
        ) : null}
        {client.telephone ? (
          <a href={`tel:${client.telephone}`} className="cible text-13 text-secondaire underline">
            Appeler
          </a>
        ) : null}
        <form action={supprimerClient.bind(null, client.id)} className="ml-auto">
          <button
            type="submit"
            aria-label={`Supprimer : ${client.nom}`}
            className="cible px-1 text-13 text-secondaire"
          >
            ×
          </button>
        </form>
      </div>

      {alerte && client.joursSansContact !== null &&
      client.joursSansContact > SEUIL_RELANCE_JOURS ? (
        <p className="mt-1 text-11 text-secondaire">
          Plus de {SEUIL_RELANCE_JOURS} jours sans nouvelle.
        </p>
      ) : null}
    </li>
  )
}
