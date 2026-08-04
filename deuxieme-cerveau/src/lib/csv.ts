/**
 * Analyseur CSV et devinettes d'association de colonnes.
 *
 * Écrit à la main plutôt qu'emprunté à une dépendance : le format est petit,
 * les cas limites tiennent en trente lignes, et l'import doit surtout être
 * lisible et modifiable quand un export inattendu casse.
 *
 * Aucune de ces fonctions ne touche à la base ; elles tournent aussi bien côté
 * serveur que côté client, ce qui permet de montrer un aperçu sans rien écrire.
 */

/** Le séparateur dépend du tableur d'origine : Excel français produit du `;`. */
export type Separateur = ',' | ';' | '\t'

/**
 * Devine le séparateur en comptant les occurrences hors guillemets sur les
 * premières lignes. Compter naïvement sur tout le fichier se ferait piéger par
 * un champ de note contenant des virgules.
 */
export function devinerSeparateur(texte: string): Separateur {
  const candidats: Separateur[] = [';', ',', '\t']
  const echantillon = texte.slice(0, 8000)

  let meilleur: Separateur = ','
  let meilleurScore = -1

  for (const candidat of candidats) {
    const lignes = analyser(echantillon, candidat).slice(0, 10)
    if (lignes.length < 2) continue

    const largeurs = lignes.map((l) => l.length)
    const premiere = largeurs[0] ?? 0
    if (premiere < 2) continue

    // Un bon séparateur donne des lignes de largeur constante.
    const regulier = largeurs.every((l) => l === premiere)
    const score = premiere * (regulier ? 10 : 1)

    if (score > meilleurScore) {
      meilleurScore = score
      meilleur = candidat
    }
  }

  return meilleur
}

/**
 * Analyse RFC 4180.
 *
 * Gère les guillemets, les séparateurs et les retours à la ligne encapsulés,
 * les guillemets doublés à l'intérieur d'un champ, ainsi que les fins de ligne
 * CRLF et LF. Renvoie un tableau de lignes, chaque ligne étant un tableau de
 * champs bruts.
 */
export function analyser(texte: string, separateur: Separateur): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let dansGuillemets = false
  let i = 0

  // Retirer le BOM que produisent les exports Excel : sans ça, le premier
  // en-tête ne correspond jamais à rien.
  const contenu = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte

  const finirChamp = () => {
    ligne.push(champ)
    champ = ''
  }
  const finirLigne = () => {
    finirChamp()
    // Ignorer les lignes entièrement vides, fréquentes en fin de fichier.
    if (ligne.some((c) => c.trim() !== '')) lignes.push(ligne)
    ligne = []
  }

  while (i < contenu.length) {
    const c = contenu[i]!

    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') {
          champ += '"'
          i += 2
          continue
        }
        dansGuillemets = false
        i++
        continue
      }
      champ += c
      i++
      continue
    }

    if (c === '"' && champ === '') {
      dansGuillemets = true
      i++
      continue
    }
    if (c === separateur) {
      finirChamp()
      i++
      continue
    }
    if (c === '\r') {
      if (contenu[i + 1] === '\n') i++
      finirLigne()
      i++
      continue
    }
    if (c === '\n') {
      finirLigne()
      i++
      continue
    }

    champ += c
    i++
  }

  if (champ !== '' || ligne.length > 0) finirLigne()

  return lignes
}

// — Association des colonnes ————————————————————————————————————

export type ChampCible =
  | 'titre'
  | 'priorite'
  | 'echeance'
  | 'contexte'
  | 'projet'
  | 'statut'
  | 'note'

export const CHAMPS_CIBLES: { cle: ChampCible; nom: string; requis: boolean }[] = [
  { cle: 'titre', nom: 'Titre', requis: true },
  { cle: 'echeance', nom: 'Échéance', requis: false },
  { cle: 'priorite', nom: 'Priorité', requis: false },
  { cle: 'projet', nom: 'Projet', requis: false },
  { cle: 'contexte', nom: 'Contexte', requis: false },
  { cle: 'statut', nom: 'Statut', requis: false },
  { cle: 'note', nom: 'Note', requis: false },
]

