import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { FormulaireJournal } from '@/components/vie/FormulaireJournal'
import {
  bilanHebdomadaire,
  bilanMensuel,
  contexteDuJour,
  entreeDuJour,
} from '@/lib/donnees/journal'
import { aujourdhui, jourLong } from '@/lib/date'

export const metadata = { title: 'Journal' }

export default async function PageJournal() {
  const jour = aujourdhui()
  const [entree, contexte, semaine, mois] = await Promise.all([
    entreeDuJour(jour),
    contexteDuJour(jour),
    bilanHebdomadaire(),
    bilanMensuel(),
  ])

  return (
    <>
      <EnTeteSection titre="Journal" />

      <Widget libelle={jourLong(jour)}>
        {/* Le score et les tâches terminées sont RAPPORTÉS, pas recopiés dans
            les champs : ce sont des faits déjà enregistrés ailleurs, les
            dupliquer dans le texte les figerait et les ferait diverger. */}
        <div className="mb-4 flex gap-6 border-b border-trait pb-4">
          <span>
            <span className="libelle block">Habitudes</span>
            <span className="chiffres text-18">
              {contexte.attendues === 0
                ? '—'
                : `${contexte.cochees}/${contexte.attendues}`}
            </span>
          </span>
          <span>
            <span className="libelle block">Tâches faites</span>
            <span className="chiffres text-18">{contexte.taches.length}</span>
          </span>
        </div>

        {contexte.taches.length > 0 ? (
          <ul className="mb-4">
            {contexte.taches.map((titre) => (
              <li key={titre} className="text-13 text-secondaire">
                — {titre}
              </li>
            ))}
          </ul>
        ) : null}

        <FormulaireJournal jour={jour} entree={entree} />
      </Widget>

      <Widget
        libelle="Cette semaine"
        action={
          <span className="chiffres text-13">
            {semaine.joursRenseignes} j
          </span>
        }
      >
        <div className="flex gap-6">
          <span>
            <span className="libelle block">Humeur</span>
            <span className="chiffres text-18">
              {semaine.humeurMoyenne === null
                ? '—'
                : semaine.humeurMoyenne.toFixed(1)}
            </span>
          </span>
          <span>
            <span className="libelle block">Habitudes</span>
            <span className="chiffres text-18">
              {semaine.scoreMoyen === null
                ? '—'
                : `${Math.round(semaine.scoreMoyen * 100)} %`}
            </span>
          </span>
        </div>
      </Widget>

      <Widget
        libelle="Ce mois"
        action={<span className="chiffres text-13">{mois.joursRenseignes} j</span>}
      >
        <div className="flex gap-6">
          <span>
            <span className="libelle block">Humeur</span>
            <span className="chiffres text-18">
              {mois.humeurMoyenne === null ? '—' : mois.humeurMoyenne.toFixed(1)}
            </span>
          </span>
          <span>
            <span className="libelle block">Habitudes</span>
            <span className="chiffres text-18">
              {mois.scoreMoyen === null ? '—' : `${Math.round(mois.scoreMoyen * 100)} %`}
            </span>
          </span>
        </div>

        {mois.entrees.length > 0 ? (
          <ul className="mt-4">
            {mois.entrees.slice(0, 10).map((e) => (
              <li key={e.jour} className="border-b border-trait py-2 last:border-b-0">
                <span className="chiffres block text-11 text-secondaire">{e.jour}</span>
                <span className="block text-13">{e.fait || e.note || '—'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Widget>
    </>
  )
}
