/*
 * Contrôles de l'analyseur CSV et des devinettes d'import.
 *
 * C'est de la logique pure : elle se vérifie sans base de données, et c'est
 * exactement ce qui casse en premier sur un export inattendu.
 *
 *   node --experimental-strip-types scripts/verifier-csv.mjs
 */

import {
  analyser,
  devinerSeparateur,
  devinerAssociation,
  devinerFormatDate,
  versJour,
  versPriorite,
  versContexte,
  versStatut,
  preparer,
} from '../src/lib/csv.ts'

let passes = 0
const echecs = []

/** Sérialisation stable : l'ordre des clés d'un objet ne veut rien dire ici. */
function stable(valeur) {
  return JSON.stringify(valeur, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )
}

function verifier(nom, obtenu, attendu) {
  const a = stable(obtenu)
  const b = stable(attendu)
  if (a === b) {
    passes++
    console.log(`  ok    ${nom}`)
  } else {
    echecs.push(nom)
    console.log(` ECHEC  ${nom}`)
    console.log(`        attendu : ${b}`)
    console.log(`        obtenu  : ${a}`)
  }
}

console.log('— Analyse RFC 4180 —')

verifier('champs simples', analyser('a,b,c\n1,2,3', ','), [
  ['a', 'b', 'c'],
  ['1', '2', '3'],
])

verifier(
  'virgule encapsulée dans des guillemets',
  analyser('titre,note\n"Acheter du pain, du lait",urgent', ','),
  [
    ['titre', 'note'],
    ['Acheter du pain, du lait', 'urgent'],
  ],
)

verifier(
  'retour à la ligne encapsulé',
  analyser('titre,note\n"Courses","pain\nlait"', ','),
  [
    ['titre', 'note'],
    ['Courses', 'pain\nlait'],
  ],
)

verifier('guillemets doublés', analyser('a\n"il dit ""bonjour"""', ','), [
  ['a'],
  ['il dit "bonjour"'],
])

verifier('fins de ligne CRLF', analyser('a,b\r\n1,2\r\n', ','), [
  ['a', 'b'],
  ['1', '2'],
])

verifier('lignes vides ignorées', analyser('a,b\n\n1,2\n\n\n', ','), [
  ['a', 'b'],
  ['1', '2'],
])

verifier('BOM retiré', analyser('﻿titre,note\nx,y', ','), [
  ['titre', 'note'],
  ['x', 'y'],
])

verifier('champ vide conservé', analyser('a,b,c\n1,,3', ','), [
  ['a', 'b', 'c'],
  ['1', '', '3'],
])

console.log('\n— Détection du séparateur —')

verifier('point-virgule (export Excel français)', devinerSeparateur('titre;echeance\nCourses;01/08/2026'), ';')
verifier('virgule', devinerSeparateur('title,due\nGroceries,2026-08-01'), ',')
verifier('tabulation', devinerSeparateur('titre\techeance\nCourses\t01/08/2026'), '\t')
verifier(
  'virgules dans un champ ne trompent pas la détection',
  devinerSeparateur('titre;note\n"Pain, lait, beurre";à faire\n"Riz, pâtes";vite'),
  ';',
)

console.log('\n— Association des colonnes —')

verifier(
  'en-têtes français',
  devinerAssociation(['Titre', 'Échéance', 'Priorité', 'Projet', 'Note']),
  { titre: 0, echeance: 1, priorite: 2, projet: 3, note: 4 },
)

verifier(
  'en-têtes Todoist',
  devinerAssociation(['CONTENT', 'DESCRIPTION', 'PRIORITY', 'DATE']),
  { titre: 0, priorite: 2, echeance: 3, note: 1 },
)

verifier(
  'en-têtes Trello',
  devinerAssociation(['Card Name', 'List Name', 'Due Date', 'Labels']),
  { titre: 0, echeance: 2, projet: 1, contexte: 3 },
)

