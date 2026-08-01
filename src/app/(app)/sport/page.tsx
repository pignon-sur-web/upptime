import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Saisie, Zone } from '@/components/ui/Champ'
import { Jauge } from '@/components/ui/Jauge'
import { seances, volumeHebdomadaire } from '@/lib/donnees/vie'
import { enregistrerSeance, supprimerSeance } from '@/lib/actions/vie'
import { aujourdhui, jourCourt, jourRelatif } from '@/lib/date'

export const metadata = { title: 'Sport' }

export default async function PageSport() {
  const [liste, volume] = await Promise.all([seances(90), volumeHebdomadaire()])

  const maxSeances = Math.max(...volume.map((v) => v.seances), 1)

  return (
    <>
      <EnTeteSection titre="Sport" />

      {volume.length > 0 ? (
        <Widget
          libelle="Volume hebdomadaire"
          action={
            <span className="chiffres text-13">
              {volume[volume.length - 1]?.seances ?? 0} cette semaine
            </span>
          }
        >
          {/* Le nombre de séances et les minutes, rien de plus : c'est la
              régularité qu'on surveille, pas la performance. */}
          <ul>
            {volume.map((semaine) => (
              <li
                key={semaine.semaine}
                className="flex items-center gap-3 border-b border-trait py-1.5 last:border-b-0"
              >
                <span className="chiffres w-12 shrink-0 text-11 text-secondaire">
                  {jourCourt(semaine.semaine)}
                </span>
                <span className="flex-1">
                  <Jauge valeur={semaine.seances / maxSeances} />
                </span>
                <span className="chiffres w-20 shrink-0 text-right text-11 text-secondaire">
                  {semaine.seances} · {semaine.minutes} min
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      ) : null}

      <Widget libelle="Nouvelle séance">
        <form action={enregistrerSeance}>
          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Type">
                <Saisie
                  name="type"
                  required
                  autoComplete="off"
                  placeholder="Musculation"
                />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Date">
                <Saisie type="date" name="date" defaultValue={aujourdhui()} />
              </Champ>
            </div>
          </div>

          <Champ
            libelle="Groupes musculaires"
            aide="Séparés par des virgules — pectoraux, dos, jambes."
          >
            <Saisie name="groupes" autoComplete="off" placeholder="dos, biceps" />
          </Champ>

          <div className="flex gap-4">
            <div className="flex-1">
              <Champ libelle="Durée (min)">
                <Saisie name="duree" inputMode="numeric" placeholder="60" />
              </Champ>
            </div>
            <div className="flex-1">
              <Champ libelle="Ressenti">
                <Menu name="ressenti" defaultValue="">
                  <option value="">Non renseigné</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}/5
                    </option>
                  ))}
                </Menu>
              </Champ>
            </div>
          </div>

          <Champ libelle="Notes">
            <Zone name="notes" rows={2} />
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Enregistrer la séance</BoutonPrincipal>
          </div>
        </form>
      </Widget>

      <Widget
        libelle="Trois derniers mois"
        action={<span className="chiffres text-13">{liste.length}</span>}
      >
        {liste.length === 0 ? (
          <Invitation>Aucune séance enregistrée.</Invitation>
        ) : (
          <ul>
            {liste.map((seance) => (
              <li
                key={seance.id}
                className="flex items-baseline gap-3 border-b border-trait py-2 last:border-b-0"
              >
                <span className="chiffres w-12 shrink-0 text-11 text-secondaire">
                  {jourCourt(seance.jour)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-13">{seance.type}</span>
                  <span className="block text-11 text-secondaire">
                    {[
                      jourRelatif(seance.jour),
                      seance.duree ? `${seance.duree} min` : null,
                      seance.ressenti ? `ressenti ${seance.ressenti}/5` : null,
                      seance.groupes.length > 0 ? seance.groupes.join(', ') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <form action={supprimerSeance.bind(null, seance.id)}>
                  <button
                    type="submit"
                    aria-label={`Supprimer la séance du ${seance.jour}`}
                    className="shrink-0 px-1 text-13 text-secondaire"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
