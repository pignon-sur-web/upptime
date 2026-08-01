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
