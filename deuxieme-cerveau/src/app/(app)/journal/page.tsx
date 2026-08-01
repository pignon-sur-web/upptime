import Link from 'next/link'
import type { Route } from 'next'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Menu, Zone } from '@/components/ui/Champ'
import {
  bilanHebdo,
  bilanMensuel,
  entreeDuJour,
  entreesRecentes,
  suggestionDuJour,
  type Bilan,
} from '@/lib/donnees/journal'
import { enregistrerEntree } from '@/lib/actions/journal'
import {
  aujourdhui,
  decaler,
  ecartJours,
  jourCourt,
  jourLong,
  jourRelatif,
} from '@/lib/date'

export const metadata = { title: 'Journal' }

const HUMEURS = [
  { valeur: '', libelle: 'Non renseignée' },
  { valeur: '1', libelle: '1 — mauvaise' },
  { valeur: '2', libelle: '2' },
  { valeur: '3', libelle: '3 — correcte' },
  { valeur: '4', libelle: '4' },
  { valeur: '5', libelle: '5 — excellente' },
]

export default async function PageJournal({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>
}) {
  const { jour: jourDemande } = await searchParams

  // On complète les jours passés, jamais les jours à venir : un journal
  // antidaté reste un journal, un journal postdaté est de la fiction.
  const valide =
    jourDemande &&
    /^\d{4}-\d{2}-\d{2}$/.test(jourDemande) &&
    ecartJours(jourDemande, aujourdhui()) >= 0
  const jour = valide ? jourDemande : aujourdhui()

  const [entree, suggestion, recentes, hebdo, mensuel] = await Promise.all([
    entreeDuJour(jour),
    suggestionDuJour(jour),
    entreesRecentes(30),
    bilanHebdo(),
    bilanMensuel(),
  ])

  const enregistrer = enregistrerEntree.bind(null, jour)
  const dejaEcrit = entree.id !== null

  return (
    <>
      <EnTeteSection titre="Journal" />

      <div className="flex items-center justify-between gap-2 border-b border-trait px-2 py-2">
        <Link
          href={`/journal?jour=${decaler(jour, -1)}` as Route}
          aria-label="Jour précédent"
          className="cible flex w-11 items-center justify-center text-18 text-secondaire"
        >
          ‹
        </Link>
        <span className="flex-1 text-center text-13 first-letter:uppercase">
          {jourLong(jour)}
        </span>
        {jour === aujourdhui() ? (
          <span className="w-11" />
        ) : (
          <Link
            href={`/journal?jour=${decaler(jour, 1)}` as Route}
            aria-label="Jour suivant"
            className="cible flex w-11 items-center justify-center text-18 text-secondaire"
          >
            ›
          </Link>
        )}
      </div>

      <Widget
        libelle={dejaEcrit ? "L'entrée du jour" : 'Écrire'}
        action={
          <span className="chiffres text-13 text-secondaire">{jourCourt(jour)}</span>
        }
      >
        <form action={enregistrer}>
          {/*
            Le champ est prérempli par ce que l'application sait déjà : le score
            d'habitudes et les tâches terminées. Devant une page blanche on
            n'écrit pas ; devant une page qui commence par « 4/5 aux habitudes,
            trois tâches faites », on complète. La suggestion n'est jamais
            enregistrée toute seule : elle est le contenu initial du champ, et
            ce qui part en base est ce qu'on a validé.
          */}
          <Champ libelle="Ce que j'ai fait">
            <Zone
              name="fait"
              rows={5}
              defaultValue={entree.fait || suggestion}
              placeholder="Ce qui a avancé aujourd'hui"
            />
          </Champ>

          <Champ libelle="Ce que je reporte">
            <Zone
              name="reporte"
              rows={2}
              defaultValue={entree.reporte}
              placeholder="Ce qui attendra demain"
            />
          </Champ>

          <Champ libelle="Note libre">
            <Zone name="libre" rows={4} defaultValue={entree.libre} />
          </Champ>

          <Champ libelle="Humeur">
            <Menu name="humeur" defaultValue={entree.humeur ? String(entree.humeur) : ''}>
              {HUMEURS.map((h) => (
                <option key={h.valeur} value={h.valeur}>
                  {h.libelle}
                </option>
              ))}
            </Menu>
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">
              {dejaEcrit ? "Mettre à jour l'entrée" : "Enregistrer l'entrée"}
            </BoutonPrincipal>
          </div>
        </form>
      </Widget>

      <BilanWidget libelle="Cette semaine" bilan={hebdo} joursAttendus={7} />
      <BilanWidget libelle="Ce mois-ci" bilan={mensuel} joursAttendus={null} />

      <Widget
        libelle="Trente derniers jours"
        action={<span className="chiffres text-13">{recentes.length}</span>}
      >
        {recentes.length === 0 ? (
          <Invitation>Aucune entrée pour l&apos;instant.</Invitation>
        ) : (
          <ul>
            {recentes.map((e) => (
              <li key={e.jour} className="border-b border-trait last:border-b-0">
                <Link href={`/journal?jour=${e.jour}` as Route} className="block py-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="chiffres text-11 text-secondaire">
                      {jourRelatif(e.jour)}
                    </span>
                    {e.humeur ? (
                      <span className="chiffres text-11 text-secondaire">
                        humeur {e.humeur}/5
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-13">
                    {(e.libre || e.fait || '—').split('\n')[0]}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}

/**
 * Un bilan de période.
 *
 * Le score moyen ignore les jours sans habitude programmée : les compter comme
 * des zéros ferait chuter la moyenne d'une semaine de vacances, ce qui
 * transformerait un repos en échec. Un bilan est un constat, pas un reproche.
 */
function BilanWidget({
  libelle,
  bilan,
  joursAttendus,
}: {
  libelle: string
  bilan: Bilan
  joursAttendus: number | null
}) {
  return (
    <Widget
      libelle={libelle}
      action={
        <span className="chiffres text-13 text-secondaire">
          {jourCourt(bilan.du)} — {jourCourt(bilan.au)}
        </span>
      }
    >
      <dl className="grid grid-cols-3 gap-4">
        <div>
          <dt className="libelle">Habitudes</dt>
          <dd className="chiffres text-24">
            {bilan.scoreMoyen === null ? '—' : `${Math.round(bilan.scoreMoyen * 100)}`}
            {bilan.scoreMoyen === null ? null : (
              <span className="text-13 text-secondaire"> %</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="libelle">Tâches faites</dt>
          <dd className="chiffres text-24">{bilan.tachesFaites}</dd>
        </div>
        <div>
          <dt className="libelle">Journal</dt>
          <dd className="chiffres text-24">
            {bilan.joursRenseignes}
            {joursAttendus ? (
              <span className="text-13 text-secondaire">/{joursAttendus}</span>
            ) : null}
          </dd>
        </div>
      </dl>

      {bilan.humeurMoyenne !== null ? (
        <p className="mt-3 text-11 text-secondaire">
          Humeur moyenne <span className="chiffres">{bilan.humeurMoyenne.toFixed(1)}</span>{' '}
          sur 5.
        </p>
      ) : null}
    </Widget>
  )
}
