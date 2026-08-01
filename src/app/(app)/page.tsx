import { Suspense } from 'react'
import { EnTeteJour } from '@/components/nav/EnTete'
import { widgetsAffiches } from '@/components/widgets/registre'
import { reglagesWidgets } from '@/lib/donnees/widgets'

/**
 * Le tableau de bord n'est qu'un ordonnanceur : il lit les réglages, croise
 * avec le registre, et rend. Il ne sait rien de ce que chaque widget affiche
 * ni des données qu'il consomme — c'est ce qui permet de les activer ou de les
 * désactiver un par un sans rien toucher ici.
 *
 * Chaque widget est sous son propre <Suspense> : un widget lent ne retient pas
 * les autres, ils se remplissent au fur et à mesure.
 */
export default async function TableauDeBord() {
  const reglages = await reglagesWidgets()
  const widgets = widgetsAffiches(reglages)

  return (
    <>
      <EnTeteJour />
      {widgets.map(({ cle, Composant }) => (
        <Suspense key={cle} fallback={null}>
          <Composant />
        </Suspense>
      ))}
    </>
  )
}