/**
 * En-têtes connus des exports courants. La correspondance est approximative :
 * on normalise (minuscules, sans accents, sans ponctuation) puis on cherche
 * une inclusion, ce qui absorbe les variantes du genre « Due Date » / « due ».
 */
const INDICES: Record<ChampCible, string[]> = {
  titre: ['titre', 'title', 'name', 'nom', 'task', 'tache', 'content', 'subject', 'summary'],
  echeance: ['echeance', 'due', 'duedate', 'deadline', 'date', 'when', 'dateecheance'],
  priorite: ['priorite', 'priority', 'importance', 'p'],
  projet: ['projet', 'project', 'list', 'liste', 'board', 'tableau', 'categorie', 'category'],
  contexte: ['contexte', 'context', 'tag', 'tags', 'label', 'labels', 'etiquette'],
  statut: ['statut', 'status', 'state', 'etat', 'done', 'completed', 'termine'],
  note: ['note', 'notes', 'description', 'comment', 'commentaire', 'details', 'body'],
}

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Propose une association colonne → champ, à partir des en-têtes.
 *
 * Une correspondance exacte l'emporte sur une inclusion, et chaque colonne
 * n'est proposée qu'une fois : sans ça, « date » et « date de création »
 * réclameraient tous deux l'échéance.
 */
export function devinerAssociation(entetes: string[]): Partial<Record<ChampCible, number>> {
  const association: Partial<Record<ChampCible, number>> = {}
  const prises = new Set<number>()
  const normalises = entetes.map(normaliser)

  for (const { cle } of CHAMPS_CIBLES) {
    const indices = INDICES[cle]

    let trouve = normalises.findIndex(
      (entete, i) => !prises.has(i) && indices.includes(entete),
    )
    if (trouve === -1) {
      trouve = normalises.findIndex(
        (entete, i) =>
          !prises.has(i) && entete.length > 2 && indices.some((ind) => entete.includes(ind)),
      )
    }

    if (trouve !== -1) {
      association[cle] = trouve
      prises.add(trouve)
    }
  }

  return association
}

// — Dates ————————————————————————————————————————————————————————

export type FormatDate = 'JJ/MM/AAAA' | 'MM/JJ/AAAA' | 'AAAA-MM-JJ'

/**
 * Convertit une date de CSV en `AAAA-MM-JJ`, ou `null` si elle est
 * inexploitable.
 *
 * Le format est demandé et non deviné ligne par ligne : `03/04/2026` est
 * valide dans les deux sens, et se tromper sur deux cents lignes n'est pas
 * rattrapable. La devinette ne sert qu'à préremplir le choix.
 */
export function versJour(brut: string, format: FormatDate): string | null {
  const texte = brut.trim()
  if (!texte) return null

  // Les exports portent souvent une heure : on ne garde que la partie date.
  const partie = texte.split(/[T ]/)[0] ?? texte

  const iso = partie.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return valider(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const separe = partie.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (separe) {
    const a = Number(separe[1])
    const b = Number(separe[2])
    let annee = Number(separe[3])
    if (annee < 100) annee += 2000

    return format === 'MM/JJ/AAAA' ? valider(annee, a, b) : valider(annee, b, a)
  }

  return null
}

function valider(annee: number, mois: number, jour: number): string | null {
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null
  const date = new Date(Date.UTC(annee, mois - 1, jour, 12))
  // Rejette le 31 février : Date le décalerait en mars sans rien signaler.
  if (date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) return null
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
}

/** Devine le format en cherchant une valeur qui tranche (un jour > 12). */
export function devinerFormatDate(valeurs: string[]): FormatDate {
  let iso = 0
  for (const brut of valeurs) {
    const partie = brut.trim().split(/[T ]/)[0] ?? ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(partie)) iso++

    const separe = partie.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{2,4}$/)
    if (separe) {
      const a = Number(separe[1])
      const b = Number(separe[2])
      // Un premier nombre supérieur à 12 ne peut être qu'un jour, et
      // inversement : c'est la seule preuve disponible.
      if (a > 12) return 'JJ/MM/AAAA'
      if (b > 12) return 'MM/JJ/AAAA'
    }
  }

  if (iso > 0) return 'AAAA-MM-JJ'
  // Sans preuve, on prend la convention belge plutôt que l'américaine.
  return 'JJ/MM/AAAA'
}

