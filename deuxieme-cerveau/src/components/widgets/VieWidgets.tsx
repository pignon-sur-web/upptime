import Link from 'next/link'
import Image from 'next/image'
import { Widget } from '@/components/ui/Widget'
import { Jauge } from '@/components/ui/Jauge'
import { Badge } from '@/components/ui/Badge'
import { SemaineEnColonnes } from '@/components/agenda/SemaineEnColonnes'
import { listerObjectifs } from '@/lib/donnees/objectifs'
import { agendaEntre } from '@/lib/donnees/agenda'
import { inboxOuverte, livres } from '@/lib/donnees/vie'
import { aujourdhui, decaler, ecartJours, jourRelatif, type Jour } from '@/lib/date'

/**
 * Les widgets « vie » du tableau de bord : objectifs et agenda.
 *
 * Comme les autres, ils disparaissent à vide. Un widget qui annonce qu'il n'a
 * rien à annoncer coûte une place et ne rend aucun service.
 */

/**
 * « 47 jours restants », comme la maquette — ou le retard, s'il y en a.
 *
 * Le compte se fait en jours de calendrier belge et non en millisecondes :
 * `ecartJours` passe par les mêmes fonctions que le reste de
 * l'application, donc un changement d'heure ne décale rien.
 */
function joursRestants(echeance: Jour): string {
  const jours = ecartJours(aujourdhui(), echeance)
  if (jours < 0) return `${-jours} j de retard`
  if (jours === 0) return "c'est aujourd'hui"
  return `${jours} j restants`
}

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

              {/* La catégorie est du texte libre en base : on l'affiche telle
                  quelle, en étiquette neutre. Lui attribuer une couleur
                  demanderait une table de correspondance qui serait fausse dès
                  la première catégorie inventée. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-11 text-secondaire">
                {objectif.categorie ? (
                  <Badge pastille={false}>{objectif.categorie}</Badge>
                ) : null}
                {objectif.echeance ? (
                  <span>{joursRestants(objectif.echeance)}</span>
                ) : null}
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
 * La semaine, en colonnes.
 *
 * Le widget montrait une liste plate ; il montre maintenant sept colonnes,
 * une par jour. La différence n'est pas cosmétique : une liste dit « ce qui
 * vient », une grille dit « à quoi ressemble ma semaine » — où sont les
 * journées pleines, où sont les trous. C'est la seconde question qu'on se pose
 * devant un tableau de bord.
 *
 * `agendaEntre` renvoie déjà exactement cette structure, événements ET tâches
 * datées comprises.
 *
 * La fenêtre part d'AUJOURD'HUI et non du lundi. La maquette montre une
 * semaine calendaire, mais un tableau de bord consulté un dimanche afficherait
 * alors six jours écoulés et un seul à venir — et rien du tout si la semaine
 * qui s'achève était vide, puisque le widget se retire quand il n'a rien à
 * dire. Sept jours glissants gardent la forme en colonnes et l'utilité.
 *
 * Pleine largeur : sept colonnes ne tiennent pas dans un tiers de rangée.
 */
export async function AgendaWidget() {
  const depart = aujourdhui()
  const jours = await agendaEntre(depart, decaler(depart, 6))

  const nbEvenements = jours.reduce((total, j) => total + j.evenements.length, 0)
  const nbTaches = jours.reduce((total, j) => total + j.taches.length, 0)
  if (nbEvenements + nbTaches === 0) return null

  return (
    <Widget
      libelle="Agenda de la semaine"
      emoji="📅"
      largeur="plein"
      action={
        <Link href="/agenda" className="action">
          Ouvrir
        </Link>
      }
    >
      <SemaineEnColonnes jours={jours} />
    </Widget>
  )
}

/**
 * Les lectures en cours : leurs couvertures.
 *
 * Le widget n'affichait qu'un livre, et son commentaire disait pourquoi :
 * « une pile à lire sur le tableau de bord n'est pas une information, c'est un
 * reproche. » La phrase reste vraie — pour les livres À LIRE. Elle ne vaut pas
 * pour ceux qu'on a ouverts : lire deux ou trois choses de front est banal, et
 * n'en montrer qu'une donne l'impression d'avoir abandonné les autres.
 *
 * Trois au plus, quand même. Au-delà, ce n'est plus « en cours », c'est une
 * pile — et le reproche revient.
 */
export async function LectureEnCoursWidget() {
  const tous = await livres()
  const enCours = tous.filter((livre) => livre.statut === 'en_cours').slice(0, 3)
  if (enCours.length === 0) return null

  return (
    <Widget
      libelle="Livres en cours"
      emoji="📖"
      action={
        <Link href="/lectures" className="action">
          Lectures
        </Link>
      }
    >
      <ul className="flex flex-col gap-3">
        {enCours.map((livre) => (
          <li key={livre.id} className="flex items-start gap-3">
            {livre.urlCouverture ? (
              <Image
                src={livre.urlCouverture}
                alt=""
                width={48}
                height={72}
                sizes="48px"
                className="h-18 w-12 shrink-0 rounded-petit border border-trait object-cover"
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
          </li>
        ))}
      </ul>
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
