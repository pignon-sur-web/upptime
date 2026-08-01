/*
 * Banc d'essai de l'analyseur CSV, sur les cas limites qui cassent un import.
 *
 *   npm run verifier:csv
 *
 * `src/lib/csv.ts` n'importe que des types : après effacement il ne reste
 * aucune dépendance, donc Node peut charger le fichier TypeScript tel quel.
 * Pas d'empaqueteur, pas de cadre de test — les cas listés ici sont ceux qu'on
 * a vraiment rencontrés dans des exports réels.
 */

import { strict as assert } from 'node:assert'
import {
  analyserCSV,
  analyserDate,
  associerEntetes,
  detecterFormatDate,
  detecterSeparateur,
  normaliserPriorite,
  normaliserStatut,
  preparerLignes,
  ressembleAUnEntete,
} from '../src/lib/csv.ts'

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

// — Séparateur ————————————————————————————————————————————————————

verifier('le point-virgule d’un export Excel français est détecté', () => {
  assert.equal(detecterSeparateur('titre;date;projet\nAppeler;03/04/2026;Site'), ';')
})

verifier('une virgule dans un champ cité ne fait pas basculer la détection', () => {
  // Trois points-virgules réels contre une virgule enfermée dans des
  // guillemets : c'est exactement le fichier qui piège un détecteur naïf.
  assert.equal(
    detecterSeparateur('a;b;c;d\n"Appeler Paul, puis Marie";x;y;z'),
    ';',
  )
})

verifier('la tabulation est reconnue', () => {
  assert.equal(detecterSeparateur('titre\tdate\nAppeler\t2026-04-03'), '\t')
})

// — Analyse RFC 4180 ——————————————————————————————————————————————

verifier('un séparateur enfermé dans des guillemets reste dans le champ', () => {
  assert.deepEqual(analyserCSV('"Appeler Paul, puis Marie",1', ','), [
    ['Appeler Paul, puis Marie', '1'],
  ])
})

verifier('les guillemets doublés produisent un guillemet', () => {
  assert.deepEqual(analyserCSV('"Il a dit ""oui""",2', ','), [['Il a dit "oui"', '2']])
})

verifier('un retour à la ligne encapsulé ne coupe pas la ligne', () => {
  assert.deepEqual(analyserCSV('"Première\nSeconde",x', ','), [
    ['Première\nSeconde', 'x'],
  ])
})

verifier('CRLF ne laisse pas de retour chariot collé au dernier champ', () => {
  assert.deepEqual(analyserCSV('a,b\r\nc,d\r\n', ','), [
    ['a', 'b'],
    ['c', 'd'],
  ])
})

verifier('le BOM d’un export Excel ne se colle pas au premier en-tête', () => {
  const [premiere] = analyserCSV('﻿titre,date\nAppeler,2026-04-03', ',')
  assert.equal(premiere[0], 'titre')
})

verifier('les champs vides sont conservés, pas escamotés', () => {
  assert.deepEqual(analyserCSV('a,,c', ','), [['a', '', 'c']])
})

verifier('une ligne vide en fin de fichier n’est pas une ligne de données', () => {
  assert.equal(analyserCSV('a,b\n\n', ',').length, 1)
})

// — Dates —————————————————————————————————————————————————————————

verifier('03/04/2026 en format belge est le 3 avril', () => {
  assert.equal(analyserDate('03/04/2026', 'JJ/MM/AAAA'), '2026-04-03')
})

verifier('03/04/2026 en format américain est le 4 mars', () => {
  assert.equal(analyserDate('03/04/2026', 'MM/JJ/AAAA'), '2026-03-04')
})

verifier('une date ISO est reconnue quel que soit le format choisi', () => {
  assert.equal(analyserDate('2026-04-03', 'JJ/MM/AAAA'), '2026-04-03')
})

verifier('le 31 février est refusé, pas replié sur le 3 mars', () => {
  assert.equal(analyserDate('31/02/2026', 'JJ/MM/AAAA'), null)
})

verifier('une année sur deux chiffres est complétée', () => {
  assert.equal(analyserDate('03/04/26', 'JJ/MM/AAAA'), '2026-04-03')
})

verifier('le point comme séparateur de date passe', () => {
  assert.equal(analyserDate('03.04.2026', 'JJ/MM/AAAA'), '2026-04-03')
})

verifier('du texte n’est pas une date', () => {
  assert.equal(analyserDate('la semaine prochaine', 'JJ/MM/AAAA'), null)
})

verifier('un 25 en tête tranche : c’est un jour, donc format belge', () => {
  assert.equal(detecterFormatDate(['03/04/2026', '25/12/2026']), 'JJ/MM/AAAA')
})

verifier('un 25 en seconde position tranche dans l’autre sens', () => {
  assert.equal(detecterFormatDate(['03/04/2026', '12/25/2026']), 'MM/JJ/AAAA')
})

