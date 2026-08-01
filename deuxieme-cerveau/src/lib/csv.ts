/**
 * Analyseur CSV et association de colonnes, écrits à la main.
 *
 * Une soixantaine de lignes contre une dépendance : l'import doit survivre à
 * n'importe quel export — Todoist, Trello, Asana, Notion, un tableur maison —
 * et ce qui casse un import n'est presque jamais l'analyse, c'est le
 * séparateur et le format de date. Autant maîtriser les deux.
 *
 * Ce module est volontairement pur : aucun accès base, aucun `server-only`.
 * L'assistant d'import s'en sert côté client pour l'aperçu, l'action serveur
 * s'en resert pour recalculer les lignes — le navigateur ne dicte jamais ce
 * qui sera écrit.
 */

// Importations de types uniquement : après effacement, ce module n'a plus
// aucune dépendance à l'exécution. C'est ce qui permet de le passer
// directement au banc d'essai de scripts/verifier-csv.mjs, sans empaqueteur.
import type { Jour } from '@/lib/date'
import type { StatutTache } from '@/lib/enums'

// — Séparateur ————————————————————————————————————————————————————

export const SEPARATEURS = [
  { valeur: ',', libelle: 'Virgule' },
  { valeur: ';', libelle: 'Point-virgule' },
  { valeur: '\t', libelle: 'Tabulation' },
] as const

export type Separateur = (typeof SEPARATEURS)[number]['valeur']

/**
 * Devine le séparateur en comptant les occurrences hors guillemets sur les
 * premières lignes.
 *
 * Le point-virgule mérite une mention : c'est ce qu'Excel produit dans les
 * locales francophones, et c'est la première chose qui casse un import quand
 * l'outil suppose la virgule. Un titre de tâche contenant une virgule suffit
 * ensuite à décaler toutes les colonnes sans message d'erreur.
 */
export function detecterSeparateur(texte: string): Separateur {
  const echantillon = texte.split(/\r?\n/).slice(0, 20).join('\n')

  let meilleur: Separateur = ','
  let record = -1

  for (const { valeur } of SEPARATEURS) {
    let compte = 0
    let dansGuillemets = false
    for (let i = 0; i < echantillon.length; i++) {
      const c = echantillon[i]
      if (c === '"') dansGuillemets = !dansGuillemets
      else if (!dansGuillemets && c === valeur) compte++
    }
    if (compte > record) {
      record = compte
      meilleur = valeur
    }
  }

  return meilleur
}

// — Analyse ———————————————————————————————————————————————————————

/**
 * RFC 4180 : un champ entre guillemets peut contenir le séparateur, un retour
 * à la ligne, et des guillemets doublés. Le reste est littéral.
 *
 * Le parcours est caractère par caractère plutôt qu'un découpage par ligne
 * puis par séparateur : un titre de tâche multiligne exporté depuis Notion
 * casserait immédiatement la version naïve.
 */
export function analyserCSV(texte: string, separateur: Separateur): string[][] {
  // Le BOM d'un export Excel se retrouverait sinon collé au premier en-tête,
  // qui ne correspondrait plus à rien.
  const contenu = texte.replace(/^﻿/, '')

  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let dansGuillemets = false

  const finirChamp = () => {
    ligne.push(champ)
    champ = ''
  }
  const finirLigne = () => {
    finirChamp()
    // Une ligne vide en fin de fichier n'est pas une ligne de données.
    if (ligne.length > 1 || ligne[0] !== '') lignes.push(ligne)
    ligne = []
  }

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i]

    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') {
          champ += '"'
          i++
        } else {
          dansGuillemets = false
        }
      } else {
        champ += c
      }
      continue
    }

    if (c === '"' && champ === '') dansGuillemets = true
    else if (c === separateur) finirChamp()
    else if (c === '\n') finirLigne()
    else if (c === '\r') continue // CRLF : le \n qui suit fait le travail
    else champ += c
  }

  if (champ !== '' || ligne.length > 0) finirLigne()

  return lignes
}

// — Dates —————————————————————————————————————————————————————————

/**
 * Le format est deviné puis reste modifiable, et le défaut est belge.
 *
 * Confondre le 3 avril et le 4 mars sur deux cents lignes est irrattrapable :
 * l'erreur ne se voit pas à l'aperçu, elle se découvre trois semaines plus
 * tard quand une échéance passe au mauvais moment.
 */
export const FORMATS_DATE = [
  { valeur: 'JJ/MM/AAAA', libelle: 'JJ/MM/AAAA — 03/04/2026 = 3 avril' },
  { valeur: 'MM/JJ/AAAA', libelle: 'MM/JJ/AAAA — 03/04/2026 = 4 mars' },
  { valeur: 'AAAA-MM-JJ', libelle: 'AAAA-MM-JJ — format ISO' },
] as const

export type FormatDate = (typeof FORMATS_DATE)[number]['valeur']

const MOTIF_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/
const MOTIF_SEPARE = /^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{2,4})/

