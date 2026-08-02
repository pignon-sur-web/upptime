/*
 * Le flux iCalendar, sur ce qui casse un abonnement.
 *
 *   npm run verifier:ics
 *
 * Un calendrier mal formé ne produit pas d'erreur : Calendrier Apple
 * l'accepte, n'affiche rien, et ne dit pas pourquoi. Les cas ci-dessous sont
 * ceux qui provoquent exactement ce silence.
 */

import { strict as assert } from 'node:assert'
import { construireCalendrier } from '../src/lib/ics.ts'

let passes = 0
const cas = []
const verifier = (nom, execution) => {
  try {
    execution()
    cas.push({ nom, ok: true })
    passes++
  } catch (souci) {
    cas.push({ nom, ok: false, detail: souci.message.split('\n')[0] })
  }
}

const OPTIONS = { nom: 'Mon 2e Cerveau', genereLe: '2026-08-02T06:00:00Z' }
const flux = (evenements) => construireCalendrier(evenements, OPTIONS)

const COURS = {
  id: 'evenement-1',
  titre: 'JJB',
  debut: '2026-08-03T18:00:00.000Z', // 20h heure belge
  fin: '2026-08-03T20:00:00.000Z',
  categorie: 'sport',
  alerteMinutes: 15,
}

// — Structure ——————————————————————————————————————————————————————

verifier('le flux est encadré par VCALENDAR', () => {
  const texte = flux([COURS])
  assert.match(texte, /^BEGIN:VCALENDAR\r\n/)
  assert.match(texte, /END:VCALENDAR\r\n$/)
})

verifier('les fins de ligne sont en CRLF, jamais en LF seul', () => {
  const texte = flux([COURS])
  // Un \n non précédé d'un \r suffit à faire rejeter le flux par un client strict.
  assert.equal(/[^\r]\n/.test(texte), false)
})

verifier('chaque événement porte un UID stable', () => {
  const un = flux([COURS])
  const deux = flux([COURS])
  const uid = /UID:(.+)/.exec(un)?.[1]
  assert.equal(uid, /UID:(.+)/.exec(deux)?.[1])
  // Sans UID stable, chaque relecture recrée les événements : l'agenda double
  // à chaque rafraîchissement.
  assert.match(uid ?? '', /^evenement-1@deuxieme-cerveau/)
})

// — Heures ————————————————————————————————————————————————————————

verifier('un cours de 20h belge part en 18h UTC, avec le Z', () => {
  assert.match(flux([COURS]), /DTSTART:20260803T180000Z/)
  assert.match(flux([COURS]), /DTEND:20260803T200000Z/)
})

verifier('une alerte de quinze minutes est posée', () => {
  const texte = flux([COURS])
  assert.match(texte, /BEGIN:VALARM/)
  assert.match(texte, /TRIGGER:-PT15M/)
})

verifier('sans alerte, aucun VALARM', () => {
  assert.equal(/VALARM/.test(flux([{ ...COURS, alerteMinutes: null }])), false)
})

// — Journées entières —————————————————————————————————————————————

verifier('une journée entière se borne au LENDEMAIN', () => {
  const texte = flux([{ id: 't-1', titre: '☐ Relancer', debut: null, fin: null, jour: '2026-08-05' }])
  assert.match(texte, /DTSTART;VALUE=DATE:20260805/)
  // DTEND est exclusif : borner au même jour produit une durée nulle, que
  // plusieurs clients n'affichent pas du tout.
  assert.match(texte, /DTEND;VALUE=DATE:20260806/)
})

verifier('une journée entière en fin de mois passe au mois suivant', () => {
  const texte = flux([{ id: 't-2', titre: 'Loyer', debut: null, fin: null, jour: '2026-08-31' }])
  assert.match(texte, /DTEND;VALUE=DATE:20260901/)
})

verifier('le 28 février d’une année bissextile mène au 29', () => {
  const texte = flux([{ id: 't-3', titre: 'X', debut: null, fin: null, jour: '2028-02-28' }])
  assert.match(texte, /DTEND;VALUE=DATE:20280229/)
})

// — Échappement ————————————————————————————————————————————————————

verifier('une virgule dans un titre est échappée', () => {
  const texte = flux([{ ...COURS, titre: 'JJB, gi' }])
  assert.match(texte, /SUMMARY:JJB\\, gi/)
})

verifier('un point-virgule et une barre oblique inverse sont échappés', () => {
  const texte = flux([{ ...COURS, titre: 'A;B\\C' }])
  assert.match(texte, /SUMMARY:A\\;B\\\\C/)
})

verifier('un retour à la ligne devient \\n littéral', () => {
  const texte = flux([{ ...COURS, description: 'ligne un\nligne deux' }])
  assert.match(texte, /DESCRIPTION:ligne un\\nligne deux/)
})

// — Pliage —————————————————————————————————————————————————————————

verifier('une ligne longue est pliée sous 75 octets', () => {
  const texte = flux([{ ...COURS, titre: 'x'.repeat(200) }])
  const encodeur = new TextEncoder()
  for (const ligne of texte.split('\r\n')) {
    assert.ok(encodeur.encode(ligne).length <= 75, `ligne de ${ligne.length} caractères`)
  }
})

verifier('le pliage compte les OCTETS et ne coupe pas un accent en deux', () => {
  // « é » pèse deux octets : un pliage au 75ᵉ caractère produirait un flux
  // dont les accents deviennent des losanges, sans message d'erreur.
  const texte = flux([{ ...COURS, titre: 'é'.repeat(80) }])
  const encodeur = new TextEncoder()
  for (const ligne of texte.split('\r\n')) {
    assert.ok(encodeur.encode(ligne).length <= 75)
  }
  // Le titre se relit intact une fois déplié.
  const deplie = texte.replace(/\r\n /g, '')
  assert.match(deplie, new RegExp(`SUMMARY:${'é'.repeat(80)}`))
})

verifier('une ligne pliée reprend par une espace', () => {
  const texte = flux([{ ...COURS, titre: 'x'.repeat(200) }])
  const lignes = texte.split('\r\n')
  const index = lignes.findIndex((l) => l.startsWith('SUMMARY:'))
  assert.ok(lignes[index + 1]?.startsWith(' '), 'la continuation doit commencer par une espace')
})

// — En-tête du calendrier —————————————————————————————————————————

verifier('le calendrier porte un nom et un intervalle de rafraîchissement', () => {
  const texte = flux([COURS])
  assert.match(texte, /X-WR-CALNAME:Mon 2e Cerveau/)
  assert.match(texte, /REFRESH-INTERVAL;VALUE=DURATION:PT1H/)
  // iOS ne lit en pratique que celui-ci.
  assert.match(texte, /X-PUBLISHED-TTL:PT1H/)
})

verifier('un flux vide reste un calendrier valide', () => {
  const texte = flux([])
  assert.match(texte, /BEGIN:VCALENDAR/)
  assert.match(texte, /END:VCALENDAR/)
  assert.equal(/VEVENT/.test(texte), false)
})

// — Rapport ———————————————————————————————————————————————————————

for (const c of cas) {
  console.log(`${c.ok ? '  ok  ' : ' ECHEC'}  ${c.nom}${c.detail ? ` — ${c.detail}` : ''}`)
}
console.log('')
console.log(`${passes}/${cas.length} contrôles passés`)
process.exit(passes === cas.length ? 0 : 1)
