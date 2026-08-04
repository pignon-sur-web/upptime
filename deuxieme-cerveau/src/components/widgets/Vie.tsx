import Link from 'next/link'
import { Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import {
  inboxNonTriee,
  livresEnCours,
  objectifsEnCours,
  prochainsEvenements,
} from '@/lib/donnees/vie'
import { urlCouverture } from '@/lib/couvertures'
import { jourRelatif } from '@/lib/date'

const heure = new Intl.DateTimeFormat('fr-BE', {
  timeZone: 'Europe/Brussels',
  hour: '2-digit',
  minute: '2-digit',
})

export async function AgendaWidget() {
  const evenements = await prochainsEvenements(3)
  if (evenements.length === 0) return null

  return (
    <Widget
      libelle="Agenda"
      action={
        <Link href="/agenda" className="libelle">
          Tout
        </Link>
      }
    >
      <ul>
        {evenements.map((evenement) => (
          <li
            key={evenement.id}
            className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
          >
            <span className="truncate text-13">{evenement.titre}</span>
            <span className="chiffres shrink-0 text-11 text-secondaire">
              {jourRelatif(evenement.debut.slice(0, 10))}
              {evenement.journeeEntiere ? '' : ` ${heure.format(new Date(evenement.debut))}`}
            </span>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

export async function ObjectifsEnCoursWidget() {
  const objectifs = await objectifsEnCours()
  if (objectifs.length === 0) return null

  return (
    <Widget libelle="Objectifs en cours">
      <ul>
        {objectifs.map((objectif) => (
          <li key={objectif.id} className="border-b border-trait py-3 last:border-b-0">
            <Link href="/objectifs" className="block">
              <span className="flex items-baseline justify-between gap-4">
                <span className="truncate text-15">{objectif.nom}</span>
                <span className="chiffres shrink-0 text-11 text-secondaire">
                  {/* Sans résultat clé, la progression est inconnue, pas nulle. */}
                  {objectif.progression === null
                    ? '—'
                    : `${Math.round(objectif.progression * 100)} %`}
                </span>
              </span>
              <span className="mt-2 block">
                <Jauge valeur={objectif.progression} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

export async function LectureEnCoursWidget() {
  const livres = await livresEnCours()
  if (livres.length === 0) return null

  return (
    <Widget libelle="Lecture en cours">
      <ul className="flex gap-4">
        {livres.slice(0, 3).map((livre) => (
          <li key={livre.id} className="min-w-0 flex-1">
            <Link href="/lectures" className="block">
              {livre.couverture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlCouverture(livre.couverture)}
                  alt=""
                  className="mb-2 w-full border border-trait object-cover"
                />
              ) : (
                <span className="mb-2 flex aspect-2/3 w-full items-center justify-center border border-trait text-11 text-secondaire">
                  sans couverture
                </span>
              )}
              <span className="block truncate text-13">{livre.titre}</span>
              {livre.auteur ? (
                <span className="block truncate text-11 text-secondaire">{livre.auteur}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

export async function InboxWidget() {
  const elements = await inboxNonTriee()
  if (elements.length === 0) return null

  return (
    <Widget libelle="Inbox">
      <Link href="/inbox" className="flex items-baseline justify-between gap-4">
        <span className="chiffres text-40 leading-none">{elements.length}</span>
        <span className="text-13 text-secondaire">
          {elements.length > 1 ? 'éléments à trier' : 'élément à trier'}
        </span>
      </Link>
    </Widget>
  )
}
