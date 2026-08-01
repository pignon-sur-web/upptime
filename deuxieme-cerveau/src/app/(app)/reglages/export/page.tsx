import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { volumesExport } from '@/lib/donnees/export'

export const metadata = { title: 'Export' }

export default async function PageExport() {
  const volumes = await volumesExport()
  const total = Object.values(volumes).reduce((somme, n) => somme + n, 0)
  const nonVides = Object.entries(volumes).filter(([, n]) => n > 0)

  return (
    <>
      <EnTeteSection titre="Export des données" retour="/reglages" />

      <Widget
        libelle="Tout exporter"
        action={<span className="chiffres text-13">{total} lignes</span>}
      >
        {/*
          L'offre gratuite de Supabase n'a pas de sauvegarde automatique. Sans
          cet écran, la base est l'unique copie d'une année de journal.
        */}
        <p className="text-13 text-secondaire">
          L&apos;offre gratuite de Supabase n&apos;a pas de sauvegarde automatique :
          cette base est votre unique copie. Un fichier JSON, à ranger où vous
          voulez.
        </p>

        <a
          href="/reglages/export/donnees"
          download
          className="cible mt-4 flex w-full items-center justify-center bg-texte px-4 text-15 font-medium text-fond"
        >
          Télécharger l&apos;export
        </a>

        <p className="mt-2 text-11 text-secondaire">
          Les vues et les calculs ne sont pas exportés — ils se refont depuis les
          tables. Les couvertures de livres sont des fichiers et restent dans le
          bucket Storage.
        </p>
      </Widget>

      <Widget libelle="Contenu de l'export">
        {nonVides.length === 0 ? (
          <p className="text-13 text-secondaire">La base est vide.</p>
        ) : (
          <ul>
            {nonVides.map(([table, nb]) => (
              <li
                key={table}
                className="flex items-baseline justify-between gap-4 border-b border-trait py-1.5 last:border-b-0"
              >
                <span className="chiffres text-13">{table}</span>
                <span className="chiffres text-13 text-secondaire">{nb}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </>
  )
}
