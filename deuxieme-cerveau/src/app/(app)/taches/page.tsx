import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { ListeTaches } from '@/components/taches/ListeTaches'
import { FormulaireTache } from '@/components/taches/FormulaireTache'
import {
  septProchainsJours,
  sousTachesDe,
  tachesDuJour,
  toutesTaches,
} from '@/lib/donnees/taches'
import { projetsPourChoix } from '@/lib/donnees/projets'
import { jourLong } from '@/lib/date'

export const metadata = { title: 'Tâches' }

const VUES = [
  { cle: 'aujourdhui', nom: "Aujourd'hui" },
  { cle: 'semaine', nom: '7 jours' },
  { cle: 'toutes', nom: 'Toutes' },
] as const

type Vue = (typeof VUES)[number]['cle']

export default async function PageTaches({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>
}) {
  const { vue: vueDemandee } = await searchParams
  const vue: Vue = VUES.some((v) => v.cle === vueDemandee)
    ? (vueDemandee as Vue)
    : 'aujourdhui'

  const projets = await projetsPourChoix()

  return (
    <>
      <EnTeteSection
        titre="Tâches"
        action={
          <Link href="/taches/importer" className="libelle">
            Importer
          </Link>
        }
      />

      <nav className="flex border-b border-trait" aria-label="Vue">
        {VUES.map((v) => (
          <Link
            key={v.cle}
            href={v.cle === 'aujourdhui' ? '/taches' : `/taches?vue=${v.cle}`}
            aria-current={v.cle === vue ? 'page' : undefined}
            className={[
              'cible flex flex-1 items-center justify-center border-t-2 text-13',
              v.cle === vue
                ? 'border-t-texte font-medium'
                : 'border-t-transparent text-secondaire',
            ].join(' ')}
          >
            {v.nom}
          </Link>
        ))}
      </nav>

      {vue === 'aujourdhui' ? <VueAujourdhui /> : null}
      {vue === 'semaine' ? <VueSemaine /> : null}
      {vue === 'toutes' ? <VueToutes /> : null}

      <Widget libelle="Ajouter">
        <FormulaireTache projets={projets} />
      </Widget>
    </>
  )
}

async function VueAujourdhui() {
  const { dues, retards } = await tachesDuJour()
  const sous = await sousTachesDe([...dues, ...retards].map((t) => t.id))
  const parId = Object.fromEntries(sous)

  return (
    <>
      {/* Les retards passent devant : ce sont eux qui pèsent. */}
      {retards.length > 0 ? (
        <Widget
          libelle="Retards"
          action={<span className="chiffres text-13">{retards.length}</span>}
        >
          <ListeTaches taches={retards} sousTaches={parId} montrerJour />
        </Widget>
      ) : null}

      <Widget libelle="Aujourd'hui">
        {dues.length === 0 ? (
          <Invitation>Rien de prévu aujourd&apos;hui.</Invitation>
        ) : (
          <ListeTaches taches={dues} sousTaches={parId} />
        )}
      </Widget>
    </>
  )
}

async function VueSemaine() {
  const groupes = await septProchainsJours()

  if (groupes.length === 0) {
    return (
      <Widget libelle="7 prochains jours">
        <Invitation>Rien de daté dans la semaine qui vient.</Invitation>
      </Widget>
    )
  }

  return (
    <>
      {groupes.map((groupe) => (
        <Widget
          key={groupe.jour}
          libelle={jourLong(groupe.jour)}
          action={<span className="chiffres text-13">{groupe.taches.length}</span>}
        >
          <ListeTaches taches={groupe.taches} />
        </Widget>
      ))}
    </>
  )
}

async function VueToutes() {
  const taches = await toutesTaches({ statut: 'ouvertes' })

  return (
    <Widget
      libelle="Toutes les tâches ouvertes"
      action={<span className="chiffres text-13">{taches.length}</span>}
    >
      {taches.length === 0 ? (
        <Invitation>Aucune tâche ouverte.</Invitation>
      ) : (
        <ListeTaches taches={taches} montrerJour />
      )}
    </Widget>
  )
}
