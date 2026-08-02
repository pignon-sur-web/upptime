import Link from 'next/link'
import Image from 'next/image'
import { Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { listerObjectifs } from '@/lib/donnees/objectifs'
import { prochainsEvenements } from '@/lib/donnees/agenda'
import { inboxOuverte, lectureEnCours } from '@/lib/donnees/vie'
import { aujourdhui, heure, jourDe, jourRelatif } from '@/lib/date'

/**
 * Les widgets « vie » du tableau de bord : objectifs et agenda.
 *
 * Comme les autres, ils disparaissent à vide. Un widget qui annonce qu'il n'a
 * rien à annoncer coûte une place et ne rend aucun service.
 */

export async function ObjectifsEnCoursWidget() {
  const objectifs = await listerObjectifs()
  if (objectifs.length === 0) return null

  return (
    <Widget
      libelle="Objectifs"
      emoji="🎯"
      action={
        <Link href="/objectifs" className="action">
          Tout voir
        </Link>
      }
    >
      <ul>
        {objectifs.slice(0, 3).map((objectif) => (
          <li key={objectif.id} className="border-b border-trait py-2 last:border-b-0">
            <Link href={`/objectifs/${objectif.id}`} className="block">
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-13">{objectif.nom}</span>
                {/* Tiret et non 0 % : sans résultat clé, la progression est
                    inconnue, pas nulle. */}
                <span className="chiffres shrink-0 text-11 text-secondaire">
                  {objectif.progression === null
                    ? '—'
                    : `${Math.round(objectif.progression * 100)} %`}
                </span>
              </div>
              <div className="mt-1.5">
                <Jauge valeur={objectif.progression} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  )
}

/**
 * Les prochains rendez-vous, sur sept jours.
 *
 * Un événement en cours reste affiché jusqu'à sa fin — la requête filtre sur
 * `ends_at` et non sur `starts_at`. Voir disparaître de son tableau de bord la
 * réunion à laquelle on est en train d'assister est une petite trahison.
 */
export async function AgendaWidget() {
  const evenements = await prochainsEvenements(7)
  if (evenements.length === 0) return null

  const jour = aujourdhui()

  return (
    <Widget
      libelle="Agenda"
      emoji="📅"
      action={
        <Link href="/agenda" className="action">
          Semaine
        </Link>
      }
    >
      <ul>
        {evenements.slice(0, 5).map((evenement) => {
          const jourEvenement = jourDe(evenement.debut)
          return (
            <li
              key={evenement.id}
              className="flex items-baseline gap-3 border-b border-trait py-1.5 last:border-b-0"
            >
              <span className="chiffres w-12 shrink-0 text-11 text-secondaire">
                {evenement.journeeEntiere ? 'jour' : heure(evenement.debut)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13">{evenement.titre}</span>
                <span className="block text-11 text-secondaire">
                  {jourRelatif(jourEvenement, jour)}
                  {evenement.lieu ? ` · ${evenement.lieu}` : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Widget>
  )
}

/**
 * La lecture en cours : couverture, titre, auteur.
 *
 * Un seul livre — celui qui est ouvert. Une pile à lire sur le tableau de bord
 * n'est pas une information, c'est un reproche.
 */
export async function LectureEnCoursWidget() {
  const livre = await lectureEnCours()
  if (!livre) return null

  return (
    <Widget
      libelle="En lecture"
      emoji="📖"
      action={
        <Link href="/lectures" className="action">
          Lectures
        </Link>
      }
    >
      <div className="flex items-start gap-3">
        {livre.urlCouverture ? (
          <Image
            src={livre.urlCouverture}
            alt=""
            width={48}
            height={72}
            className="h-18 w-12 shrink-0 border border-trait object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-15">{livre.titre}</p>
          {livre.auteur ? (
            <p className="truncate text-13 text-secondaire">{livre.auteur}</p>
          ) : null}
          {livre.commenceLe ? (
            <p className="text-11 text-secondaire">
              commencé {jourRelatif(livre.commenceLe)}
            </p>
          ) : null}
        </div>
      </div>
    </Widget>
  )
}

/**
 * L'inbox, et seulement quand elle n'est pas vide.
 *
 * Le compte suffit : ce widget n'est pas là pour qu'on trie depuis l'accueil,
 * il est là pour qu'on n'oublie pas qu'il y a à trier.
 */
export async function InboxWidget() {
  const elements = await inboxOuverte()
  if (elements.length === 0) return null

  return (
    <Widget
      libelle="Inbox"
      emoji="📥"
      action={<span className="chiffres text-13">{elements.length}</span>}
    >
      <ul>
        {elements.slice(0, 3).map((element) => (
          <li
            key={element.id}
            className="truncate border-b border-trait py-1.5 text-13 last:border-b-0"
          >
            {element.contenu.split('\n')[0]}
          </li>
        ))}
      </ul>
      <Link href="/inbox" className="mt-3 block text-13 text-secondaire underline">
        Trier
      </Link>
    </Widget>
  )
}
