import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { ListeHabitudes } from '@/components/habitudes/ListeHabitudes'
import { MurDuMois } from '@/components/graphiques/MurDuMois'
import { Courbe } from '@/components/graphiques/Courbe'
import {
  habitudesDuJour,
  scoresDepuis,
  suiviParHabitude,
} from '@/lib/donnees/habitudes'
import { BlocHabitude } from '@/components/graphiques/CourbeHabitude'
import { JOURS_RATTRAPAGE } from '@/lib/regles'
import {
  aujourdhui,
  decaler,
  jourCourt,
  jourRelatif,
  jourSemaineCourt,
  moisLong,
} from '@/lib/date'

export const metadata = { title: 'Habitudes' }

const FENETRES = [30, 90, 365] as const

export default async function PageHabitudes({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string; fenetre?: string }>
}) {
  const { jour: jourDemande, fenetre: fenetreDemandee } = await searchParams

  // Le rattrapage est borné aux sept derniers jours : on oublie parfois de
  // cocher, mais réécrire un mois d'historique n'aurait plus de sens.
  const jours = Array.from({ length: JOURS_RATTRAPAGE }, (_, i) =>
    decaler(aujourdhui(), -(JOURS_RATTRAPAGE - 1 - i)),
  )
  const jour = jourDemande && jours.includes(jourDemande) ? jourDemande : aujourdhui()

  const fenetre = FENETRES.find((f) => String(f) === fenetreDemandee) ?? FENETRES[0]

  // `suiviParHabitude` porte déjà les séries : les redemander ici ferait une
  // requête pour rien.
  const [habitudes, scoresFenetre, scoresMois, suivis] = await Promise.all([
    habitudesDuJour(jour),
    scoresDepuis(fenetre),
    // Assez de jours pour couvrir le mois courant depuis le 1er.
    scoresDepuis(Number(aujourdhui().slice(8, 10))),
    suiviParHabitude(fenetre),
  ])

  const cochees = habitudes.filter((h) => h.cochee).length

  return (
    <>
      <EnTeteSection
        titre="Habitudes"
        action={
          <Link href="/habitudes/reglages" className="libelle">
            Réglages
          </Link>
        }
      />

      {/* Sélecteur de jour : sept cibles, la journée en cours à droite donc
          sous le pouce. L'état est porté par le lien, ce qui garde l'écran
          utilisable même sans JavaScript. */}
      <nav className="flex border-b border-trait" aria-label="Choisir le jour">
        {jours.map((j) => {
          const actif = j === jour
          return (
            <Link
              key={j}
              href={j === aujourdhui() ? '/habitudes' : `/habitudes?jour=${j}`}
              aria-current={actif ? 'date' : undefined}
              className={[
                'cible flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 py-2',
                actif ? 'border-t-texte' : 'border-t-transparent',
              ].join(' ')}
            >
              <span className={actif ? 'text-11' : 'text-11 text-secondaire'}>
                {jourSemaineCourt(j).replace('.', '')}
              </span>
              <span
                className={[
                  'chiffres text-13',
                  actif ? 'font-medium' : 'text-secondaire',
                ].join(' ')}
              >
                {jourCourt(j)}
              </span>
            </Link>
          )
        })}
      </nav>

      <Widget
        libelle={jour === aujourdhui() ? "Aujourd'hui" : jourRelatif(jour)}
        action={
          habitudes.length > 0 ? (
            <span className="chiffres text-13">
              {cochees}/{habitudes.length}
            </span>
          ) : null
        }
      >
        {habitudes.length === 0 ? (
          <Invitation>
            Aucune habitude programmée ce jour-là.{' '}
            <Link href="/habitudes/reglages" className="underline">
              En ajouter une
            </Link>
            .
          </Invitation>
        ) : (
          <ListeHabitudes habitudes={habitudes} jour={jour} />
        )}
      </Widget>

      {/* Une courbe par habitude : le score global dit si la journée a été
          bonne, il ne dit pas laquelle décroche. C'est pourtant la seule
          information sur laquelle on peut agir. */}
      {suivis.length > 0 ? (
        <Widget
          libelle={`Chaque habitude — ${fenetre} jours`}
          action={
            suivis.some((s) => s.programmes > 0) ? (
              <span className="chiffres text-11 text-secondaire">
                {suivis.filter((s) => s.serie > 0).length}/{suivis.length} en série
              </span>
            ) : null
          }
        >
          <ul>
            {suivis.map((suivi) => (
              <BlocHabitude key={suivi.habitude.id} suivi={suivi} />
            ))}
          </ul>
        </Widget>
      ) : null}

      <Widget libelle={`Le mur — ${moisLong(aujourdhui())}`}>
        <MurDuMois scores={scoresMois} />
      </Widget>

      <Widget
        libelle="Évolution"
        action={
          <span className="flex gap-3">
            {FENETRES.map((f) => (
              <Link
                key={f}
                href={f === 30 ? '/habitudes' : `/habitudes?fenetre=${f}`}
                className={[
                  'chiffres text-11',
                  f === fenetre ? 'text-texte underline' : 'text-secondaire',
                ].join(' ')}
              >
                {f}
              </Link>
            ))}
          </span>
        }
      >
        {scoresFenetre.filter((s) => s.score !== null).length < 2 ? (
          <Invitation>
            Deux journées renseignées suffiront à tracer la courbe.
          </Invitation>
        ) : (
          <Courbe scores={scoresFenetre} />
        )}
      </Widget>
    </>
  )
}
