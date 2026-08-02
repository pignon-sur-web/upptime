import { chromium } from 'playwright'
import { envLocal } from './env-local.mjs'

const env = envLocal()
const BASE = env.BASE_URL ?? 'http://localhost:3000'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
// Lu dans .env.local : le coder en dur fait échouer tous les contrôles sur la
// connexion le jour où le mot de passe change, et on cherche ailleurs.
const MOT_DE_PASSE = env.APP_PASSWORD

const navigateur = await chromium.launch({ executablePath: CHROME })
const resultats = []
const verifier = (nom, ok, detail = '') => {
  resultats.push({ nom, ok, detail })
  console.log(`${ok ? '  ok  ' : ' ECHEC'}  ${nom}${detail ? ` — ${detail}` : ''}`)
}

// 1. Non connecté : toute page protégée renvoie vers la connexion.
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/habitudes`, { waitUntil: 'networkidle' })
  verifier(
    'non connecté → redirigé vers /connexion',
    new URL(page.url()).pathname === '/connexion',
    page.url().replace(BASE, ''),
  )
  verifier(
    'la destination demandée est mémorisée',
    new URL(page.url()).searchParams.get('suite') === '/habitudes',
  )
  await ctx.close()
}

// 2. Mauvais mot de passe : pas de cookie, message d'erreur.
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  await page.fill('#motDePasse', 'mauvais')
  await page.click('button[type=submit]')
  // Cibler l'identifiant : Next pose lui aussi un role=alert (l'annonceur de
  // route), et il précède le nôtre dans le DOM.
  await page.waitForSelector('#erreur-connexion')
  const cookies = await ctx.cookies()
  verifier('mauvais mot de passe → aucun cookie de session', !cookies.some((c) => c.name === 'session'))
  const texteAlerte = (await page.textContent('#erreur-connexion')) ?? '(vide)'
  verifier('mauvais mot de passe → message affiché', texteAlerte.includes('incorrect'), texteAlerte)
  await ctx.close()
}

// 3. Bon mot de passe : cookie posé, redirection vers la destination mémorisée.
let cookieValide = null
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/connexion?suite=/habitudes`, { waitUntil: 'networkidle' })
  await page.fill('#motDePasse', MOT_DE_PASSE)
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/habitudes`, { timeout: 10000 })
  verifier('bon mot de passe → redirigé vers la destination', new URL(page.url()).pathname === '/habitudes')

  const cookies = await ctx.cookies()
  const session = cookies.find((c) => c.name === 'session')
  cookieValide = session?.value ?? null
  verifier('cookie de session posé', Boolean(session))
  verifier('cookie httpOnly', session?.httpOnly === true)
  verifier('cookie sameSite=Lax', session?.sameSite === 'Lax')
  const unAn = 360 * 24 * 3600
  verifier('cookie valable un an', (session?.expires ?? 0) - Date.now() / 1000 > unAn)

  // La session survit à un rechargement dur.
  await page.reload({ waitUntil: 'networkidle' })
  verifier('session conservée après rechargement', new URL(page.url()).pathname === '/habitudes')
  await ctx.close()
}

// 4. Le test qui prouve que le HMAC est réel : un caractère modifié déconnecte.
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
  const altere = cookieValide.slice(0, -1) + (cookieValide.endsWith('A') ? 'B' : 'A')
  await ctx.addCookies([{ name: 'session', value: altere, url: BASE }])
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  verifier('cookie altéré → déconnecté', new URL(page.url()).pathname === '/connexion')
  await ctx.close()
}

// 5. Les ressources de la PWA ne doivent jamais être redirigées.
{
  const ctx = await navigateur.newContext()
  for (const chemin of ['/sw.js', '/manifest.webmanifest', '/icones/icone-192.png', '/apple-touch-icon.png']) {
    const reponse = await ctx.request.get(`${BASE}${chemin}`, { maxRedirects: 0 })
    verifier(`${chemin} répond 200 sans redirection`, reponse.status() === 200, `statut ${reponse.status()}`)
  }
  await ctx.close()
}

// 6. Cibles tactiles : rien en dessous de 44px dans la barre de navigation.
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addCookies([{ name: 'session', value: cookieValide, url: BASE }])
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

  const onglets = await page.$$eval('nav a, nav button', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return { texte: el.textContent.trim(), largeur: Math.round(r.width), hauteur: Math.round(r.height) }
    }),
  )
  const tropPetits = onglets.filter((o) => o.hauteur < 44 || o.largeur < 44)
  verifier(
    `cibles de navigation ≥ 44px (${onglets.length} onglets)`,
    tropPetits.length === 0,
    tropPetits.length ? JSON.stringify(tropPetits) : onglets.map((o) => `${o.texte} ${o.largeur}×${o.hauteur}`).join(', '),
  )

  // Pas de défilement horizontal : la page doit tenir dans la largeur.
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  verifier('aucun débordement horizontal', !debordement)

  await page.screenshot({ path: 'captures/accueil-clair.png', fullPage: true })
  await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  await ctx.close()
}

// 7. Captures clair et sombre.
for (const schema of ['light', 'dark']) {
  // La page de connexion se capture sans cookie, sinon elle redirige.
  const anonyme = await navigateur.newContext({ viewport: { width: 390, height: 844 }, colorScheme: schema })
  const pageAnonyme = await anonyme.newPage()
  await pageAnonyme.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  await pageAnonyme.screenshot({ path: `captures/connexion-${schema}.png` })
  await anonyme.close()

  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, colorScheme: schema })
  await ctx.addCookies([{ name: 'session', value: cookieValide, url: BASE }])
  const page = await ctx.newPage()

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `captures/accueil-${schema}.png` })

  await page.click('nav button')
  await page.waitForTimeout(200)
  await page.screenshot({ path: `captures/panneau-${schema}.png` })

  // Les polices imposées doivent réellement être appliquées.
  if (schema === 'light') {
    const polices = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      const mono = document.querySelector('.chiffres')
      return {
        interface: getComputedStyle(h1).fontFamily,
        chiffres: mono ? getComputedStyle(mono).fontFamily : '(absent)',
        fond: getComputedStyle(document.body).backgroundColor,
        texte: getComputedStyle(document.body).color,
      }
    })
    verifier('Inter Tight appliquée à l’interface', /Inter[ _]?Tight/i.test(polices.interface), polices.interface.slice(0, 40))
    verifier('Geist Mono appliquée aux chiffres', /Geist[ _]?Mono/i.test(polices.chiffres), polices.chiffres.slice(0, 40))
    verifier('fond Papier en clair', polices.fond === 'rgb(251, 251, 249)', polices.fond)
    verifier('texte Encre en clair', polices.texte === 'rgb(10, 10, 11)', polices.texte)
  } else {
    const couleurs = await page.evaluate(() => ({
      fond: getComputedStyle(document.body).backgroundColor,
      texte: getComputedStyle(document.body).color,
    }))
    verifier('fond Nuit en sombre', couleurs.fond === 'rgb(14, 14, 16)', couleurs.fond)
    verifier('texte Papier en sombre', couleurs.texte === 'rgb(251, 251, 249)', couleurs.texte)
  }

  await ctx.close()
}

await navigateur.close()

const echecs = resultats.filter((r) => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`)
process.exit(echecs.length === 0 ? 0 : 1)
