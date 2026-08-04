import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { creerSeance } from '@/lib/actions/vie'
import { seances as toutesSeances, volumeHebdomadaire } from '@/lib/donnees/vie'
import { jourMoyen } from '@/lib/date'

export const metadata = { title: 'Sport' }

export default async function PageSport() {
  const [seances, volume] = await Promise.all([toutesSeances(), volumeHebdomadaire()])

  return (
    <>
      <EnTeteSection titre="Sport" />

      <Widget libelle="Cette semaine">
        <div className="flex gap-8">
          <span>
            <span className="libelle block">Séances</span>
            <span className="chiffres text-40 leading-none">{volume.seances}</span>
          </span>
          <span>
            <span className="libelle block">Minutes</span>
            <span className="chiffres text-40 leading-none">{volume.minutes}</span>
          </span>
        </div>
      </Widget>

      <Widget libelle="Ajouter une séance">
        <form action={creerSeance}>
          <div className="flex gap-2">
            <input
              name="type"
              required
              maxLength={60}
              aria-label="Type"
              placeholder="Muscu, course, vélo…"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="jour"
              type="date"
              aria-label="Date"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
          </div>
          <input
            name="groupes"
            maxLength={160}
            aria-label="Groupes musculaires"
            placeholder="Groupes musculaires, séparés par des virgules"
            className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="minutes"
              inputMode="numeric"
              aria-label="Durée en minutes"
              placeholder="Minutes"
              className="chiffres h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <select
              name="ressenti"
              defaultValue=""
              aria-label="Ressenti"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            >
              <option value="">Ressenti</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter
          </button>
        </form>
      </Widget>

      <Widget libelle="Historique">
        {seances.length === 0 ? (
          <Invitation>Aucune séance enregistrée.</Invitation>
        ) : (
          <ul>
            {seances.map((seance) => (
              <li
                key={seance.id}
                className="flex items-baseline justify-between gap-4 border-b border-trait py-2 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-13 first-letter:uppercase">
                    {seance.type}
                  </span>
                  {seance.groupes.length > 0 ? (
                    <span className="block truncate text-11 text-secondaire">
                      {seance.groupes.join(', ')}
                    </span>
                  ) : null}
                </span>
                <span className="chiffres shrink-0 text-11 text-secondaire">
                  {jourMoyen(seance.jour)}
                  {seance.minutes ? ` · ${seance.minutes} min` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
