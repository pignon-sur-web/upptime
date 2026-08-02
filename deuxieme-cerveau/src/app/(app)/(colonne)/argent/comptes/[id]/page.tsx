import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { Invitation, Widget } from '@/components/ui/Widget'
import { ListeTransactions } from '@/components/finances/ListeTransactions'
import { detailCompte, transactions } from '@/lib/donnees/finances'
import { archiverCompte } from '@/lib/actions/finances'
import { euros } from '@/lib/argent'
import { jourRelatif } from '@/lib/date'

export const metadata = { title: 'Compte' }

export default async function PageCompte({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [compte, lignes] = await Promise.all([
    detailCompte(id),
    transactions({ compteId: id, limite: 200 }),
  ])

  if (!compte) notFound()

  const basculer = archiverCompte.bind(null, id, !compte.archive)

  return (
    <>
      <EnTeteSection titre={compte.nom} retour="/argent" />

      <Carte>
        <p className="chiffres text-40 leading-none">{euros(compte.soldePointeCents)}</p>

        {/* Le solde pointé s'arrête à aujourd'hui, le solde total inclut les
            écritures post-datées. Les afficher tous les deux, quand ils
            diffèrent, transforme une enquête en évidence. */}
        {compte.soldeCents !== compte.soldePointeCents ? (
          <p className="mt-1 text-13 text-secondaire">
            <span className="chiffres">{euros(compte.soldeCents)}</span> en comptant les
            écritures à venir
          </p>
        ) : null}

        <p className="mt-2 flex flex-wrap gap-x-3 text-11 text-secondaire">
          <span className="chiffres">
            {compte.nbEcritures} écriture{compte.nbEcritures > 1 ? 's' : ''}
          </span>
          <span className="chiffres">
            ouverture {euros(compte.ouvertureCents)}
          </span>
          {compte.derniereEcriture ? (
            <span>dernière {jourRelatif(compte.derniereEcriture)}</span>
          ) : null}
        </p>

        <div className="mt-3 flex gap-4 text-13">
          <Link href="/argent/rapprochement" className="underline">
            Rapprocher
          </Link>
          <Link href="/argent/virement" className="underline">
            Virement
          </Link>
        </div>
      </Carte>

      <Widget
        libelle="Grand livre"
        action={<span className="chiffres text-13">{lignes.length}</span>}
      >
        {lignes.length === 0 ? (
          <Invitation>Aucune écriture sur ce compte.</Invitation>
        ) : (
          <ListeTransactions transactions={lignes} afficherCompte={false} />
        )}
      </Widget>

      <Widget libelle="Réglages">
        <form action={basculer}>
          <button type="submit" className="cible text-13 underline">
            {compte.archive ? 'Réactiver ce compte' : 'Archiver ce compte'}
          </button>
          <p className="text-11 text-secondaire">
            Un compte archivé disparaît des listes et de la saisie, mais ses écritures
            et son historique restent intacts.
          </p>
        </form>
      </Widget>
    </>
  )
}