// — Valeurs ————————————————————————————————————————————————————————

/** Priorité : accepte 1/2/3, P1/P2/P3, haute/moyenne/basse et leurs variantes. */
export function versPriorite(brut: string): number | null {
  const texte = normaliser(brut)
  if (!texte) return null

  if (/^p?1$/.test(texte) || ['haute', 'high', 'urgent', 'urgente'].includes(texte)) return 1
  if (/^p?2$/.test(texte) || ['moyenne', 'medium', 'normal', 'normale', 'important'].includes(texte)) return 2
  if (/^p?3$/.test(texte) || ['basse', 'low', 'faible', 'secondaire'].includes(texte)) return 3

  return null
}

export function versContexte(brut: string): 'pro' | 'perso' | null {
  const texte = normaliser(brut)
  if (['pro', 'travail', 'work', 'boulot', 'business'].some((m) => texte.includes(m))) return 'pro'
  if (['perso', 'personal', 'personnel', 'prive', 'home', 'maison'].some((m) => texte.includes(m))) return 'perso'
  return null
}

/** Statut : tout ce qui ressemble à « fait » devient fait, le reste est à faire. */
export function versStatut(brut: string): 'a_faire' | 'fait' {
  const texte = normaliser(brut)
  const faits = ['fait', 'done', 'complete', 'completed', 'termine', 'closed', 'true', 'oui', 'yes', 'x', '1']
  return faits.includes(texte) ? 'fait' : 'a_faire'
}

// — Assemblage ————————————————————————————————————————————————————

export type LigneImport = {
  numero: number
  titre: string
  priorite: number | null
  echeance: string | null
  contexte: 'pro' | 'perso' | null
  projet: string | null
  statut: 'a_faire' | 'fait'
  note: string | null
  /** Renseigné quand la ligne ne peut pas être importée. */
  erreur: string | null
}

/**
 * Transforme les lignes brutes en lignes prêtes à insérer, sans rien écrire.
 *
 * Les lignes fautives ne sont pas jetées mais marquées : l'aperçu doit dire
 * combien de lignes seront ignorées et pourquoi, avant qu'on décide d'importer.
 */
export function preparer(
  lignes: string[][],
  association: Partial<Record<ChampCible, number>>,
  formatDate: FormatDate,
  avecEntete: boolean,
): LigneImport[] {
  const donnees = avecEntete ? lignes.slice(1) : lignes

  return donnees.map((colonnes, index) => {
    const lire = (cle: ChampCible): string => {
      const position = association[cle]
      if (position === undefined) return ''
      return (colonnes[position] ?? '').trim()
    }

    const titre = lire('titre')
    const echeanceBrute = lire('echeance')
    const echeance = echeanceBrute ? versJour(echeanceBrute, formatDate) : null

    let erreur: string | null = null
    if (!titre) erreur = 'titre vide'
    else if (echeanceBrute && echeance === null) erreur = `date illisible : « ${echeanceBrute} »`

    return {
      numero: index + (avecEntete ? 2 : 1),
      titre,
      priorite: versPriorite(lire('priorite')),
      echeance,
      contexte: versContexte(lire('contexte')),
      projet: lire('projet') || null,
      statut: versStatut(lire('statut')),
      note: lire('note') || null,
      erreur,
    }
  })
}
