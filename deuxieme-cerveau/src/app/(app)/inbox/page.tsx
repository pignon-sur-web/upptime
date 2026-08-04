import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { CaptureRapide } from '@/components/vie/CaptureRapide'
import { ElementATrier } from '@/components/vie/ElementATrier'
import { inboxNonTriee } from '@/lib/donnees/vie'
import { comptesActifs } from '@/lib/donnees/finances'

export const metadata = { title: 'Inbox' }

export default async function PageInbox() {
  const [elements, comptes] = await Promise.all([inboxNonTriee(), comptesActifs()])

  return (
    <>
      <EnTeteSection titre="Inbox" />

      {/* Un champ, un bouton. Rien d'autre : c'est la seule chose qui rend la
          capture assez rapide pour qu'on la fasse vraiment. Le tri vient
          après, jamais pendant. */}
      <Widget libelle="Capturer">
        <CaptureRapide />
      </Widget>

      <Widget
        libelle="À trier"
        action={
          elements.length > 0 ? (
            <span className="chiffres text-13">{elements.length}</span>
          ) : null
        }
      >
        {elements.length === 0 ? (
          <Invitation>Rien à trier. C&apos;est le bon état.</Invitation>
        ) : (
          <ul>
            {elements.map((element) => (
              <ElementATrier
                key={element.id}
                element={element}
                comptes={comptes.map((c) => ({ id: c.id, nom: c.nom }))}
              />
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
