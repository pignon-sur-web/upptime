import { Suspense } from 'react'
import { EnTeteJour } from '@/components/nav/EnTete'
import { GrilleLancement } from '@/components/nav/GrilleLancement'
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

/**
 * Les deux cartes du haut sortent de la rangée et vont dans une grille à deux
 * colonnes, comme la maquette.
 *
 * C'est la seule entorse au principe « pas de colonnes déclarées », et elle
 * est sûre par construction : `habitudes_du_jour` et `taches_du_jour` sont les
 * deux seuls widgets qui ne rendent JAMAIS `null` — à vide ils affichent une
 * invitation. Aucune des deux pistes ne peut donc rester blanche.
 *
 * Si l'un des deux devait un jour se taire, il faudrait le rendre à la rangée.
 * C'est écrit ici parce que c'est ici que la faute se commettrait.
 */
const PAIRE_DU_HAUT: readonly string[] = ['habitudes_du_jour', 'taches_du_jour']

export default async function TableauDeBord() {
  const reglages = await reglagesWidgets()
  const widgets = widgetsAffiches(reglages)

  const paire = widgets.filter((w) => PAIRE_DU_HAUT.includes(w.cle))
  const reste = widgets.filter((w) => !PAIRE_DU_HAUT.includes(w.cle))

  return (
    <>
      <EnTeteJour />
      <GrilleLancement />

      {paire.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {paire.map(({ cle, Composant }) => (
            <Suspense key={cle} fallback={null}>
              <Composant />
            </Suspense>
          ))}
        </div>
      ) : null}

      <div className="rangee">
        {reste.map(({ cle, Composant }) => (
          <Suspense key={cle} fallback={null}>
            <Composant />
          </Suspense>
        ))}
      </div>
    </>
  )
}
