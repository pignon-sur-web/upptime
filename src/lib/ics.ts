/**
 * Génération d'un flux iCalendar (RFC 5545), écrite à la main.
 *
 * Le format tient en trois règles et une centaine de lignes ; une dépendance
 * apporterait ici surtout des fonctionnalités dont on n'a pas l'usage — les
 * récurrences, les fuseaux embarqués, les pièces jointes. Ce qu'on veut est
 * étroit : une liste d'événements datés que Calendrier Apple sache lire.
 *
 * Ce que ça résout, et c'est la vraie raison de son existence : une PWA sur
 * iOS n'a pas de notifications fiables. Un calendrier abonné, si. Les cours de
 * JJB et les échéances sonnent parce qu'ils vivent dans Calendrier, pas parce
 * que l'application a réussi à réveiller le téléphone.
 *
 * Aucune importation à l'exécution : le module se charge tel quel dans Node
 * pour le banc d'essai.
 */

import type { Jour } from '@/lib/date'

export type EvenementICS = {
  /** Stable dans le temps : c'est lui qui évite les doublons à chaque relecture. */
  id: string
  titre: string
  /** Instant ISO pour un événement horaire, `null` pour une journée entière. */
  debut: string | null
  fin: string | null
  /** Renseigné à la place de debut/fin pour une journée entière. */
  jour?: Jour
  description?: string | null
  lieu?: string | null
  categorie?: string | null
  /** Minutes avant le début. `null` pour aucune alerte. */
  alerteMinutes?: number | null
}

/**
 * Échappement RFC 5545 : la barre oblique inverse d'abord, sinon on
 * échapperait les échappements qu'on vient d'écrire.
 */
function echapper(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Pliage des lignes à 75 octets.
 *
 * La limite est en OCTETS, pas en caractères : « JJB à Bruxelles » compte ses
 * accents double. Un pliage naïf au 75ᵉ caractère couperait un caractère
 * multi-octets en deux et produirait un flux illisible — Calendrier Apple
 * l'accepterait sans rien dire et afficherait des losanges.
 */
function plier(ligne: string): string {
  const encodeur = new TextEncoder()
  if (encodeur.encode(ligne).length <= 75) return ligne

  const morceaux: string[] = []
  let courant = ''
  let octets = 0

  for (const caractere of ligne) {
    const taille = encodeur.encode(caractere).length
    // 74 sur les lignes de continuation : l'espace initial compte.
    const plafond = morceaux.length === 0 ? 75 : 74
    if (octets + taille > plafond) {
      morceaux.push(courant)
      courant = ''
      octets = 0
    }
    courant += caractere
    octets += taille
  }
  if (courant) morceaux.push(courant)

  return morceaux.join('\r\n ')
}

/** `20260803T180000Z` — les instants partent en UTC, sans VTIMEZONE. */
function horodatage(instant: string | Date): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const deux = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${deux(d.getUTCMonth() + 1)}${deux(d.getUTCDate())}` +
    `T${deux(d.getUTCHours())}${deux(d.getUTCMinutes())}${deux(d.getUTCSeconds())}Z`
  )
}

/** `20260803` — pour les journées entières, sans heure ni fuseau. */
function dateSeule(jour: Jour): string {
  return jour.replace(/-/g, '')
}

function jourSuivant(jour: Jour): string {
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, j ?? 1, 12))
  d.setUTCDate(d.getUTCDate() + 1)
  const deux = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${deux(d.getUTCMonth() + 1)}${deux(d.getUTCDate())}`
}

export type OptionsCalendrier = {
  nom: string
  description?: string
  /** À quelle fréquence le client est invité à relire le flux. */
  rafraichissement?: string
  /** L'instant de génération, injecté pour que le banc d'essai soit stable. */
  genereLe?: string
}

/**
 * Assemble le flux complet.
 *
 * `REFRESH-INTERVAL` et `X-PUBLISHED-TTL` disent la même chose à deux
 * générations de clients : le premier est standard, le seul que respecte iOS
 * est en pratique le second. Les écrire tous les deux coûte deux lignes.
 */
export function construireCalendrier(
  evenements: readonly EvenementICS[],
  options: OptionsCalendrier,
): string {
  const maintenant = horodatage(options.genereLe ?? new Date())

  const lignes: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mon 2e Cerveau//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapper(options.nom)}`,
    `NAME:${echapper(options.nom)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${options.rafraichissement ?? 'PT1H'}`,
    `X-PUBLISHED-TTL:${options.rafraichissement ?? 'PT1H'}`,
  ]

  if (options.description) {
    lignes.push(`X-WR-CALDESC:${echapper(options.description)}`)
    lignes.push(`DESCRIPTION:${echapper(options.description)}`)
  }

  for (const evenement of evenements) {
    lignes.push('BEGIN:VEVENT')
    lignes.push(`UID:${evenement.id}@deuxieme-cerveau`)
    lignes.push(`DTSTAMP:${maintenant}`)

    if (evenement.jour) {
      // Une journée entière se borne au lendemain : DTEND est EXCLUSIF. Poser
      // le même jour des deux côtés produit un événement de durée nulle, que
      // certains clients n'affichent pas du tout.
      lignes.push(`DTSTART;VALUE=DATE:${dateSeule(evenement.jour)}`)
      lignes.push(`DTEND;VALUE=DATE:${jourSuivant(evenement.jour)}`)
    } else if (evenement.debut) {
      lignes.push(`DTSTART:${horodatage(evenement.debut)}`)
      lignes.push(`DTEND:${horodatage(evenement.fin ?? evenement.debut)}`)
    }

    lignes.push(`SUMMARY:${echapper(evenement.titre)}`)
    if (evenement.description) {
      lignes.push(`DESCRIPTION:${echapper(evenement.description)}`)
    }
    if (evenement.lieu) lignes.push(`LOCATION:${echapper(evenement.lieu)}`)
    if (evenement.categorie) lignes.push(`CATEGORIES:${echapper(evenement.categorie)}`)

    // Le flux est un miroir en lecture seule : le dire évite qu'un client
    // propose une modification qui ne repartirait nulle part.
    lignes.push('TRANSP:OPAQUE')

    if (evenement.alerteMinutes !== null && evenement.alerteMinutes !== undefined) {
      lignes.push('BEGIN:VALARM')
      lignes.push('ACTION:DISPLAY')
      lignes.push(`DESCRIPTION:${echapper(evenement.titre)}`)
      lignes.push(`TRIGGER:-PT${evenement.alerteMinutes}M`)
      lignes.push('END:VALARM')
    }

    lignes.push('END:VEVENT')
  }

  lignes.push('END:VCALENDAR')

  // CRLF : la RFC l'impose, et les clients stricts refusent le reste.
  return lignes.map(plier).join('\r\n') + '\r\n'
}
