/*
 * Contrôles de l'analyse et du formatage des montants.
 *
 * Logique pure, donc vérifiable sans base. C'est aussi ce qui casse en premier
 * quand quelqu'un tape « 1 234,56 » au lieu de « 1234.56 ».
 *
 *   node --experimental-strip-types scripts/verifier-argent.mjs
 */

import { versCents, formater, formaterSigne, formaterCompact, moisDe } from '../src/lib/argent.ts'

let passes = 0
const echecs = []

function verifier(nom, obtenu, attendu) {
  // Les espaces d'Intl sont insécables : on normalise avant de comparer.
  const norm = (v) => (typeof v === 'string' ? v.replace(/[\s  ]/g, ' ') : v)
  if (norm(obtenu) === norm(attendu)) {
    passes++
    console.log(`  ok    ${nom}`)
  } else {
    echecs.push(nom)
    console.log(` ECHEC  ${nom}`)
    console.log(`        attendu : ${JSON.stringify(attendu)}`)
    console.log(`        obtenu  : ${JSON.stringify(obtenu)}`)
  }
}

console.log('— Saisie —')
verifier('entier simple', versCents('12'), 1200)
verifier('virgule décimale', versCents('12,34'), 1234)
verifier('point décimal', versCents('12.34'), 1234)
verifier('une seule décimale', versCents('12,5'), 1250)
verifier('séparateur de milliers avec espace', versCents('1 234,56'), 123456)
verifier('séparateur de milliers avec point', versCents('1.234,56'), 123456)
verifier('séparateur de milliers à l’anglaise', versCents('1,234.56'), 123456)
verifier('symbole euro toléré', versCents('12,34 €'), 1234)
verifier('négatif', versCents('-12,34'), -1234)
verifier('vrai signe moins', versCents('−12,34'), -1234)
verifier('signe plus explicite', versCents('+12,34'), 1234)
verifier('zéro', versCents('0'), 0)
verifier('décimales seules', versCents('0,05'), 5)
verifier('vide rejeté', versCents('   '), null)
verifier('texte rejeté', versCents('douze euros'), null)
// « 12,345 » est ambigu : trois décimales mal tapées, ou douze mille ?
// Sur de l'argent, se tromper d'un facteur mille est le pire résultat.
verifier('un seul séparateur suivi de trois chiffres est refusé', versCents('12,345'), null)
verifier('milliers non ambigus acceptés', versCents('1.234.567'), 123456700)
verifier('quatre décimales rejetées', versCents('12,3456'), null)
verifier('séparateur en fin rejeté', versCents('12,'), null)
verifier('grand montant', versCents('1 000 000'), 100000000)

console.log('\n— Affichage —')
verifier('montant positif', formater(123456), '1 234,56 €')
verifier('montant négatif', formater(-1234), '-12,34 €')
verifier('zéro', formater(0), '0,00 €')
verifier('compact sans centimes', formaterCompact(123456), '1 235 €')
verifier('signé positif', formaterSigne(1240), '+12,40 €')
verifier('signé négatif', formaterSigne(-1240), '−12,40 €')
verifier('signé nul', formaterSigne(0), '0,00 €')

console.log('\n— Aller-retour —')
for (const cents of [0, 1, 99, 100, 1234, -1234, 123456789]) {
  const relu = versCents(formater(cents))
  verifier(`${cents} centimes survit à un aller-retour`, relu, cents)
}

console.log('\n— Mois —')
verifier('mois d’un jour', moisDe('2026-08-14'), '2026-08-01')

console.log('')
console.log(`${passes}/${passes + echecs.length} contrôles passés`)
if (echecs.length > 0) process.exit(1)
