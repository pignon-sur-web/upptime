/*
 * Les parcours réels, au navigateur, contre une vraie base.
 *
 *   npm start &                       # serveur avec .env.local renseigné
 *   npm run verifier:application
 *
 * `verifier:parcours` couvre la porte d'entrée et la direction artistique sans
 * jamais écrire une ligne. Celui-ci fait l'inverse : il joue les six gestes qui
 * décident si l'application sert à quelque chose — cocher une habitude, créer
 * et reporter une tâche, importer un CSV puis l'annuler, rapprocher un solde,
 * faire un virement, mesurer un objectif décroissant.
 *
 * Il ÉCRIT dans la base pointée par .env.local, puis efface ce qu'il a créé.
 * Tout porte le préfixe « ZZ-test » pour que le nettoyage soit sans ambiguïté
 * et qu'un reste éventuel se repère au premier coup d'œil.
 */

import { chromium } from 'playwright'
import { envLocal } from './env-local.mjs'

const env = envLocal()
const BASE = env.BASE_URL ?? 'http://localhost:3000'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const MOT_DE_PASSE = env.APP_PASSWORD
const MARQUE = 'ZZ-test'

const resultats = []
const verifier = (nom, ok, detail = '') => {
  resultats.push({ nom, ok, detail })
  console.log(`${ok ? '  ok  ' : ' ECHEC'}  ${nom}${detail ? ` — ${detail}` : ''}`)
}

