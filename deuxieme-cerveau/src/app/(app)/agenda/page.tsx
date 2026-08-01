import Link from 'next/link'
import type { Route } from 'next'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { agendaEntre, type JourDAgenda } from '@/lib/donnees/agenda'
import { creerEvenement, supprimerEvenement } from '@/lib/actions/agenda'
import {
  aujourdhui,
  debutDeSemaine,
  debutDuMois,
  decaler,
  heure,
  jourCourt,
  jourLong,
  moisLong,
  moisPrecedent,
  moisSuivant,
  joursDuMois,
  jourSemaineISO,
} from '@/lib/date'

export const metadata = { title: 'Agenda' }

export default async function PageAgenda({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; jour?: string }>
}) {
  const { vue: vueDemandee, jour: jourDemande } = await searchParams
  const vue = vueDemandee === 'mois' ? 'mois' : 'semaine'
  const ancre = jourDemande && /^\d{4}-\d{2}-\d{2}$/.test(jourDemande) ? jourDemande : aujourdhui()

  return (
    <>
      <EnTeteSection titre="Agenda" />

      <nav className="flex border-b border-trait" aria-label="Vue">
        {(
          [
            { cle: 'semaine', libelle: 'Semaine' },
            { cle: 'mois', libelle: 'Mois' },
          ] as const
        ).map((v) => {
          const actif = v.cle === vue
          return (
            <Link
              key={v.cle}
              href={`/agenda?vue=${v.cle}&jour=${ancre}` as Route}
              aria-current={actif ? 'page' : undefined}
              className={[
                'cible flex flex-1 items-center justify-center border-t-2 text-13',
                actif
                  ? 'border-t-texte font-medium'
                  : 'border-t-transparent text-secondaire',
              ].join(' ')}
            >
              {v.libelle}
            </Link>
          )
        })}
      </nav>

      {vue === 'semaine' ? <VueSemaine ancre={ancre} /> : <VueMois ancre={ancre} />}
      <FormulaireEvenement ancre={ancre} />
    </>
  )
}

/** Navigation entre périodes : deux flèches et un retour à aujourd'hui. */
function Barre({
  titre,
  precedent,
  suivant,
  vue,
}: {
  titre: string
  precedent: string
  suivant: string
  vue: 'semaine' | 'mois'
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-trait px-2 py-2">
      <Link
        href={`/agenda?vue=${vue}&jour=${precedent}` as Route}
        aria-label="Période précédente"
        className="cible flex w-11 items-center justify-center text-18 text-secondaire"
      >
        ‹
      </Link>
      <span className="flex-1 text-center text-13 first-letter:uppercase">{titre}</span>
      <Link
        href={`/agenda?vue=${vue}&jour=${aujourdhui()}` as Route}
        className="cible flex items-center px-2 text-11 text-secondaire"
      >
        Auj.
      </Link>
      <Link
        href={`/agenda?vue=${vue}&jour=${suivant}` as Route}
        aria-label="Période suivante"
        className="cible flex w-11 items-center justify-center text-18 text-secondaire"
      >
        ›
      </Link>
    </div>
  )
}

async function VueSemaine({ ancre }: { ancre: string }) {
  const lundi = debutDeSemaine(ancre)
  const dimanche = decaler(lundi, 6)
  const jours = await agendaEntre(lundi, dimanche)

  return (
    <>
      <Barre
        titre={`${jourCourt(lundi)} — ${jourCourt(dimanche)}`}
        precedent={decaler(lundi, -7)}
        suivant={decaler(lundi, 7)}
        vue="semaine"
      />
      {jours.map((jour) => (
        <JourneeDetaillee key={jour.jour} journee={jour} />
      ))}
    </>
  )
}

/**
 * Une journée de la semaine : ses événements, puis ses tâches datées.
 *
 * Les tâches sont en lecture seule ici, et volontairement en second : l'agenda
 * répond à « qu'est-ce qui m'attend », l'écran Tâches à « qu'est-ce que je
 * fais ». Mélanger les gestes ferait de l'agenda une seconde liste de tâches,
 * moins bonne que la première.
 */
