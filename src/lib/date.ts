/**
 * Toute notion de « jour » dans l'application passe par ce fichier.
 *
 * Vercel et Supabase tournent en UTC, l'utilisateur vit en Europe/Brussels.
 * Entre minuit et 2h du matin, UTC est encore la veille : une habitude cochée
 * à 00h30 serait enregistrée sur le mauvais jour et la série casserait au
 * réveil. C'est le bug qui tue la promesse de l'application.
 *
 * Règle : jamais de `new Date().toISOString().slice(0, 10)` ailleurs (une règle
 * ESLint le refuse), et côté SQL jamais de `current_date` — la fonction
 * `app_today()` fait le même travail dans Postgres.
 *
 * Un jour est toujours représenté par une chaîne `AAAA-MM-JJ`, jamais par un
 * objet Date : c'est ce que Postgres stocke dans une colonne `date`, et ça
 * supprime toute ambiguïté d'heure.
 */

export const FUSEAU = 'Europe/Brussels'

/** `en-CA` produit directement le format AAAA-MM-JJ. */
const formatteurJour = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export type Jour = string // AAAA-MM-JJ

/**
 * Le jour belge auquel appartient un instant.
 *
 * C'est le pendant en lecture d'`aujourdhui()` : une colonne `timestamptz`
 * (un `done_at`, un `created_at`) revient d'UTC, et la ranger dans la bonne
 * journée demande la même conversion. Une tâche terminée à 00h30 appartient à
 * la journée qui vient de commencer, pas à la veille en UTC.
 */
export function jourDe(instant: string | Date): Jour {
  return formatteurJour.format(typeof instant === 'string' ? new Date(instant) : instant)
}

/** Le jour courant tel que l'utilisateur le vit. */
export function aujourdhui(): Jour {
  return jourDe(new Date())
}

// — Instants ——————————————————————————————————————————————————————
//
// L'agenda est le seul domaine qui manipule des instants plutôt que des jours,
// d'où `timestamptz` en base. Les deux conversions qu'il réclame vivent ici,
// avec le reste du fuseau, et nulle part ailleurs.

// `en-GB` plutôt que `fr-BE` : c'est une locale en h23, donc minuit s'écrit
// « 00:30 » et non « 24:30 ». Le rendu est identique le reste de la journée.
const formatteurHeure = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSEAU,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** « 14:30 », en heure belge. */
export function heure(instant: string | Date): string {
  return formatteurHeure.format(
    typeof instant === 'string' ? new Date(instant) : instant,
  )
}

const formatteurComplet = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** Décalage du fuseau, en millisecondes, à un instant donné. */
function decalageFuseau(instant: Date): number {
  const parties = Object.fromEntries(
    formatteurComplet.formatToParts(instant).map((p) => [p.type, p.value]),
  )
  const commeUTC = Date.UTC(
    Number(parties.year),
    Number(parties.month) - 1,
    Number(parties.day),
    Number(parties.hour) % 24,
    Number(parties.minute),
    Number(parties.second),
  )
  return commeUTC - instant.getTime()
}

/**
 * Convertit une heure de pendule belge — ce que rend un `<input
 * type="datetime-local">`, « 2026-08-01T14:30 » — en instant absolu.
 *
 * Sans cette conversion, un rendez-vous saisi à 14h30 serait stocké comme
 * 14h30 UTC et s'afficherait à 16h30 en été. La double passe traite le cas du
 * changement d'heure : le décalage dépend de l'instant, et l'instant dépend du
 * décalage. Une seconde itération suffit pour converger partout sauf dans
 * l'heure qui n'existe pas au passage à l'heure d'été, où le résultat reste
 * raisonnable.
 */
export function instantDepuisLocal(local: string): string {
  const naif = Date.parse(`${local.length === 16 ? local : local.slice(0, 16)}:00Z`)
  if (Number.isNaN(naif)) throw new Error(`Date et heure illisibles : ${local}`)

  let instant = naif - decalageFuseau(new Date(naif))
  instant = naif - decalageFuseau(new Date(instant))

  const resultat = new Date(instant)
  return resultat.toISOString()
}

/**
 * L'instant présent, au format que Postgres attend pour un `timestamptz`.
 *
 * Passer par ce fichier plutôt que d'écrire `new Date().toISOString()` sur
 * place n'est pas une coquetterie : la règle ESLint qui interdit la seconde
 * forme existe parce que c'est ainsi qu'on dérive un jour par accident. Ici on
 * veut un instant, pas un jour — et le dire à un seul endroit rend la
 * distinction visible.
 */
