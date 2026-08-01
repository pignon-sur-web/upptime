/**
 * Le vocabulaire du domaine, côté application.
 *
 * Les valeurs sont exactement celles des contraintes CHECK des migrations —
 * c'est volontaire : le schéma stocke du texte lisible plutôt que des codes,
 * donc une ligne lue dans l'éditeur SQL de Supabase se comprend sans table de
 * correspondance. Ce fichier ne fait que leur associer un libellé français et
 * un ordre d'affichage.
 *
 * Il ne contient aucune fonction asynchrone et n'importe rien : il est
 * consommé aussi bien par les composants serveur que par les composants
 * client.
 */

// — Tâches ————————————————————————————————————————————————————————

export const STATUTS_TACHE = ['a_faire', 'en_cours', 'fait', 'annule'] as const
export type StatutTache = (typeof STATUTS_TACHE)[number]

export const LIBELLE_STATUT_TACHE: Record<StatutTache, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  fait: 'Fait',
  annule: 'Annulé',
}

/** Une tâche « ouverte » est celle qui attend encore quelque chose de vous. */
export const STATUTS_OUVERTS = ['a_faire', 'en_cours'] as const satisfies readonly StatutTache[]

export function estOuverte(statut: string): boolean {
  return statut === 'a_faire' || statut === 'en_cours'
}

/**
 * Les priorités sont des `smallint` et non du texte, contrairement au reste
 * des énumérations : c'est la seule façon d'obtenir un `order by priority`
 * qui trie dans l'ordre de l'urgence plutôt que dans l'ordre alphabétique.
 *
 * 0 vaut « aucune » et non « la plus faible » — d'où le tri applicatif qui le
 * renvoie en fin de liste plutôt que devant les tâches urgentes.
 */
export const PRIORITES = [1, 2, 3, 0] as const
export type Priorite = (typeof PRIORITES)[number]

export const LIBELLE_PRIORITE: Record<Priorite, string> = {
  1: 'Urgent et important',
  2: 'Important',
  3: 'Secondaire',
  0: 'Aucune',
}

/** Marque courte affichée en tête de ligne. Le monochrome n'a que le trait. */
export const MARQUE_PRIORITE: Record<Priorite, string> = {
  1: '!!',
  2: '!',
  3: '·',
  0: '',
}

/** Rang de tri : l'urgent d'abord, l'absence de priorité en dernier. */
export function rangPriorite(priorite: number | null): number {
  if (priorite === null || priorite === 0) return 9
  return priorite
}

export const CONTEXTES = ['pro', 'perso'] as const
export type Contexte = (typeof CONTEXTES)[number]

export const LIBELLE_CONTEXTE: Record<Contexte, string> = {
  pro: 'Pro',
  perso: 'Perso',
}

// — Récurrence ————————————————————————————————————————————————————

/**
 * Les récurrences sont stockées en durée ISO-8601 : la chaîne se convertit
 * directement en `interval` Postgres, et TypeScript voit une union propre au
 * lieu de la sérialisation d'interval de PostgREST (« 1 mon »).
 */
export const RECURRENCES = [
  { valeur: 'P1D', libelle: 'Tous les jours' },
  { valeur: 'P2D', libelle: 'Tous les 2 jours' },
  { valeur: 'P3D', libelle: 'Tous les 3 jours' },
  { valeur: 'P1W', libelle: 'Toutes les semaines' },
  { valeur: 'P2W', libelle: 'Toutes les 2 semaines' },
  { valeur: 'P1M', libelle: 'Tous les mois' },
  { valeur: 'P3M', libelle: 'Tous les 3 mois' },
  { valeur: 'P1Y', libelle: 'Tous les ans' },
] as const

export const MOTIF_RECURRENCE = /^P[0-9]+[DWMY]$/

export function libelleRecurrence(recurrence: string | null): string | null {
  if (!recurrence) return null
  return RECURRENCES.find((r) => r.valeur === recurrence)?.libelle ?? recurrence
}

/**
 * Deux récurrences vraiment différentes, pas deux cas limites.
 *
 * `schedule` : la date vient de l'extérieur — le loyer, la revue hebdomadaire.
 * Un retard ne la déplace pas.
 * `completion` : le compteur repart quand vous le faites réellement — arroser
 * les plantes tous les trois jours.
 */
export const ANCRAGES = [
  {
    valeur: 'schedule',
    libelle: 'À date fixe',
    detail: 'Le loyer, la revue hebdo — le retard ne déplace pas la date.',
  },
  {
    valeur: 'completion',
    libelle: 'Après réalisation',
    detail: 'Arroser les plantes — le compteur repart quand vous le faites.',
  },
] as const

export type Ancrage = (typeof ANCRAGES)[number]['valeur']

// — Projets ———————————————————————————————————————————————————————

export const STATUTS_PROJET = ['idee', 'active', 'pause', 'termine', 'abandonne'] as const
export type StatutProjet = (typeof STATUTS_PROJET)[number]

export const LIBELLE_STATUT_PROJET: Record<StatutProjet, string> = {
  idee: 'Idée',
  active: 'En cours',
  pause: 'En pause',
  termine: 'Terminé',
  abandonne: 'Abandonné',
}

/** Les projets qui méritent d'apparaître sur le tableau de bord. */
export const STATUTS_PROJET_VIVANTS = ['active', 'pause'] as const
