import type { ComponentType } from 'react'
import { LeJour } from './LeJour'
import { HabitudesDuJour } from './HabitudesDuJour'
import { CourbeHabitudesWidget, MurDuMoisWidget } from './MurDuMoisWidget'
import {
  ProjetsEnCoursWidget,
  RetardsWidget,
  SeptJoursWidget,
  TachesDuJourWidget,
} from './TachesWidgets'

/**
 * Le registre est le seul endroit où les widgets sont énumérés.
 *
 * Les lignes de `widget_settings` s'y raccrochent par `cle`. Deux règles
 * rendent l'ensemble tolérant :
 *
 *   — une clé présente en base mais absente d'ici est ignorée, ce qui permet
 *     de retirer un widget du code sans migration ;
 *   — une clé présente ici mais absente de la base est considérée active, ce
 *     qui permet d'en ajouter un sans migration non plus.
 *
 * Chaque widget est un composant serveur autonome qui va chercher ses propres
 * données. Les lectures de src/lib/donnees/ passant par `cache()`, deux
 * widgets qui demandent la même chose ne déclenchent qu'une requête.
 */
export type CleWidget =
  | 'le_jour'
  | 'habitudes_du_jour'
  | 'taches_du_jour'
  | 'retards'
  | 'sept_jours'
  | 'comptes'
  | 'mois_en_argent'
  | 'paiements_a_venir'
  | 'projets_en_cours'
  | 'objectifs_en_cours'
  | 'mur_du_mois'
  | 'courbe_habitudes'
  | 'agenda'
  | 'lecture_en_cours'
  | 'inbox'

export type DefinitionWidget = {
  cle: CleWidget
  /** Nom affiché dans l'écran de réglage des widgets. */
  libelle: string
  Composant: ComponentType
}

export const WIDGETS: readonly DefinitionWidget[] = [
  { cle: 'le_jour', libelle: 'Le jour', Composant: LeJour },
  { cle: 'habitudes_du_jour', libelle: 'Habitudes du jour', Composant: HabitudesDuJour },
  { cle: 'taches_du_jour', libelle: "Tâches d'aujourd'hui", Composant: TachesDuJourWidget },
  { cle: 'retards', libelle: 'En retard', Composant: RetardsWidget },
  { cle: 'sept_jours', libelle: 'Sept prochains jours', Composant: SeptJoursWidget },
  { cle: 'projets_en_cours', libelle: 'Projets en cours', Composant: ProjetsEnCoursWidget },
  { cle: 'mur_du_mois', libelle: 'Le mur du mois', Composant: MurDuMoisWidget },
  { cle: 'courbe_habitudes', libelle: 'Courbe des habitudes', Composant: CourbeHabitudesWidget },
]

export const WIDGET_PAR_CLE = new Map(WIDGETS.map((w) => [w.cle, w]))

/** Ordre par défaut du cahier des charges, pour les clés absentes de la base. */
const ORDRE_DEFAUT: Record<string, number> = {
  le_jour: 10,
  habitudes_du_jour: 20,
  taches_du_jour: 30,
  retards: 40,
  sept_jours: 50,
  comptes: 60,
  mois_en_argent: 70,
  paiements_a_venir: 80,
  projets_en_cours: 90,
  objectifs_en_cours: 100,
  mur_du_mois: 110,
  courbe_habitudes: 120,
  agenda: 130,
  lecture_en_cours: 140,
  inbox: 150,
}

export type ReglageWidget = { cle: string; actif: boolean; position: number }

/** Croise les réglages enregistrés avec le registre, et trie. */
export function widgetsAffiches(
  reglages: readonly ReglageWidget[],
): DefinitionWidget[] {
  const parCle = new Map(reglages.map((r) => [r.cle, r]))

  return WIDGETS.filter((widget) => parCle.get(widget.cle)?.actif ?? true).sort(
    (a, b) =>
      (parCle.get(a.cle)?.position ?? ORDRE_DEFAUT[a.cle] ?? 999) -
      (parCle.get(b.cle)?.position ?? ORDRE_DEFAUT[b.cle] ?? 999),
  )
}