verifier(
  'une colonne n’est jamais associée deux fois',
  devinerAssociation(['Name', 'Task Name']),
  { titre: 0 },
)

console.log('\n— Dates —')

verifier('format belge', versJour('03/04/2026', 'JJ/MM/AAAA'), '2026-04-03')
verifier('format américain', versJour('03/04/2026', 'MM/JJ/AAAA'), '2026-03-04')
verifier('ISO', versJour('2026-04-03', 'AAAA-MM-JJ'), '2026-04-03')
verifier('ISO reconnu quel que soit le format choisi', versJour('2026-04-03', 'JJ/MM/AAAA'), '2026-04-03')
verifier('heure ignorée', versJour('2026-04-03T14:30:00Z', 'AAAA-MM-JJ'), '2026-04-03')
verifier('séparateur point', versJour('03.04.2026', 'JJ/MM/AAAA'), '2026-04-03')
verifier('année sur deux chiffres', versJour('03/04/26', 'JJ/MM/AAAA'), '2026-04-03')
verifier('date impossible rejetée', versJour('31/02/2026', 'JJ/MM/AAAA'), null)
verifier('texte libre rejeté', versJour('la semaine prochaine', 'JJ/MM/AAAA'), null)
verifier('vide rejeté', versJour('   ', 'JJ/MM/AAAA'), null)

verifier(
  'format deviné : un jour > 12 tranche',
  devinerFormatDate(['03/04/2026', '25/12/2026']),
  'JJ/MM/AAAA',
)
verifier(
  'format deviné : américain',
  devinerFormatDate(['03/04/2026', '12/25/2026']),
  'MM/JJ/AAAA',
)
verifier('format deviné : ISO', devinerFormatDate(['2026-04-03']), 'AAAA-MM-JJ')
verifier(
  'sans preuve, on retient la convention belge',
  devinerFormatDate(['03/04/2026', '01/02/2026']),
  'JJ/MM/AAAA',
)

console.log('\n— Valeurs —')

verifier('priorité numérique', versPriorite('1'), 1)
verifier('priorité P2', versPriorite('P2'), 2)
verifier('priorité en toutes lettres', versPriorite('Haute'), 1)
verifier('priorité inconnue', versPriorite('bof'), null)
verifier('contexte pro', versContexte('Travail'), 'pro')
verifier('contexte perso', versContexte('Personnel'), 'perso')
verifier('statut fait', versStatut('Completed'), 'fait')
verifier('statut par défaut', versStatut(''), 'a_faire')

console.log('\n— Préparation —')

const brut = `Titre;Échéance;Priorité;Projet
Appeler le comptable;15/09/2026;1;Administratif
;10/09/2026;2;Administratif
Relire le devis;32/13/2026;3;
Ranger le bureau;;;`

const lignes = analyser(brut, ';')
const association = devinerAssociation(lignes[0])
const prepares = preparer(lignes, association, 'JJ/MM/AAAA', true)

verifier('quatre lignes préparées', prepares.length, 4)
verifier('ligne valide', prepares[0], {
  numero: 2,
  titre: 'Appeler le comptable',
  priorite: 1,
  echeance: '2026-09-15',
  contexte: null,
  projet: 'Administratif',
  statut: 'a_faire',
  note: null,
  erreur: null,
})
verifier('titre vide → erreur signalée', prepares[1].erreur, 'titre vide')
verifier('date impossible → erreur signalée', prepares[2].erreur, 'date illisible : « 32/13/2026 »')
verifier('échéance absente → pas une erreur', prepares[3].erreur, null)
verifier(
  'le numéro de ligne tient compte de l’en-tête',
  prepares.map((l) => l.numero),
  [2, 3, 4, 5],
)

console.log('')
console.log(`${passes}/${passes + echecs.length} contrôles passés`)
if (echecs.length > 0) {
  console.log(`échecs : ${echecs.join(', ')}`)
  process.exit(1)
}