function JourneeDetaillee({ journee }: { journee: JourDAgenda }) {
  const vide = journee.evenements.length === 0 && journee.taches.length === 0
  const cestAujourdhui = journee.jour === aujourdhui()

  return (
    <section
      className={[
        'border-b border-trait px-5 py-3',
        cestAujourdhui ? 'border-l-2 border-l-texte' : '',
      ].join(' ')}
    >
      <h2
        className={[
          'text-11 uppercase tracking-[0.08em]',
          cestAujourdhui ? 'text-texte' : 'text-secondaire',
        ].join(' ')}
      >
        {jourLong(journee.jour)}
      </h2>

      {vide ? (
        <p className="mt-1 text-13 text-secondaire">—</p>
      ) : (
        <ul className="mt-2">
          {journee.evenements.map((evenement) => (
            <li
              key={evenement.id}
              className="flex items-baseline gap-3 border-b border-trait py-1.5 last:border-b-0"
            >
              <span className="chiffres w-12 shrink-0 text-11 text-secondaire">
                {evenement.journeeEntiere ? 'jour' : heure(evenement.debut)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13">{evenement.titre}</span>
                {evenement.lieu || evenement.categorie ? (
                  <span className="block text-11 text-secondaire">
                    {[evenement.lieu, evenement.categorie].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </span>
              <form action={supprimerEvenement.bind(null, evenement.id)}>
                <button
                  type="submit"
                  aria-label={`Supprimer : ${evenement.titre}`}
                  className="shrink-0 px-1 text-13 text-secondaire"
                >
                  ×
                </button>
              </form>
            </li>
          ))}

          {journee.taches.map((tache) => (
            <li
              key={tache.id}
              className="flex items-baseline gap-3 border-b border-trait py-1.5 last:border-b-0"
            >
              <span className="w-12 shrink-0 text-11 text-secondaire">tâche</span>
              <Link
                href={`/taches/${tache.id}`}
                className={[
                  'min-w-0 flex-1 truncate text-13',
                  tache.faite ? 'text-secondaire line-through' : '',
                ].join(' ')}
              >
                {tache.titre}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Le mois en grille de sept colonnes, comme le mur des habitudes.
 *
 * Une case porte le numéro du jour et un compte, pas la liste : à cette
 * densité, une liste devient illisible et on ne saurait plus repérer les
 * journées chargées, qui sont la seule chose qu'on cherche dans une vue mois.
 */
async function VueMois({ ancre }: { ancre: string }) {
  const premier = debutDuMois(ancre)
  const jours = joursDuMois(premier)
  const dernier = jours[jours.length - 1] ?? premier
  const agenda = await agendaEntre(premier, dernier)

  const parJour = new Map(agenda.map((j) => [j.jour, j]))
  // Colonnes vides avant le 1er, pour aligner la grille sur les jours de la
  // semaine — même construction que le mur du mois des habitudes.
  const decalage = jourSemaineISO(premier) - 1

  return (
    <>
      <Barre
        titre={moisLong(premier)}
        precedent={moisPrecedent(premier)}
        suivant={moisSuivant(premier)}
        vue="mois"
      />

      <div className="px-5 py-4">
        <div className="grid grid-cols-7 gap-px">
          {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((nom) => (
            <div key={nom} className="pb-1 text-center text-11 text-secondaire">
              {nom}
            </div>
          ))}

          {Array.from({ length: decalage }, (_, i) => (
            <div key={`vide-${i}`} />
          ))}

          {jours.map((jour) => {
            const journee = parJour.get(jour)
            const compte =
              (journee?.evenements.length ?? 0) + (journee?.taches.length ?? 0)
            const cestAujourdhui = jour === aujourdhui()

            return (
              <Link
                key={jour}
                href={`/agenda?vue=semaine&jour=${jour}` as Route}
                className={[
                  'flex aspect-square flex-col items-center justify-center border border-trait text-13',
                  cestAujourdhui ? 'bg-texte text-fond' : '',
                ].join(' ')}
              >
                <span className="chiffres">{Number(jour.slice(8, 10))}</span>
                {compte > 0 ? (
                  <span
                    className={[
                      'chiffres text-11',
                      cestAujourdhui ? 'text-fond/80' : 'text-secondaire',
                    ].join(' ')}
                  >
                    {compte}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

function FormulaireEvenement({ ancre }: { ancre: string }) {
  return (
    <Widget libelle="Nouvel événement">
      <form action={creerEvenement}>
        <Champ libelle="Titre">
          <Saisie name="titre" required autoComplete="off" placeholder="Rendez-vous" />
        </Champ>

        <div className="flex gap-4">
          <div className="flex-1">
            <Champ libelle="Début">
              <Saisie
                type="datetime-local"
                name="debut"
                required
                defaultValue={`${ancre}T09:00`}
              />
            </Champ>
          </div>
          <div className="flex-1">
            <Champ libelle="Fin">
              <Saisie type="datetime-local" name="fin" defaultValue={`${ancre}T10:00`} />
            </Champ>
          </div>
        </div>

        <label className="cible flex items-center gap-3 border-b border-trait">
          <input type="checkbox" name="journee" className="size-5 accent-current" />
          <span className="text-13">Toute la journée</span>
        </label>

        <div className="flex gap-4">
          <div className="flex-1">
            <Champ libelle="Catégorie">
              <Menu name="categorie" defaultValue="">
                <option value="">Aucune</option>
                <option value="pro">Pro</option>
                <option value="perso">Perso</option>
                <option value="sport">Sport</option>
              </Menu>
            </Champ>
          </div>
          <div className="flex-1">
            <Champ libelle="Lieu">
              <Saisie name="lieu" autoComplete="off" />
            </Champ>
          </div>
        </div>

        <div className="mt-4">
          <BoutonPrincipal type="submit">Ajouter</BoutonPrincipal>
        </div>
      </form>
    </Widget>
  )
}