function jourValide(a: number, m: number, j: number): Jour | null {
  if (m < 1 || m > 12 || j < 1 || j > 31) return null
  // Le 31 février doit être refusé, pas replié sur le 3 mars. Construire la
  // date puis relire ses composantes est la vérification la plus courte.
  const d = new Date(Date.UTC(a, m - 1, j, 12))
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) {
    return null
  }
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

/**
 * Convertit une cellule en jour, ou renvoie `null` — jamais une date
 * approchée. Une ligne dont la date est illisible part en erreur et se compte
 * dans l'aperçu ; elle n'entre pas dans la base avec une échéance inventée.
 */
export function analyserDate(valeur: string, format: FormatDate): Jour | null {
  const texte = valeur.trim()
  if (!texte) return null

  // Une date ISO est reconnue quel que soit le format choisi : elle n'est
  // jamais ambiguë, et beaucoup d'exports mélangent les deux.
  const iso = MOTIF_ISO.exec(texte)
  if (iso) return jourValide(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const parties = MOTIF_SEPARE.exec(texte)
  if (!parties) return null

  const [, un, deux, trois] = parties
  if (format === 'AAAA-MM-JJ') return jourValide(Number(un), Number(deux), Number(trois))

  const annee = Number(trois) < 100 ? 2000 + Number(trois) : Number(trois)
  return format === 'JJ/MM/AAAA'
    ? jourValide(annee, Number(deux), Number(un))
    : jourValide(annee, Number(un), Number(deux))
}

/**
 * Devine le format sur l'ensemble de la colonne.
 *
 * Une valeur dont le premier nombre dépasse 12 tranche définitivement : elle
 * ne peut être qu'un jour. Sans indice, on garde le format belge — l'utilisateur
 * est en Belgique, et le menu reste là pour le contredire.
 */
export function detecterFormatDate(valeurs: readonly string[]): FormatDate {
  let iso = 0
  let jourEnTete = 0
  let moisEnTete = 0

  for (const brut of valeurs) {
    const texte = brut.trim()
    if (!texte) continue
    if (MOTIF_ISO.test(texte)) {
      iso++
      continue
    }
    const parties = MOTIF_SEPARE.exec(texte)
    if (!parties) continue
    const un = Number(parties[1])
    const deux = Number(parties[2])
    if (un > 12) jourEnTete++
    else if (deux > 12) moisEnTete++
  }

  if (iso > jourEnTete + moisEnTete) return 'AAAA-MM-JJ'
  if (moisEnTete > jourEnTete) return 'MM/JJ/AAAA'
  return 'JJ/MM/AAAA'
}

// — Champs de l'application ————————————————————————————————————————

export const CHAMPS_IMPORT = [
  { cle: 'titre', libelle: 'Titre', obligatoire: true },
  { cle: 'echeance', libelle: 'Échéance', obligatoire: false },
  { cle: 'priorite', libelle: 'Priorité', obligatoire: false },
  { cle: 'projet', libelle: 'Projet', obligatoire: false },
  { cle: 'contexte', libelle: 'Contexte', obligatoire: false },
  { cle: 'statut', libelle: 'Statut', obligatoire: false },
  { cle: 'note', libelle: 'Note', obligatoire: false },
] as const

export type ChampImport = (typeof CHAMPS_IMPORT)[number]['cle']

/** Association champ → index de colonne, `null` quand le champ est ignoré. */
export type Association = Record<ChampImport, number | null>

/**
 * En-têtes connus des exports courants. La correspondance est approximative :
 * on compare sans accent, sans casse et sans ponctuation, et un en-tête qui
 * contient le mot suffit — « Due Date » et « date d'échéance » tombent tous
 * les deux sur `echeance`.
 */
const SYNONYMES: Record<ChampImport, readonly string[]> = {
  titre: ['titre', 'title', 'tache', 'task', 'name', 'nom', 'content', 'subject', 'sujet'],
  echeance: ['echeance', 'due', 'duedate', 'deadline', 'date', 'dateecheance', 'when'],
  priorite: ['priorite', 'priority', 'prio', 'importance'],
  projet: ['projet', 'project', 'liste', 'list', 'board', 'tableau', 'categorie'],
  contexte: ['contexte', 'context', 'etiquette', 'label', 'labels', 'tag', 'tags', 'type'],
  statut: ['statut', 'status', 'etat', 'state', 'done', 'termine', 'complete', 'completed'],
  note: ['note', 'notes', 'description', 'detail', 'details', 'commentaire', 'comment'],
}

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Pré-remplit l'association à partir des en-têtes détectés.
 *
 * Une colonne déjà prise ne peut pas servir deux fois : sans ça, un export où
 * « Notes » et « Note » coexistent verrait la même colonne associée deux fois
 * et une autre restée orpheline.
 */
export function associerEntetes(entetes: readonly string[]): Association {
  const normalises = entetes.map(normaliser)
  const prises = new Set<number>()
  const association = {} as Association

  for (const { cle } of CHAMPS_IMPORT) {
    const synonymes = SYNONYMES[cle]

    // Égalité exacte d'abord : elle vaut mieux qu'une inclusion fortuite.
    let index = normalises.findIndex(
      (entete, i) => !prises.has(i) && synonymes.includes(entete),
    )
    if (index === -1) {
      index = normalises.findIndex(
        (entete, i) =>
          !prises.has(i) &&
          entete.length > 2 &&
          synonymes.some((s) => entete.includes(s) || s.includes(entete)),
      )
    }

    association[cle] = index === -1 ? null : index
    if (index !== -1) prises.add(index)
  }

  return association
}

// — Normalisation des valeurs ——————————————————————————————————————

/**
 * Les priorités des autres outils ne sont pas les nôtres. Todoist numérote de
 * 4 (urgent) à 1 (aucune), c'est-à-dire à l'envers ; ailleurs c'est du texte.
 * Ce qui n'est pas reconnu devient « aucune » plutôt qu'une valeur inventée.
 */
export function normaliserPriorite(valeur: string): number | null {
  const texte = normaliser(valeur)
  if (!texte) return null

  if (/^(1|p1|haute|high|urgent|urgente|elevee)$/.test(texte)) return 1
  if (/^(2|p2|moyenne|medium|normale|normal|important|importante)$/.test(texte)) return 2
  if (/^(3|p3|basse|low|faible|secondaire)$/.test(texte)) return 3
  if (/^(4|p4|aucune|none|nulle)$/.test(texte)) return 0
  return null
}

export function normaliserStatut(valeur: string): StatutTache {
  const texte = normaliser(valeur)
  if (/^(fait|done|termine|terminee|complete|completed|closed|true|oui|yes|x|1)$/.test(texte)) {
    return 'fait'
  }
  if (/^(encours|inprogress|doing|started|commence)$/.test(texte)) return 'en_cours'
  if (/^(annule|annulee|cancelled|canceled|abandonne)$/.test(texte)) return 'annule'
  return 'a_faire'
}

export function normaliserContexte(valeur: string): string | null {
  const texte = normaliser(valeur)
  if (/pro|work|boulot|travail|bureau/.test(texte)) return 'pro'
  if (/perso|personal|prive|maison|home/.test(texte)) return 'perso'
  return null
}

// — Lignes prêtes à écrire ————————————————————————————————————————

export type LigneImport = {
  titre: string
  priorite: number | null
  echeance: Jour | null
  contexte: string | null
  projet: string | null
  statut: StatutTache
  note: string | null
}

export type LigneRejetee = { numero: number; motif: string }

export type Preparation = {
  retenues: LigneImport[]
  rejetees: LigneRejetee[]
}

/**
 * Transforme les cellules en lignes prêtes pour la base.
 *
 * Une ligne sans titre est rejetée avec son numéro : c'est la seule donnée
 * obligatoire, et une tâche sans titre n'est rien. Une date illisible est
 * également un rejet et non une échéance vide — importer silencieusement deux
 * cents tâches sans échéance serait pire que de le dire.
 */
export function preparerLignes(
  lignes: readonly (readonly string[])[],
  association: Association,
  format: FormatDate,
  avecEntete: boolean,
): Preparation {
  const retenues: LigneImport[] = []
  const rejetees: LigneRejetee[] = []

  const cellule = (ligne: readonly string[], champ: ChampImport): string => {
    const index = association[champ]
    if (index === null) return ''
    return (ligne[index] ?? '').trim()
  }

  lignes.forEach((ligne, i) => {
    // Le numéro affiché est celui du fichier, en-tête compris : c'est celui
    // que l'utilisateur lira dans son tableur pour aller corriger.
    const numero = i + 1 + (avecEntete ? 1 : 0)

    if (ligne.every((c) => c.trim() === '')) return

    const titre = cellule(ligne, 'titre')
    if (!titre) {
      rejetees.push({ numero, motif: 'titre vide' })
      return
    }

    const brutEcheance = cellule(ligne, 'echeance')
    const echeance = brutEcheance ? analyserDate(brutEcheance, format) : null
    if (brutEcheance && echeance === null) {
      rejetees.push({ numero, motif: `date illisible : « ${brutEcheance} »` })
      return
    }

    const projet = cellule(ligne, 'projet')
    const note = cellule(ligne, 'note')

    retenues.push({
      titre,
      priorite: normaliserPriorite(cellule(ligne, 'priorite')),
      echeance,
      contexte: normaliserContexte(cellule(ligne, 'contexte')),
      projet: projet || null,
      statut: normaliserStatut(cellule(ligne, 'statut')),
      note: note || null,
    })
  })

  return { retenues, rejetees }
}

/** Vrai si la première ligne ressemble à des en-têtes plutôt qu'à des données. */
export function ressembleAUnEntete(premiere: readonly string[]): boolean {
  if (premiere.length < 2) return false
  const nonVides = premiere.filter((c) => c.trim() !== '')
  if (nonVides.length === 0) return false
  // Un en-tête ne contient ni date ni nombre seul.
  return nonVides.every((c) => !/^\d+([/.\-]\d+)*$/.test(c.trim()))
}
