/*
 * Le fuseau, à l'heure où il casse.
 *
 *   npm run verifier:fuseau
 *
 * Vercel et Supabase tournent en UTC, l'utilisateur vit en Europe/Brussels.
 * Entre minuit et 2h du matin, UTC est encore la veille : une habitude cochée
 * à 00h30 serait enregistrée sur le mauvais jour et la série casserait au
 * réveil. C'est le défaut qui tue la promesse de l'application, et il ne se
 * voit jamais en journée — d'où ce banc d'essai, qui interroge les vraies
 * fonctions à des instants choisis plutôt qu'à l'heure qu'il est.
 *
 * `src/lib/date.ts` n'importe rien : après effacement des types, Node charge
 * le fichier TypeScript tel quel.
 */

import { strict as assert } from 'node:assert'
import {
  debutDeSemaine,
  decaler,
  ecartJours,
  heure,
  instantDepuisLocal,
  jourDe,
  jourSemaineISO,
  joursDuMois,
  localDepuisInstant,
} from '../src/lib/date.ts'

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

// — L'heure qui casse tout ————————————————————————————————————————

verifier('cocher à 23h55 heure belge (été) enregistre le jour même', () => {
  // 2026-08-02 23:55 à Bruxelles = 21:55 UTC le même jour.
  assert.equal(jourDe('2026-08-02T21:55:00Z'), '2026-08-02')
})

verifier('cocher à 00h30 heure belge (été) enregistre le jour qui commence', () => {
  // 2026-08-03 00:30 à Bruxelles = 2026-08-02 22:30 UTC — UTC est encore hier.
  // C'est précisément le cas où une application naïve écrit la veille.
  assert.equal(jourDe('2026-08-02T22:30:00Z'), '2026-08-03')
})

verifier('cocher à 00h30 heure belge (hiver) enregistre le jour qui commence', () => {
  // En janvier le décalage n'est que d'une heure : 23:30 UTC.
  assert.equal(jourDe('2026-01-14T23:30:00Z'), '2026-01-15')
})

verifier('à 23h00 UTC en été, la Belgique est déjà au lendemain', () => {
  assert.equal(jourDe('2026-08-02T23:00:00Z'), '2026-08-03')
})

verifier('à 12h00 UTC, aucune ambiguïté', () => {
  assert.equal(jourDe('2026-08-02T12:00:00Z'), '2026-08-02')
})

verifier('le 31 décembre à 23h30 belge est encore le 31 décembre', () => {
  // En hiver, la Belgique est à UTC+1 : 22h30 UTC vaut 23h30 chez nous.
  assert.equal(jourDe('2025-12-31T22:30:00Z'), '2025-12-31')
})

verifier('le 1er janvier à 00h30 belge a bien changé d’année', () => {
  // 23h30 UTC le 31 : UTC est encore en 2025, la Belgique est en 2026.
  // Un journal daté depuis UTC ouvrirait l'année sur une entrée de la veille.
  assert.equal(jourDe('2025-12-31T23:30:00Z'), '2026-01-01')
})

// — Heures affichées ——————————————————————————————————————————————

verifier('minuit et demi s’affiche 00:30 et non 24:30', () => {
  assert.equal(heure('2026-08-02T22:30:00Z'), '00:30')
})

verifier('une heure d’été est décalée de deux heures depuis UTC', () => {
  assert.equal(heure('2026-08-02T12:30:00Z'), '14:30')
})

verifier('une heure d’hiver est décalée d’une heure', () => {
  assert.equal(heure('2026-01-15T13:30:00Z'), '14:30')
})

// — Saisie d'un rendez-vous ———————————————————————————————————————

verifier('14h30 saisi en été est stocké à 12h30 UTC', () => {
  assert.equal(instantDepuisLocal('2026-08-01T14:30'), '2026-08-01T12:30:00.000Z')
})

verifier('14h30 saisi en hiver est stocké à 13h30 UTC', () => {
  assert.equal(instantDepuisLocal('2026-01-15T14:30'), '2026-01-15T13:30:00.000Z')
})

verifier('un rendez-vous à 00h30 ne recule pas d’un jour', () => {
  assert.equal(instantDepuisLocal('2026-01-01T00:30'), '2025-12-31T23:30:00.000Z')
})

verifier('aller-retour stable au passage à l’heure d’été', () => {
  // Le 29 mars 2026 à 02h00, la Belgique passe à 03h00.
  const local = '2026-03-29T03:30'
  assert.equal(localDepuisInstant(instantDepuisLocal(local)), local)
})

verifier('aller-retour stable au passage à l’heure d’hiver', () => {
  // Le 25 octobre 2026, 02h00 revient à 03h00 : l'heure existe deux fois.
  const local = '2026-10-25T02:30'
  assert.equal(localDepuisInstant(instantDepuisLocal(local)), local)
})

verifier('aller-retour stable en plein été et en plein hiver', () => {
  for (const local of ['2026-07-14T09:15', '2026-02-03T18:45', '2026-12-25T00:00']) {
    assert.equal(localDepuisInstant(instantDepuisLocal(local)), local, local)
  }
})

// — Arithmétique des jours ————————————————————————————————————————

verifier('décaler d’un jour traverse le passage à l’heure d’été', () => {
  assert.equal(decaler('2026-03-28', 1), '2026-03-29')
  assert.equal(decaler('2026-03-29', 1), '2026-03-30')
})

verifier('décaler traverse un changement de mois et d’année', () => {
  assert.equal(decaler('2026-01-31', 1), '2026-02-01')
  assert.equal(decaler('2025-12-31', 1), '2026-01-01')
  assert.equal(decaler('2026-03-01', -1), '2026-02-28')
})

verifier('l’écart en jours ignore le changement d’heure', () => {
  // Une semaine reste sept jours même si elle ne fait que 167 heures.
  assert.equal(ecartJours('2026-03-25', '2026-04-01'), 7)
  assert.equal(ecartJours('2026-10-22', '2026-10-29'), 7)
})

verifier('le jour de semaine ISO place lundi à 1 et dimanche à 7', () => {
  assert.equal(jourSemaineISO('2026-08-03'), 1) // lundi
  assert.equal(jourSemaineISO('2026-08-02'), 7) // dimanche
})

verifier('la semaine commence le lundi, y compris depuis un dimanche', () => {
  assert.equal(debutDeSemaine('2026-08-02'), '2026-07-27')
  assert.equal(debutDeSemaine('2026-08-03'), '2026-08-03')
})

verifier('un mois de février bissextile compte 29 jours', () => {
  assert.equal(joursDuMois('2028-02-10').length, 29)
  assert.equal(joursDuMois('2026-02-10').length, 28)
})

// — Rapport ———————————————————————————————————————————————————————

for (const c of cas) {
  console.log(`${c.ok ? '  ok  ' : ' ECHEC'}  ${c.nom}${c.detail ? ` — ${c.detail}` : ''}`)
}
console.log('')
console.log(`${passes}/${cas.length} contrôles passés`)
process.exit(passes === cas.length ? 0 : 1)