/** Le jour belge, calculé comme l'application le fait. */
const formatteur = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const aujourdhui = () => formatteur.format(new Date())
const decaler = (jour, n) => {
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j, 12))
  d.setUTCDate(d.getUTCDate() + n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const navigateur = await chromium.launch({ executablePath: CHROME })
const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
const page = await contexte.newPage()

// Une erreur serveur ne doit jamais passer pour un simple écran vide.
const erreursServeur = []
page.on('response', (r) => {
  if (r.status() >= 500) erreursServeur.push(`${r.status()} ${new URL(r.url()).pathname}`)
})

/**
 * Aller sur un écran, et laisser React s'hydrater avant d'y toucher.
 *
 * Plusieurs formulaires passent par une fonction client qui appelle ensuite
 * une Server Action : contrairement à un `<form action={serverAction}>`, ils
 * n'ont pas d'amélioration progressive et un clic parti avant l'hydratation
 * est simplement perdu. Sans cette pause, le test échoue une fois sur trois —
 * et pas sur un défaut de l'application.
 */
const aller = async (chemin) => {
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
}

// — Connexion —————————————————————————————————————————————————————

await aller('/connexion')
await page.fill('#motDePasse', MOT_DE_PASSE)
await page.click('button[type=submit]')
await page.waitForURL(`${BASE}/`, { timeout: 15000 })
verifier('connexion réussie', new URL(page.url()).pathname === '/')

// — Habitudes ————————————————————————————————————————————————————

{
  await aller('/habitudes/reglages')
  await page.fill('input[name=nom]', `${MARQUE} habitude`)
  await page.click('form:has(input[name=nom]) button[type=submit]')
  // Attendre l'effet, pas un délai — et attendre l'habitude elle-même plutôt
  // qu'un compteur : la base peut déjà en contenir d'autres.
  await page.waitForSelector(`text=${MARQUE} habitude`, { timeout: 15000 })

  await aller('/habitudes')
  const avant = (await page.textContent('body')) ?? ''
  verifier(
    "l'habitude créée apparaît dans la journée",
    avant.includes(`${MARQUE} habitude`),
  )

  // Le compteur AVANT. On mesure une variation plutôt qu'une valeur absolue :
  // la base peut déjà contenir de vraies habitudes, et un test qui exige
  // « 1/1 » n'échouerait qu'à cause de ça.
  const compteur = (corps) => {
    const trouve = /(\d+)\/(\d+)/.exec(corps)
    return trouve ? { coches: Number(trouve[1]), total: Number(trouve[2]) } : null
  }
  const compteurAvant = compteur(avant)

  await page.click(`[role=checkbox][aria-label="${MARQUE} habitude"]`)
  await page.waitForTimeout(1500)
  await aller('/habitudes')

  const coche = await page.getAttribute(
    `[role=checkbox][aria-label="${MARQUE} habitude"]`,
    'aria-checked',
  )
  verifier('cocher une habitude tient au rechargement', coche === 'true')

  // Le cochage part sur la journée belge : le compteur du jour gagne un cran.
  // S'il était parti sur hier ou demain, il n'aurait pas bougé.
  const compteurApres = compteur((await page.textContent('body')) ?? '')
  verifier(
    'le score du jour gagne un cran — donc la bonne journée',
    // Seul le numérateur est affirmé : le dénominateur bouge forcément, on
    // vient d'ajouter une habitude au programme du jour.
    compteurAvant !== null &&
      compteurApres !== null &&
      compteurApres.coches === compteurAvant.coches + 1,
    `${compteurAvant?.coches}/${compteurAvant?.total} → ${compteurApres?.coches}/${compteurApres?.total}`,
  )

  await aller('/')
  verifier(
    'le mur du mois est rendu',
    (await page.locator('svg[aria-label*="une case par jour"]').count()) > 0,
  )
}

// — Tâches : report en un tap ————————————————————————————————————

{
  await aller('/taches/nouvelle')
  await page.fill('input[name=titre]', `${MARQUE} tâche`)
  await page.fill('input[name=echeance]', aujourdhui())
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/taches`, { timeout: 15000 })

  const liste = (await page.textContent('body')) ?? ''
  verifier("la tâche du jour apparaît dans Aujourd'hui", liste.includes(`${MARQUE} tâche`))

  await page.click(`button[aria-label="Reporter à demain : ${MARQUE} tâche"]`)
  await page.waitForTimeout(1500)

  await aller('/taches')
  const apresReport = (await page.textContent('body')) ?? ''
  verifier(
    'reportée, la tâche quitte la liste du jour',
    !apresReport.includes(`${MARQUE} tâche`),
  )

  await aller('/taches?vue=semaine')
  const semaine = (await page.textContent('body')) ?? ''
  verifier(
    'reportée, elle réapparaît dans les sept prochains jours',
    semaine.includes(`${MARQUE} tâche`),
  )
}

// — Tâches : une tâche sans échéance doit se voir quelque part ——————
//
// Le cas manquait, et c'est exactement celui qui a cassé : le parcours
// ci-dessus remplissait toujours la date. Or `due_date <= aujourd'hui` ne
// ramène pas les lignes à `null` — en SQL, comparer à `null` donne inconnu,
// pas faux. Une tâche notée sans date était donc bien enregistrée et
// invisible partout, ce qui se lit comme « la création ne marche pas ».

{
  await aller('/taches/nouvelle')
  await page.fill('input[name=titre]', `${MARQUE} sans date`)
  // Pas de `echeance` : c'est tout l'objet du contrôle.
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/taches`, { timeout: 15000 })

  const surTaches = (await page.textContent('body')) ?? ''
  verifier(
    'une tâche sans échéance apparaît sur l’écran Tâches',
    surTaches.includes(`${MARQUE} sans date`),
  )

  // Sur le tableau de bord on vérifie la SECTION, pas cette tâche-ci : le
  // widget n'en montre que cinq et renvoie le reste sur l'écran Tâches.
  // Assurer la présence du titre exact rendrait le contrôle dépendant du
  // nombre de tâches sans date déjà en base, donc vert ou rouge selon
  // l'humeur du moment.
  await aller('/')
  const surAccueil = (await page.textContent('body')) ?? ''
  verifier(
    'le tableau de bord montre les tâches sans date',
    surAccueil.includes('Sans date'),
  )

  // Et elle ne doit pas être comptée comme un retard : elle n'a pas de date
  // à dépasser.
  verifier(
    'une tâche sans échéance n’est pas comptée en retard',
    !/sans date[\s\S]{0,80}en retard/.test(surTaches),
  )
}

// — Tâches : récurrence mensuelle née le 31 ——————————————————————

{
  // Une échéance au 31 d'un mois passé : la complétion doit produire la
  // prochaine occurrence un 31, pas un 28 ni un 30.
  await aller('/taches/nouvelle')
  await page.fill('input[name=titre]', `${MARQUE} loyer`)
  await page.fill('input[name=echeance]', '2026-01-31')
  await page.selectOption('select[name=recurrence]', 'P1M')
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/taches`, { timeout: 15000 })

  await aller('/taches?vue=toutes')
  await page.click(`text=${MARQUE} loyer`)
  await page.waitForLoadState('networkidle')
  await page.click('text=Marquer comme faite')
  await page.waitForTimeout(2000)

  await aller('/taches?vue=toutes&statut=toutes')
  // On compte les lignes de la liste, pas les occurrences de la chaîne dans le
  // texte de la page : les libellés d'accessibilité reprennent le titre, et un
  // comptage textuel donnerait le double sans que rien ne cloche.
  const occurrences = await page
    .locator(`a[href^="/taches/"]:has-text("${MARQUE} loyer")`)
    .count()
  verifier(
    'une complétion ne produit qu’une seule occurrence suivante',
    occurrences === 2,
    `${occurrences} lignes : celle qui est faite, et une seule suivante`,
  )

  // L'occurrence ouverte doit tomber un 31, et une seule fois — pas sept fois
  // pour rattraper les sept mois écoulés depuis janvier.
  await aller('/taches?vue=toutes')
  await page.locator(`a[href^="/taches/"]:has-text("${MARQUE} loyer")`).first().click()
  await page.waitForLoadState('networkidle')
  const detail = (await page.inputValue('input[name=echeance]')) ?? ''
  verifier(
    'le loyer du 31 ne dérive ni au 28 ni au 30',
    detail.endsWith('-31'),
    `prochaine échéance ${detail || '(vide)'}`,
  )
  verifier(
    'le rattrapage se fait en un seul saut, pas mois par mois',
    detail > aujourdhui(),
    `échéance ${detail} contre aujourd'hui ${aujourdhui()}`,
  )
}

// — Import CSV ————————————————————————————————————————————————————

let lotImporte = false
{
  await aller('/taches/importer')

  // Point-virgule et dates JJ/MM/AAAA : l'export Excel francophone, celui qui
  // casse les imports naïfs. La ligne 3 porte une date illisible et doit
  // partir en erreur plutôt qu'entrer sans échéance.
  const csv = [
    'Titre;Date d’échéance;Priorité;Projet',
    `${MARQUE} import un;03/04/2026;1;${MARQUE} projet`,
    `${MARQUE} import deux;25/12/2026;2;${MARQUE} projet`,
    `${MARQUE} import trois;la semaine prochaine;3;`,
  ].join('\n')

  await page.fill('textarea', csv)
  await page.click('button:has-text("Analyser")')
  await page.waitForTimeout(600)

  const separateur = await page.inputValue('select >> nth=0')
  verifier('le point-virgule est détecté', separateur === ';', `séparateur « ${separateur} »`)

  const format = await page.inputValue('select >> nth=1')
  verifier('le format de date belge est retenu', format === 'JJ/MM/AAAA', format)

  await page.click('button:has-text("Voir l\'aperçu")')
  await page.waitForTimeout(600)

  const apercu = (await page.textContent('body')) ?? ''
  verifier(
    'l’aperçu lit 03/04/2026 comme le 3 avril, pas le 4 mars',
    apercu.includes('2026-04-03'),
  )
  verifier(
    'la ligne à date illisible est comptée en erreur, pas importée',
    apercu.includes('date illisible'),
  )
  verifier('l’aperçu annonce deux lignes à créer', apercu.includes('2 à créer'))

  await page.click('button:has-text("Importer")')
  await page.waitForTimeout(2500)
  lotImporte = true

  const resultat = (await page.textContent('body')) ?? ''
  verifier('l’import annonce deux tâches créées', /Import terminé/.test(resultat))

  await aller('/taches?vue=toutes')
  const toutes = (await page.textContent('body')) ?? ''
  verifier('les tâches importées sont là', toutes.includes(`${MARQUE} import un`))

  await aller('/projets')
  const projets = (await page.textContent('body')) ?? ''
  verifier('le projet absent a été créé par nom', projets.includes(`${MARQUE} projet`))
}

// — Import CSV : annulation du lot ————————————————————————————————

if (lotImporte) {
  // Un second lot, annulé sans quitter l'écran. C'est le filet de sécurité de
  // tout l'import : trois cents lignes de travers doivent se rattraper en une
  // tape, pas en une heure de ménage.
  await aller('/taches/importer')
  await page.fill(
    'textarea',
    `Titre;Échéance\n${MARQUE} à défaire;01/01/2027`,
  )
  await page.click('button:has-text("Analyser")')
  await page.waitForTimeout(600)
  await page.click('button:has-text("Voir l\'aperçu")')
  await page.waitForTimeout(600)
  await page.click('button:has-text("Importer")')
  await page.waitForTimeout(2500)

  await page.click('button:has-text("Annuler cet import")')
  await page.waitForTimeout(2500)

  const annule = (await page.textContent('body')) ?? ''
  verifier('l’annulation d’un lot est confirmée à l’écran', annule.includes('Import annulé'))

  await aller('/taches?vue=toutes&statut=toutes')
  const restant = (await page.textContent('body')) ?? ''
  verifier(
    'le lot annulé a bien disparu de la base',
    !restant.includes(`${MARQUE} à défaire`),
  )
  verifier(
    'le premier lot, lui, est intact',
    restant.includes(`${MARQUE} import un`),
  )
}

// — Argent : rapprochement ————————————————————————————————————————

{
  await aller('/argent/comptes/nouveau')
  await page.fill('input[name=nom]', `${MARQUE} courant`)
  await page.fill('input[name=ouverture]', '1000,00')
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/argent`, { timeout: 15000 })

  const comptes = (await page.textContent('body')) ?? ''
  verifier(
    'le compte affiche son solde d’ouverture',
    comptes.includes(`${MARQUE} courant`) && /1\s*000,00/.test(comptes),
  )

  await aller('/argent/rapprochement')
  await page.selectOption('select', { label: `${MARQUE} courant` })
  await page.fill('input[inputmode=decimal]', '1050,00')
  await page.waitForTimeout(300)

  const enDirect = (await page.textContent('body')) ?? ''
  verifier(
    'l’écart s’affiche pendant la saisie',
    /\+\s*50,00/.test(enDirect.replace(/ | /g, ' ')),
  )

  await page.click('button:has-text("Rapprocher")')
  await page.waitForTimeout(2500)

  const apresEcart = (await page.textContent('body')) ?? ''
  verifier(
    'le rapprochement crée exactement l’écart',
    /\+\s*50,00/.test(apresEcart.replace(/ | /g, ' ')),
  )

  // Second rapprochement au même montant : plus rien à corriger.
  await page.click('button:has-text("Rapprocher un autre compte")')
  await page.waitForTimeout(300)
  await page.selectOption('select', { label: `${MARQUE} courant` })
  await page.fill('input[inputmode=decimal]', '1050,00')
  await page.waitForTimeout(300)
  await page.click('button:has-text("Rapprocher")')
  await page.waitForTimeout(2500)

  const aJour = (await page.textContent('body')) ?? ''
  verifier('second rapprochement à vide → « Déjà à jour »', aJour.includes('Déjà à jour'))

  await aller('/argent')
  const solde = (await page.textContent('body')) ?? ''
  verifier(
    'le solde vaut désormais le nombre saisi',
    /1\s*050,00/.test(solde.replace(/ | /g, ' ')),
  )
}

// — Argent : virement —————————————————————————————————————————————

{
  await aller('/argent/comptes/nouveau')
  await page.fill('input[name=nom]', `${MARQUE} épargne`)
  await page.fill('input[name=ouverture]', '0,00')
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/argent`, { timeout: 15000 })

  // Une dépense d'abord, pour avoir un net mensuel non nul à comparer.
  await page.fill('input[name=montant]', '40,00')
  await page.fill('input[name=libelle]', `${MARQUE} courses`)
  await page.selectOption('select[name=compte]', { label: `${MARQUE} courant` })
  await page.fill('input[name=categorie]', `${MARQUE}-courses`)
  await page.click('button:has-text("Enregistrer")')
  await page.waitForTimeout(2500)

  await aller('/argent')
  const avant = (await page.textContent('body')) ?? ''
  const netAvant = avant.match(/[-+]\s?[\d\s  ]+,\d{2}\s?€/)?.[0] ?? ''

  await aller('/argent/virement')
  await page.selectOption('select[name=source]', { label: `${MARQUE} courant` })
  await page.selectOption('select[name=destination]', { label: `${MARQUE} épargne` })
  await page.fill('input[name=montant]', '200,00')
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/argent`, { timeout: 15000 })

  const apres = (await page.textContent('body')) ?? ''
  const netApres = apres.match(/[-+]\s?[\d\s  ]+,\d{2}\s?€/)?.[0] ?? ''

  verifier(
    'un virement ne change pas le net du mois',
    netAvant !== '' && netAvant === netApres,
    `${netAvant || '(vide)'} → ${netApres || '(vide)'}`,
  )
  verifier(
    'le virement a bougé les deux soldes',
    /810,00/.test(apres.replace(/ | /g, ' ')) &&
      /200,00/.test(apres.replace(/ | /g, ' ')),
  )

  // Supprimer le virement doit emporter ses deux jambes.
  await aller('/argent?vue=livre')
  await page.click('button[aria-label^="Supprimer le virement"]')
  await page.waitForTimeout(2500)

  await aller('/argent?vue=livre')
  const livre = (await page.textContent('body')) ?? ''
  verifier(
    'supprimer un virement retire ses deux jambes',
    !livre.includes('⇄'),
    livre.includes('⇄') ? 'une jambe subsiste' : '',
  )
}

// — Objectifs : résultat clé décroissant ——————————————————————————

{
  await aller('/objectifs')
  await page.fill('input[name=nom]', `${MARQUE} objectif`)
  await page.click('button:has-text("Créer l\'objectif")')
  await page.waitForTimeout(2000)

  await aller('/objectifs')
  const ligne = await page
    .locator(`li:has(a[href^="/objectifs/"]:has-text("${MARQUE} objectif"))`)
    .first()
    .textContent()
  verifier(
    'un objectif sans résultat clé affiche un tiret, pas 0 %',
    (ligne ?? '').includes('—') && !/0\s*%/.test(ligne ?? ''),
    (ligne ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
  )

  // Viser l'objectif de test par son NOM, pas le premier de la liste : sur une
  // base qui contient déjà de vrais objectifs, « le premier » est l'un d'eux,
  // et le banc d'essai lui grefferait un résultat clé fantôme.
  await page.locator(`a[href^="/objectifs/"]:has-text("${MARQUE} objectif")`).first().click()
  await page.waitForLoadState('networkidle')

  // Les sélecteurs sont portés par le formulaire et non par la page : l'écran
  // de détail a deux champs `nom`, celui du résultat clé et celui de
  // l'objectif. Sans cette précision, on renomme l'objectif en croyant
  // ajouter une mesure.
  const ajout = page.locator('form:has(input[name=depart])')
  await ajout.locator('input[name=nom]').fill('Poids')
  await ajout.locator('input[name=depart]').fill('86')
  await ajout.locator('input[name=actuel]').fill('82')
  await ajout.locator('input[name=cible]').fill('78')
  await ajout.locator('input[name=unite]').fill('kg')
  await ajout.locator('button[type=submit]').click()
  await page.waitForTimeout(2500)

  const progression = (await page.textContent('body')) ?? ''
  verifier(
    'perdre 8 kg, 4 pris sur 8 → 50 %',
    /50\s*%/.test(progression),
    /50\s*%/.test(progression) ? '50 %' : '(introuvable)',
  )
}

// — Journal prérempli —————————————————————————————————————————————

{
  await aller('/journal')
  const suggestion = (await page.inputValue('textarea[name=fait]')) ?? ''
  verifier(
    'le journal du soir est prérempli par le score et les tâches faites',
    suggestion.includes('Habitudes'),
    suggestion.split('\n')[0] ?? '(vide)',
  )
}

// — Aucun 500 sur l'ensemble du parcours —————————————————————————

verifier(
  'aucune erreur serveur pendant tout le parcours',
  erreursServeur.length === 0,
  erreursServeur.join(', '),
)

// — Toutes les sections répondent ————————————————————————————————

for (const chemin of [
  '/agenda',
  '/inbox',
  '/sport',
  '/lectures',
  '/notes',
  '/cours',
  '/clients',
  '/reglages',
  '/reglages/export',
  '/projets',
  '/argent?vue=echeances',
  '/argent?vue=budgets',
]) {
  const reponse = await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle' })
  verifier(`${chemin} répond`, reponse?.status() === 200, String(reponse?.status()))
}

await navigateur.close()

console.log('')
const passes = resultats.filter((r) => r.ok).length
console.log(`${passes}/${resultats.length} vérifications passées`)
console.log(
  `\nDonnées de test créées sous le préfixe « ${MARQUE} » — à effacer avec` +
    ` scripts/nettoyer-tests.sql si le parcours a été joué sur une vraie base.`,
)
process.exit(passes === resultats.length ? 0 : 1)
