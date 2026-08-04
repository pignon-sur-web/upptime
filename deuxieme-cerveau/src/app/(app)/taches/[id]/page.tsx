import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { DetailTache } from '@/components/taches/DetailTache'
import { sousTachesDe, toutesTaches } from '@/lib/donnees/taches'
import { projetsPourChoix } from '@/lib/donnees/projets'

export const metadata = { title: 'Tâche' }

export default async function PageTache({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [taches, projets] = await Promise.all([
    toutesTaches({ statut: 'toutes' }),
    projetsPourChoix(),
  ])

  const tache = taches.find((t) => t.id === id)
  if (!tache) notFound()

  const sous = await sousTachesDe([id])

  return (
    <>
      <EnTeteSection titre={tache.titre} retour="/taches" />
      <Widget libelle="La tâche">
        <DetailTache
          tache={tache}
          sousTaches={sous.get(id) ?? []}
          projets={projets}
        />
      </Widget>
    </>
  )
}
