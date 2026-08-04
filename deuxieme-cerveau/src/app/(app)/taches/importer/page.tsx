import { EnTeteSection } from '@/components/nav/EnTete'
import { Import } from '@/components/taches/Import'

export const metadata = { title: 'Importer des tâches' }

export default function PageImport() {
  return (
    <>
      <EnTeteSection titre="Importer des tâches" retour="/taches" />
      <p className="px-5 py-4 text-13 text-secondaire">
        Depuis n&apos;importe quel export CSV — Todoist, Trello, Asana, Notion,
        ou un tableur. Rien n&apos;est écrit avant la dernière étape.
      </p>
      <Import />
    </>
  )
}
