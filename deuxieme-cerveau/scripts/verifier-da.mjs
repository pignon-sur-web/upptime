import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'

// 1. Analyse statique : la règle de neutralisation doit être HORS de toute @layer.
const dossier = '.next/static/css'
const css = readdirSync(dossier).map((f) => readFileSync(`${dossier}/${f}`, 'utf8')).join('\n')
const regle = /\*,\s*:{1,2}after,\s*:{1,2}before\s*\{[^}]*\}/g
let horsCouche = false
for (const m of css.matchAll(regle)) {
  if (!/border-radius:\s*0/.test(m[0])) continue
  const avant = css.slice(0, m.index)
  const profondeur = (avant.match(/\{/g) ?? []).length - (avant.match(/\}/g) ?? []).length
  console.log(`règle trouvée : ${m[0]}`)
  console.log(`profondeur d'imbrication : ${profondeur} ${profondeur === 0 ? '(hors @layer)' : '(DANS une @layer)'}`)
  if (profondeur === 0) horsCouche = true
}

// 2. Preuve au rendu : une règle en @layer utilities, exactement comme celles
//    qu'émet Tailwind, ne doit pas réussir à arrondir ni à ombrer.
const n = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await (await n.newContext()).newPage()
await p.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' })

const mesure = await p.evaluate(() => {
  const style = document.createElement('style')
  style.textContent =
    '@layer utilities { .sonde { border-radius: 99px; box-shadow: 0 4px 8px #000; } }'
  document.head.append(style)
  const el = document.createElement('div')
  el.className = 'sonde'
  document.body.append(el)
  const c = getComputedStyle(el)
  return { rayon: c.borderRadius, ombre: c.boxShadow }
})

console.log(`rayon calculé sur la sonde : ${mesure.rayon}`)
console.log(`ombre calculée sur la sonde : ${mesure.ombre}`)
await n.close()

const rayonOk = /^0px/.test(mesure.rayon)
const ombreOk = mesure.ombre === 'none'
console.log('')
console.log(`règle hors couche      : ${horsCouche ? 'OUI' : 'NON'}`)
console.log(`rayon neutralisé       : ${rayonOk ? 'OUI' : 'NON'}`)
console.log(`ombre neutralisée      : ${ombreOk ? 'OUI' : 'NON'}`)
process.exit(horsCouche && rayonOk && ombreOk ? 0 : 1)
