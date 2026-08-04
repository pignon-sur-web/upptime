/**
 * Les valeurs d'énumération du schéma, côté TypeScript.
 *
 * Le schéma les stocke en `text` + `CHECK` plutôt qu'en type ENUM Postgres :
 * faire évoluer une valeur tient alors en une ligne réversible, là où un ENUM
 * impose d'échanger le type entier. La contrepartie est que les types générés
 * voient `string` ; ce fichier est donc la source de vérité du côté applicatif,
 * et c'est aussi lui qui porte les libellés affichés.
 *
 * Une exception : les priorités sont des `smallint`, pour que `order by
 * priority` fonctionne en base. C'est la seule chose que le texte fait perdre.
 */

// — Priorités ————————————————————————————————————————————————————
// 0 n'est pas une priorité mais son absence : une tâche sans étiquette.

export const PRIORITES = [
  { valeur: 1, nom: 'Urgent & important', court: 'U+I' },
  { valeur: 2, nom: 'Important', court: 'I' },
  { valeur: 3, nom: 'Secondaire', court: 'S' },
] as const

export function priorite(valeur: number | null) {
  return PRIORITES.find((p) => p.valeur === valeur) ?? null
}

// — Tâches ————————————————————————————————————————————————————————

export const STATUTS_TACHE = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  fait: 'Fait',
  annule: 'Annulé',
} as const

export type StatutTache = keyof typeof STATUTS_TACHE

/** Les statuts qui font qu'une tâche pèse encore sur la journée. */
export const STATUTS_OUVERTS: StatutTache[] = ['a_faire', 'en_cours']

export const CONTEXTES = { pro: 'Pro', perso: 'Perso' } as const
export type Contexte = keyof typeof CONTEXTES

/**
 * Récurrences, en durées ISO-8601 : la chaîne se convertit directement en
 * `interval` Postgres, et TypeScript voit une union propre au lieu de la
 * sérialisation d'interval de PostgREST (« 1 mon »).
 */
export const RECURRENCES = {
  P1D: 'Chaque jour',
  P1W: 'Chaque semaine',
  P2W: 'Toutes les deux semaines',
  P1M: 'Chaque mois',
  P3M: 'Chaque trimestre',
  P1Y: 'Chaque année',
} as const

export type Recurrence = keyof typeof RECURRENCES

/**
 * Deux récurrences réellement différentes, pas un cas limite.
 *
 * `schedule` : la date est fixée de l'extérieur — le loyer, la revue hebdo. Le
 * retard ne la déplace pas.
 * `completion` : le compteur repart quand on fait réellement la chose —
 * arroser les plantes tous les trois jours.
 */
export const ANCRAGES = {
  schedule: 'À date fixe',
  completion: 'Après chaque fois',
} as const

export type Ancrage = keyof typeof ANCRAGES

// — Projets ————————————————————————————————————————————————————————

export const STATUTS_PROJET = {
  idee: 'Idée',
  active: 'En cours',
  pause: 'En pause',
  termine: 'Terminé',
  abandonne: 'Abandonné',
} as const

export type StatutProjet = keyof typeof STATUTS_PROJET

// — Objectifs ————————————————————————————————————————————————————

export const STATUTS_OBJECTIF = {
  active: 'En cours',
  pause: 'En pause',
  termine: 'Atteint',
  abandonne: 'Abandonné',
} as const

export type StatutObjectif = keyof typeof STATUTS_OBJECTIF
