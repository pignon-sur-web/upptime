import { EnTeteJour } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'

export default function TableauDeBord() {
  return (
    <>
      <EnTeteJour />

      {/* Les widgets arrivent avec leurs sections, phase par phase. Chacun est
          un composant serveur autonome qui va chercher ses propres données ;
          aucun ne contient de donnée en dur. */}
      <Widget libelle="Le jour">
        <Invitation>
          Les habitudes arrivent en phase 2. Rien n&apos;est encore branché.
        </Invitation>
      </Widget>
    </>
  )
}
