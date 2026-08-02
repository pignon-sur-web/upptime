import { chromium } from 'playwright'
import { envLocal } from './env-local.mjs'

const env = envLocal()
const BASE = 'http://localhost:3000'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SORTIE = process.argv[2] ?? '.'

const n = await chromium.launch({ executablePath: CHROME })

for (const [nom, largeur, hauteur] of [
  ['pc', 1440, 900],
  ['mobile', 390, 844],
]) {
  const ctx = await n.newContext({
    viewport: { width: largeur, height: hauteur },
    deviceScaleFactor: nom === 'pc' ? 1 : 2,
    colorScheme: 'light',
  })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/connexion`)
  await p.fill('input[type=password]', env.APP_PASSWORD)
  await p.click('button[type=submit]')
  await p.waitForURL(`${BASE}/`)
  await p.waitForLoadState('networkidle')

  const deborde = await p.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  console.log(`${nom} — débordement horizontal : ${deborde}`)

  await p.screenshot({ path: `${SORTIE}/accueil-${nom}.png`, fullPage: true })
  console.log('capturé', nom)
  await ctx.close()
}

await n.close()
