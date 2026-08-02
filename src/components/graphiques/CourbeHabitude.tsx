import { jourCourt } from '@/lib/date'
import type { SuiviHabitude } from '@/lib/donnees/habitudes'

/**
 * Une habitude, jour par jour, sur la fenêtre demandée.
 *
 * Le score global dit si la journée a été bonne ; il ne dit pas laquelle des
 * habitudes décroche. C'est pourtant la seule information sur laquelle on peut
 * agir : on ne redresse pas « 62 % », on redresse « Écrire ».
 *
 * Le dessin superpose deux lectures :
 *
 * — les **barres du bas**, un jour chacune : verte si faite, rouge si ratée,
 *   rien du tout si l'habitude n'était pas programmée ce jour-là. Un samedi
 *   sans obligation ne doit pas ressembler à un trou dans la série.
 * — la **courbe**, qui est un taux glissant sur sept jours. C'est elle qui
 *   montre la tendance : une semaine ratée se voit comme une pente, pas comme
 *   trois barres isolées qu'on ne relie pas à l'œil.
 *
 * Le jour courant n'est jamais rouge : il n'est pas encore raté.
 */

const HAUTEUR = 44
const FENETRE_GLISSANTE = 7

export function CourbeHabitude({ suivi }: { suivi: SuiviHabitude }) {
  const { jours } = suivi
  if (jours.length === 0) return null

  const dernier = jours[jours.length - 1]?.jour
  const largeur = jours.length * 4

  /*
   * Taux glissant : pour chaque jour, la part de réussite sur les sept
   * derniers jours PROGRAMMÉS. Compter en jours calendaires fausserait la
   * courbe d'une habitude en semaine, dont deux points sur sept ne comptent
   * pas.
   */
  const points: { x: number; y: number }[] = []
  const evalues: boolean[] = []

  jours.forEach((jour, index) => {
    if (jour.programme && jour.jour !== dernier) evalues.push(jour.fait)
    if (evalues.length === 0) return
    const fenetre = evalues.slice(-FENETRE_GLISSANTE)
    const taux = fenetre.filter(Boolean).length / fenetre.length
    points.push({
      x: (index / Math.max(1, jours.length - 1)) * largeur,
      y: HAUTEUR - 8 - taux * (HAUTEUR - 16),
    })
  })

  const trace = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largeur} ${HAUTEUR}`}
        preserveAspectRatio="none"
        className="h-11 w-full"
        role="img"
        aria-label={
          suivi.taux === null
            ? `${suivi.habitude.nom} : aucune journée évaluée`
            : `${suivi.habitude.nom} : ${suivi.faits} sur ${suivi.programmes} jours programmés`
        }
      >
        {/* Les barres du jour, tout en bas. */}
        {jours.map((jour, index) => {
          if (!jour.programme) return null
          const x = (index / Math.max(1, jours.length - 1)) * largeur
          const aujourdhui = jour.jour === dernier
          return (
            <rect
              key={jour.jour}
              x={x}
              y={HAUTEUR - 5}
              width={Math.max(1.6, largeur / jours.length - 1.2)}
              height={5}
              fill={
                jour.fait
                  ? 'var(--reussite)'
                  : aujourdhui
                    ? 'var(--trait)'
                    : 'var(--echec)'
              }
            />
          )
        })}

        {points.length > 1 ? (
          <path
            d={trace}
            fill="none"
            stroke="var(--texte)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      <figcaption className="mt-1 flex justify-between text-11 text-secondaire">
        <span className="chiffres">{jourCourt(jours[0]?.jour ?? '')}</span>
        <span className="chiffres">{jourCourt(dernier ?? '')}</span>
      </figcaption>
    </figure>
  )
}

/** Le bloc complet : nom, série, taux, et la courbe. */
export function BlocHabitude({ suivi }: { suivi: SuiviHabitude }) {
  const pourcentage = suivi.taux === null ? null : Math.round(suivi.taux * 100)

  return (
    <li className="border-b border-trait py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          {suivi.habitude.emoji ? (
            <span aria-hidden>{suivi.habitude.emoji}</span>
          ) : null}
          <span className="truncate text-15">{suivi.habitude.nom}</span>
        </span>
        <span className="chiffres shrink-0 text-13">
          {pourcentage === null ? (
            <span className="text-secondaire">—</span>
          ) : (
            <span
              className={
                pourcentage >= 80
                  ? 'text-reussite'
                  : pourcentage < 40
                    ? 'text-echec'
                    : undefined
              }
            >
              {pourcentage} %
            </span>
          )}
        </span>
      </div>

      <p className="mt-0.5 flex gap-3 text-11 text-secondaire">
        {suivi.serie > 0 ? (
          <span className="chiffres">série {suivi.serie} j</span>
        ) : suivi.programmes === 0 ? (
          // Le premier jour, rien n'a été interrompu : il n'y a rien eu.
          <span>tout commence aujourd&apos;hui</span>
        ) : (
          <span>série interrompue</span>
        )}
        {suivi.programmes > 0 ? (
          <span className="chiffres">
            {suivi.faits}/{suivi.programmes} jours
          </span>
        ) : null}
      </p>

      {/* Rien à tracer tant qu'aucune journée n'est close : une habitude
          créée aujourd'hui n'a pas d'historique, et un graphique vide
          ressemble à une panne plutôt qu'à un début. */}
      <div className="mt-2">
        {suivi.programmes === 0 ? (
          <p className="text-11 text-secondaire">
            La courbe apparaîtra dès la première journée terminée.
          </p>
        ) : (
          <CourbeHabitude suivi={suivi} />
        )}
      </div>
    </li>
  )
}
