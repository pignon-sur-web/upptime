import { EnTeteSection } from '@/components/nav/EnTete'
import { AssistantImport } from '@/components/taches/AssistantImport'

export const metadata = { title: 'Importer des tâches' }

export default function PageImport() {
  return (
    <>
      <EnTeteSection titre="Importer des tâches" retour="/taches" />
      <AssistantImport />
    </>
  )
}
