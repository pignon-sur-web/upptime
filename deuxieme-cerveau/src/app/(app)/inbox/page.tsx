import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Zone } from '@/components/ui/Champ'
import { inboxOuverte } from '@/lib/donnees/vie'
import { capturer, convertirInbox, supprimerInbox } from '@/lib/actions/vie'
import { jourDe, jourRelatif } from '@/lib/date'

export const metadata = { title: 'Inbox' }

export default async function PageInbox() {
  const elements = await inboxOuverte()

  return (
    <>
      <EnTeteSection titre="Inbox" />

      <Widget libelle="Capturer">
        {/*
          Un champ, un bouton, aucune décision. L'inbox existe pour qu'une idée
          soit notée en trois secondes sans choisir si c'est une tâche, une note
          ou une dépense. Exiger ce choix au moment de la capture, c'est
          garantir qu'on ne capture pas.
        */}
        <form action={capturer}>
          <Champ libelle="Ce qui vous passe par la tête">
            <Zone
              name="contenu"
              rows={3}
              required
              placeholder="Rappeler le comptable · idée pour la page d'accueil · vérifier l'assurance"
            />
          </Champ>
          <div className="mt-3">
            <BoutonPrincipal type="submit">Capturer</BoutonPrincipal>
          </div>
        </form>
      </Widget>

      <Widget
        libelle="À trier"
        action={<span className="chiffres text-13">{elements.length}</span>}
      >
        {elements.length === 0 ? (
          <Invitation>Inbox vide. C&apos;est l&apos;état normal, pas un exploit.</Invitation>
        ) : (
          <ul>
            {elements.map((element) => (
              <li key={element.id} className="border-b border-trait py-3 last:border-b-0">
                <p className="text-15 whitespace-pre-wrap">{element.contenu}</p>
                <p className="mt-1 text-11 text-secondaire">
                  {jourRelatif(jourDe(element.creeLe))}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <form action={convertirInbox.bind(null, element.id, 'tache')}>
                    <button type="submit" className="cible text-13 underline">
                      En tâche
                    </button>
                  </form>
                  <form action={convertirInbox.bind(null, element.id, 'note')}>
                    <button type="submit" className="cible text-13 underline">
                      En note
                    </button>
                  </form>
                  <form action={supprimerInbox.bind(null, element.id)} className="ml-auto">
                    <button
                      type="submit"
                      className="cible text-13 text-secondaire underline"
                    >
                      Jeter
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
