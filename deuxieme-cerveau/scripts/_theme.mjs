import { chromium } from 'playwright'
import { envLocal } from './env-local.mjs'

const env = envLocal()
const BASE = 'http://localhost:3000'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const n = await chromium.launch({ executablePath: CHROME })

const fond = (p) =>
  p.evaluate(() => getComputedStyle(document.body).backgroundColor)

for (const systeme of ['light', 'dark']) {
  const ctx = await n.newContext({ colorScheme: systeme })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  console.log(`système ${systeme} — sans surcharge  : ${await fond(p)}`)

  for (const choix of ['clair', 'sombre']) {
    await p.evaluate((c) => {
      localStorage.setItem('theme', c)
    }, choix)
    await p.reload({ waitUntil: 'networkidle' })
    const pose = await p.evaluate(() => document.documentElement.dataset.theme)
    console.log(
      `système ${systeme} — forcé ${choix.padEnd(6)} : ${await fond(p)}  (data-theme=${pose})`,
    )
  }

  await p.evaluate(() => localStorage.removeItem('theme'))
  await ctx.close()
}

await n.close()
