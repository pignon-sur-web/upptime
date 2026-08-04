import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { creerEvenement } from '@/lib/actions/vie'
import { evenementsEntre } from '@/lib/donnees/vie'
import { septProchainsJours, tachesDuJour } from '@/lib/donnees/taches'
import {
  aujourdhui,
  debutDeSemaine,
  decaler,
  jourLong,
  plage,
} from '@/lib/date'

export const metadata = { title: 'Agenda' }

const heure = new Intl.DateTimeFormat('fr-BE', {
  timeZone: 'Europe/Brussels',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function PageAgenda({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>
}) {
  const { vue } = await searchParams
  const mois = vue === 'mois'

  const debut = mois ? aujourdhui().slice(0, 8) + '01' : debutDeSemaine(aujourdhui())
  const fin = mois ? decaler(debut, 31) : decaler(debut, 6)

  const [evenements, groupesTaches, duJour] = await Promise.all([
    evenementsEntre(debut, fin),
    septProchainsJours(),
    tachesDuJour(),
  ])

  // Les tâches datées apparaissent en LECTURE SEULE : l'agenda montre le
  // temps, il ne le gère pas. Cocher se fait dans Tâches.
  const tachesParJour = new Map<string, string[]>()
  for (const groupe of groupesTaches) {
    tachesParJour.set(groupe.jour, groupe.taches.map((t) => t.titre))
  }
  if (duJour.dues.length > 0) {
    tachesParJour.set(aujourdhui(), duJour.dues.map((t) => t.titre))
  }

  const jours = plage(debut, fin)

  return (
    <>
      <EnTeteSection titre="Agenda" />

      <nav className="flex border-b border-trait" aria-label="Vue">
        {[
          { cle: 'semaine', nom: 'Semaine' },
          { cle: 'mois', nom: 'Mois' },
        ].map((v) => (
          <a
            key={v.cle}
            href={v.cle === 'semaine' ? '/agenda' : '/agenda?vue=mois'}
            aria-current={(v.cle === 'mois') === mois ? 'page' : undefined}
            className={[
              'cible flex flex-1 items-center justify-center border-t-2 text-13',
              (v.cle === 'mois') === mois
                ? 'border-t-texte font-medium'
                : 'border-t-transparent text-secondaire',
            ].join(' ')}
          >
            {v.nom}
          </a>
        ))}
      </nav>

      {jours
        .map((jour) => ({
          jour,
          evenements: evenements.filter((e) => e.debut.slice(0, 10) === jour),
          taches: tachesParJour.get(jour) ?? [],
        }))
        .filter((j) => j.evenements.length > 0 || j.taches.length > 0)
        .map((groupe) => (
          <Widget key={groupe.jour} libelle={jourLong(groupe.jour)}>
            <ul>
              {groupe.evenements.map((evenement) => (
                <li
                  key={evenement.id}
                  className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-13">{evenement.titre}</span>
                    {evenement.lieu ? (
                      <span className="block truncate text-11 text-secondaire">
                        {evenement.lieu}
                      </span>
                    ) : null}
                  </span>
                  <span className="chiffres shrink-0 text-11 text-secondaire">
                    {evenement.journeeEntiere
                      ? 'journée'
                      : heure.format(new Date(evenement.debut))}
                  </span>
                </li>
              ))}

              {groupe.taches.map((titre) => (
                <li
                  key={titre}
                  className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
                >
                  <span className="truncate text-13 text-secondaire">□ {titre}</span>
                  <span className="shrink-0 text-11 text-secondaire">tâche</span>
                </li>
              ))}
            </ul>
          </Widget>
        ))}

      {evenements.length === 0 && tachesParJour.size === 0 ? (
        <Widget libelle={mois ? 'Ce mois' : 'Cette semaine'}>
          <Invitation>Rien de prévu.</Invitation>
        </Widget>
      ) : null}

      <Widget libelle="Ajouter un événement">
        <form action={creerEvenement}>
          <input
            name="titre"
            required
            maxLength={160}
            aria-label="Titre"
            placeholder="Rendez-vous, réunion, séance…"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="debut"
              type="datetime-local"
              required
              aria-label="Début"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="fin"
              type="datetime-local"
              aria-label="Fin"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <select
              name="categorie"
              defaultValue=""
              aria-label="Catégorie"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            >
              <option value="">Sans catégorie</option>
              <option value="pro">Pro</option>
              <option value="perso">Perso</option>
              <option value="sport">Sport</option>
            </select>
            <input
              name="lieu"
              maxLength={120}
              aria-label="Lieu"
              placeholder="Lieu"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
          </div>
          <label className="cible mt-2 flex items-center justify-between gap-4 border border-trait px-3">
            <span className="text-13">Journée entière</span>
            <input type="checkbox" name="journeeEntiere" className="size-5" />
          </label>
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter
          </button>
        </form>
      </Widget>
    </>
  )
}