verifier('sans indice, le défaut reste belge', () => {
  assert.equal(detecterFormatDate(['03/04/2026', '01/02/2026']), 'JJ/MM/AAAA')
})

// — Association des colonnes ——————————————————————————————————————

verifier('les en-têtes anglais de Todoist tombent au bon endroit', () => {
  const a = associerEntetes(['CONTENT', 'PRIORITY', 'DUE DATE', 'PROJECT'])
  assert.equal(a.titre, 0)
  assert.equal(a.priorite, 1)
  assert.equal(a.echeance, 2)
  assert.equal(a.projet, 3)
})

verifier('les accents et la ponctuation n’empêchent pas la correspondance', () => {
  const a = associerEntetes(["Date d'échéance", 'Priorité', 'Tâche'])
  assert.equal(a.echeance, 0)
  assert.equal(a.priorite, 1)
  assert.equal(a.titre, 2)
})

verifier('une même colonne ne peut pas servir deux champs', () => {
  const a = associerEntetes(['Note', 'Notes'])
  assert.notEqual(a.note, null)
  const utilisees = Object.values(a).filter((v) => v !== null)
  assert.equal(new Set(utilisees).size, utilisees.length)
})

verifier('une colonne inconnue est simplement ignorée', () => {
  const a = associerEntetes(['Titre', 'Couleur préférée'])
  assert.equal(a.titre, 0)
  assert.equal(Object.values(a).includes(1), false)
})

// — Normalisation —————————————————————————————————————————————————

verifier('la priorité 1 de Todoist reste la plus haute', () => {
  assert.equal(normaliserPriorite('1'), 1)
  assert.equal(normaliserPriorite('P1'), 1)
  assert.equal(normaliserPriorite('haute'), 1)
})

verifier('une priorité inconnue ne devient pas une valeur inventée', () => {
  assert.equal(normaliserPriorite('rouge vif'), null)
})

verifier('les mille façons d’écrire « fait » sont reconnues', () => {
  for (const v of ['done', 'Terminé', 'TRUE', 'x', 'completed']) {
    assert.equal(normaliserStatut(v), 'fait', v)
  }
})

verifier('un statut inconnu retombe sur « à faire »', () => {
  assert.equal(normaliserStatut('en attente du client'), 'a_faire')
})

// — Préparation ———————————————————————————————————————————————————

const association = {
  titre: 0,
  echeance: 1,
  priorite: 2,
  projet: null,
  contexte: null,
  statut: null,
  note: null,
}

verifier('une ligne sans titre est rejetée avec son numéro de fichier', () => {
  const { retenues, rejetees } = preparerLignes(
    [
      ['Appeler le comptable', '03/04/2026', '1'],
      ['', '04/04/2026', '2'],
    ],
    association,
    'JJ/MM/AAAA',
    true,
  )
  assert.equal(retenues.length, 1)
  assert.equal(rejetees.length, 1)
  // En-tête compris : c'est le numéro qu'on lira dans le tableur.
  assert.equal(rejetees[0].numero, 3)
  assert.match(rejetees[0].motif, /titre/)
})

verifier('une date illisible est un rejet, pas une échéance vide', () => {
  const { retenues, rejetees } = preparerLignes(
    [['Appeler', 'la semaine prochaine', '']],
    association,
    'JJ/MM/AAAA',
    true,
  )
  assert.equal(retenues.length, 0)
  assert.equal(rejetees.length, 1)
  assert.match(rejetees[0].motif, /date illisible/)
})

verifier('une cellule d’échéance vide reste une tâche sans échéance', () => {
  const { retenues, rejetees } = preparerLignes(
    [['Appeler', '', '']],
    association,
    'JJ/MM/AAAA',
    true,
  )
  assert.equal(rejetees.length, 0)
  assert.equal(retenues[0].echeance, null)
})

verifier('une ligne entièrement vide est ignorée sans être comptée en erreur', () => {
  const { retenues, rejetees } = preparerLignes(
    [['Appeler', '', ''], ['', '', '']],
    association,
    'JJ/MM/AAAA',
    true,
  )
  assert.equal(retenues.length, 1)
  assert.equal(rejetees.length, 0)
})

// — En-tête ———————————————————————————————————————————————————————

verifier('une première ligne de libellés est reconnue comme en-tête', () => {
  assert.equal(ressembleAUnEntete(['Titre', 'Échéance', 'Projet']), true)
})

verifier('une première ligne de données ne l’est pas', () => {
  assert.equal(ressembleAUnEntete(['03/04/2026', '12', '7']), false)
})

// — Rapport ———————————————————————————————————————————————————————

for (const c of cas) {
  console.log(`${c.ok ? '  ok  ' : ' ECHEC'}  ${c.nom}${c.detail ? ` — ${c.detail}` : ''}`)
}
console.log('')
console.log(`${passes}/${cas.length} contrôles passés`)
process.exit(passes === cas.length ? 0 : 1)
