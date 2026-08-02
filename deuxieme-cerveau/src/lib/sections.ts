import type { Route } from 'next'

/**
 * L'inventaire des écrans de l'application.
 *
 * L'ordre est délibéré : le panneau « Tout » affiche cette liste telle quelle,
 * et sur un téléphone tenu à une main, le bas de l'écran est ce que le pouce
 * atteint le plus facilement. Les sections les plus consultées sont donc en
 * fin de liste, pas au début.
 */
export type Section = {
  href: Route
  nom: string
  /** Description courte affichée en second niveau dans le panneau. */
  detail: string
}

export const SECTIONS: readonly Section[] = [
  { href: '/reglages', nom: 'Réglages', detail: 'Widgets, export des données' },
  { href: '/cours', nom: 'Cours', detail: 'Formations en cours' },
  { href: '/clients', nom: 'Clients', detail: 'Suivi et relances' },
  { href: '/lectures', nom: 'Lectures', detail: 'Livres en cours et terminés' },
  { href: '/sport', nom: 'Sport', detail: 'Séances et volume hebdomadaire' },
  { href: '/notes', nom: 'Notes', detail: 'Notes et recherche' },
  { href: '/objectifs', nom: 'Objectifs', detail: 'Résultats clés et progression' },
  { href: '/agenda', nom: 'Agenda', detail: 'Semaine et mois' },
  { href: '/projets', nom: 'Projets', detail: 'Avancement et échéances' },
  { href: '/journal', nom: 'Journal', detail: "L'entrée du jour, les bilans" },
  { href: '/inbox', nom: 'Inbox', detail: 'Capture rapide à trier' },
  { href: '/habitudes', nom: 'Habitudes', detail: 'Cochage, mur du mois, séries' },
]

/** Les trois destinations quotidiennes, épinglées dans la barre basse. */
export const ONGLETS: readonly { href: Route; nom: string }[] = [
  { href: '/', nom: 'Accueil' },
  { href: '/taches', nom: 'Tâches' },
  { href: '/argent', nom: 'Argent' },
]

/**
 * La grille de lancement, en tête du tableau de bord.
 *
 * Ce n'est PAS `SECTIONS` réordonné, et il ne faut pas chercher à l'en
 * dériver. Trois raisons, dont chacune suffirait :
 *
 *   — elle contient `/taches` et `/argent`, qui sont des ONGLETS et n'ont
 *     jamais été dans `SECTIONS` ;
 *   — son ordre est l'inverse du sien. `SECTIONS` descend du rare vers le
 *     quotidien parce que le panneau « Tout » se lit au pouce, de bas en
 *     haut ; une grille se lit à l'œil, de gauche à droite et de haut en bas,
 *     donc le quotidien vient en premier ;
 *   — les dix premières entrées reprennent la maquette dans son ordre exact,
 *     y compris ses libellés à elle — « To-do list », « Finances » — qui ne
 *     sont pas les noms internes des sections.
 *
 * Deux ordres opposés pour deux gestes opposés. Les fusionner reviendrait à
 * en sacrifier un.
 */
export type Lancement = { href: Route; libelle: string; emoji: string }

export const LANCEMENT: readonly Lancement[] = [
  { href: '/habitudes', libelle: 'Habitudes', emoji: '🔁' },
  { href: '/taches', libelle: 'To-do list', emoji: '✅' },
  { href: '/agenda', libelle: 'Agenda', emoji: '📅' },
  { href: '/projets', libelle: 'Projets', emoji: '📁' },
  { href: '/cours', libelle: 'Cours', emoji: '🎓' },
  { href: '/objectifs', libelle: 'Objectifs', emoji: '🎯' },
  { href: '/argent', libelle: 'Finances', emoji: '💶' },
  { href: '/sport', libelle: 'Sport', emoji: '🥋' },
  { href: '/notes', libelle: 'Notes', emoji: '📝' },
  { href: '/lectures', libelle: 'Lectures', emoji: '📖' },
  { href: '/inbox', libelle: 'Inbox', emoji: '📥' },
  { href: '/journal', libelle: 'Journal', emoji: '🌙' },
  { href: '/clients', libelle: 'Clients', emoji: '🤝' },
  { href: '/reglages', libelle: 'Réglages', emoji: '⚙️' },
]
