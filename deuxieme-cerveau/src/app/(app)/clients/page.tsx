import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { LigneClient } from '@/components/vie/LigneClient'
import { creerClient } from '@/lib/actions/vie'
import { clients as tousClients } from '@/lib/donnees/vie'

export const metadata = { title: 'Clients' }

export default async function PageClients() {
  const clients = await tousClients()
  const aRelancer = clients.filter((c) => c.aRelancer)
  const autres = clients.filter((c) => !c.aRelancer)

  return (
    <>
      <EnTeteSection titre="Clients" />

      {/* L'alerte du cahier des charges : plus de 30 jours sans contact. Le
          filet vertical suffit à la porter, aucune couleur n'est nécessaire. */}
      {aRelancer.length > 0 ? (
        <Widget
          libelle="À relancer"
          action={<span className="chiffres text-13">{aRelancer.length}</span>}
        >
          <ul>
            {aRelancer.map((client) => (
              <LigneClient key={client.id} client={client} />
            ))}
          </ul>
        </Widget>
      ) : null}

      <Widget libelle={`Tous — ${clients.length}`}>
        {clients.length === 0 ? (
          <Invitation>Aucun client enregistré.</Invitation>
        ) : (
          <ul>
            {autres.map((client) => (
              <LigneClient key={client.id} client={client} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Ajouter">
        <form action={creerClient}>
          <input
            name="nom"
            required
            maxLength={160}
            aria-label="Nom"
            placeholder="Nom du client"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="email"
              type="email"
              aria-label="Email"
              placeholder="Email"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="telephone"
              type="tel"
              aria-label="Téléphone"
              placeholder="Téléphone"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
          </div>
          <input
            name="valeur"
            inputMode="decimal"
            aria-label="Valeur estimée"
            placeholder="Valeur estimée"
            className="chiffres mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter
          </button>
        </form>
      </Widget>
    </>
  )
}