export function maintenant(): string {
  const instant = new Date()
  return instant.toISOString()
}

/** L'inverse : un instant vers la valeur d'un `<input type="datetime-local">`. */
export function localDepuisInstant(instant: string | Date): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  return `${jourDe(d)}T${heure(d)}`
}

/**
 * Ancre un jour à midi UTC. Midi et non minuit : ça laisse douze heures de
 * marge de part et d'autre, donc aucun décalage horaire ni changement d'heure
 * ne peut faire basculer le calcul sur le jour voisin.
 */
function ancre(jour: Jour): Date {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, j ?? 1, 12))
}

function depuisAncre(d: Date): Jour {
  const a = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const j = String(d.getUTCDate()).padStart(2, '0')
  return `${a}-${m}-${j}`
}

/** Décale un jour de `n` jours (n peut être négatif). */
export function decaler(jour: Jour, n: number): Jour {
  const d = ancre(jour)
  d.setUTCDate(d.getUTCDate() + n)
  return depuisAncre(d)
}

/** Nombre de jours de `depuis` vers `vers`. Positif si `vers` est après. */
export function ecartJours(depuis: Jour, vers: Jour): number {
  return Math.round((ancre(vers).getTime() - ancre(depuis).getTime()) / 86_400_000)
}

/** Jour de la semaine ISO : 1 = lundi … 7 = dimanche. */
export function jourSemaineISO(jour: Jour): number {
  const d = ancre(jour).getUTCDay() // 0 = dimanche
  return d === 0 ? 7 : d
}

/** Premier jour du mois contenant `jour`. */
export function debutDuMois(jour: Jour): Jour {
  return `${jour.slice(0, 7)}-01`
}

/** Premier jour du mois suivant. */
export function moisSuivant(jour: Jour): Jour {
  const d = ancre(debutDuMois(jour))
  d.setUTCMonth(d.getUTCMonth() + 1)
  return depuisAncre(d)
}

/** Premier jour du mois précédent. */
export function moisPrecedent(jour: Jour): Jour {
  const d = ancre(debutDuMois(jour))
  d.setUTCMonth(d.getUTCMonth() - 1)
  return depuisAncre(d)
}

/** Tous les jours du mois contenant `jour`, dans l'ordre. */
export function joursDuMois(jour: Jour): Jour[] {
  const debut = debutDuMois(jour)
  const fin = moisSuivant(jour)
  const jours: Jour[] = []
  for (let j = debut; j !== fin; j = decaler(j, 1)) jours.push(j)
  return jours
}

/** Le lundi de la semaine contenant `jour`. */
export function debutDeSemaine(jour: Jour): Jour {
  return decaler(jour, -(jourSemaineISO(jour) - 1))
}

/** Une plage inclusive de jours. */
export function plage(du: Jour, au: Jour): Jour[] {
  const jours: Jour[] = []
  for (let j = du; ecartJours(j, au) >= 0; j = decaler(j, 1)) jours.push(j)
  return jours
}

// — Affichage ————————————————————————————————————————————————

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-BE', { timeZone: 'UTC', ...options })

const fmtJourLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const fmtJourMoyen = fmt({ day: 'numeric', month: 'short' })
const fmtMoisLong = fmt({ month: 'long', year: 'numeric' })
const fmtJourSemaineCourt = fmt({ weekday: 'short' })

/** « samedi 1 août » */
export function jourLong(jour: Jour): string {
  return fmtJourLong.format(ancre(jour))
}

/** « 1 août » */
export function jourMoyen(jour: Jour): string {
  return fmtJourMoyen.format(ancre(jour))
}

/** « 01.08 » — pour les colonnes en Geist Mono. */
export function jourCourt(jour: Jour): string {
  return `${jour.slice(8, 10)}.${jour.slice(5, 7)}`
}

/** « août 2026 » */
export function moisLong(jour: Jour): string {
  return fmtMoisLong.format(ancre(jour))
}

/** « sam. » */
export function jourSemaineCourt(jour: Jour): string {
  return fmtJourSemaineCourt.format(ancre(jour))
}

/**
 * Formulation relative courte, celle qu'on veut lire sur une liste de tâches :
 * « aujourd'hui », « demain », « il y a 3 j », « dans 5 j », sinon la date.
 */
export function jourRelatif(jour: Jour, reference: Jour = aujourdhui()): string {
  const n = ecartJours(reference, jour)
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  if (n === -1) return 'hier'
  if (n < 0 && n >= -13) return `il y a ${-n} j`
  if (n > 0 && n <= 13) return `dans ${n} j`
  return jourMoyen(jour)
}
