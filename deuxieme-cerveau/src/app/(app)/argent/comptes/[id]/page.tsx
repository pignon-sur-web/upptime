import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { LigneEcriture } from '@/components/finances/LigneEcriture'
import { compte as lireCompte, ecrituresDuCompte } from '@/lib/donnees/finances'
import { formater } from '@/lib/argent'

export const metadata = { title: 'Compte' }

export default async function PageCompte({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const compte = await lireCompte(id)
  if (!compte) notFound()

  const ecritures = await ecrituresDuCompte(id)

  return (
    <>
      <EnTeteSection
        titre={compte.nom}
        retour="/argent"
        action={
          <Link href={`/argent/rapprocher/${compte.id}`} className="libelle">
            Rapprocher
          </Link>
        }
      />

      <Widget libelle="Solde">
        <p className="chiffres text-40 leading-none">{formater(compte.soldeCents)}</p>
        {compte.soldePointeCents !== compte.soldeCents ? (
          <p className="chiffres mt-2 text-13 text-secondaire">
            {formater(compte.soldePointeCents)} en ne comptant que les écritures
            déjà passées
          </p>
        ) : null}
      </Widget>

      <Widget
        libelle="Relevé"
        action={<span className="chiffres text-13">{compte.nbEcritures}</span>}
      >
        {ecritures.length === 0 ? (
          <Invitation>Aucune écriture sur ce compte.</Invitation>
        ) : (
          <ul>
            {ecritures.map((ecriture) => (
              <LigneEcriture key={ecriture.id} ecriture={ecriture} />
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
