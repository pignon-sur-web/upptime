import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { Rapprochement } from '@/components/finances/Rapprochement'
import { compte as lireCompte } from '@/lib/donnees/finances'

export const metadata = { title: 'Rapprocher' }

export default async function PageRapprocher({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const compte = await lireCompte(id)
  if (!compte) notFound()

  return (
    <>
      <EnTeteSection titre={`Rapprocher ${compte.nom}`} retour="/argent" />
      <Widget libelle="Rapprochement">
        <Rapprochement
          compteId={compte.id}
          compteNom={compte.nom}
          calculeCents={compte.soldeCents}
        />
      </Widget>
    </>
  )
}
