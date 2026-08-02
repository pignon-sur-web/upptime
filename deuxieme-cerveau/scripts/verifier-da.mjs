/*
 * La direction artistique, vérifiée par la machine.
 *
 *   npm start &
 *   npm run verifier:da
 *
 * L'application a changé de langage visuel : elle est passée d'un monochrome
 * sans rayon ni ombre à un système de cartes coloré. Ce banc a changé avec
 * elle, mais son rôle n'a pas bougé — empêcher la dérive.
 *
 * Une palette et une échelle ne tiennent pas parce qu'elles sont écrites dans
 * un fichier de règles : elles tiennent parce que l'outil refuse ce qui n'y
 * est pas. Trois vérifications, dans cet ordre :
 *
 *   1. Les espaces de noms sont fermés. `--color-*`, `--radius-*` et
 *      `--shadow-*` sont vidés avec `initial` avant d'être redéclarés, donc
 *      `text-red-500`, `rounded-xl` et `shadow-2xl` ne compilent pas.
 *   2. Les échelles restent courtes. Trois rayons, une ombre. Le jour où
 *      quelqu'un en ajoute un quatrième, ce banc le dit — parce que c'est
 *      comme ça qu'une échelle meurt : un rayon à la fois.
 *   3. Le code source n'emploie que ces valeurs-là, et le rendu les applique
 *      vraiment. Une carte sans rayon ni ombre au navigateur voudrait dire
 *      que quelque chose les annule encore.
 */

import { chromium } from 'playwright'
import { globSync, readFileSync } from 'node:fs'

const resultats = []
const verifier = (nom, ok, detail = '') => {
  resultats.push({ nom, ok })
  console.log(`${ok ? '  ok  ' : ' ECHEC'}  ${nom}${detail ? ` — ${detail}` : ''}`)
}

// ————————————————————————————————————————————————————————————————
// 1. Les espaces de noms sont fermés dans la source des jetons.
// ————————————————————————————————————————————————————————————————

const source = readFileSync('src/app/globals.css', 'utf8')

for (const espace of ['color', 'radius', 'shadow', 'text', 'font', 'blur']) {
  verifier(
    `espace de noms fermé : --${espace}-*`,
    source.includes(`--${espace}-*: initial;`),
  )
}

// ————————————————————————————————————————————————————————————————
// 2. Les échelles restent courtes.
// ————————————————————————————————————————————————————————————————

/** Les jetons déclarés dans les blocs `@theme`, par espace de noms. */
const declares = (espace) => {
  const trouves = new Set()
  for (const bloc of source.matchAll(/@theme[^{]*\{([\s\S]*?)\n\}/g)) {
    for (const m of bloc[1].matchAll(new RegExp(`--${espace}-([\\w-]+):`, 'g'))) {
      if (m[1] !== '*') trouves.add(m[1])
    }
  }
  return [...trouves]
}

const rayons = declares('radius')
verifier(
  `échelle des rayons : ${rayons.length} valeur${rayons.length > 1 ? 's' : ''}`,
  rayons.length === 3,
  rayons.join(', '),
)

const ombres = declares('shadow')
verifier(
  `échelle des ombres : ${ombres.length} valeur${ombres.length > 1 ? 's' : ''}`,
  ombres.length === 1,
  ombres.join(', '),
)

// ————————————————————————————————————————————————————————————————
// 3. Le code source n'emploie que ces valeurs-là.
//
//    C'est la seule des trois vérifications qu'un développeur peut casser
//    sans toucher aux jetons : écrire `rounded-full` dans un composant passe
//    la compilation (Tailwind a ses utilitaires statiques) mais introduit une
//    quatrième valeur dans une échelle qui en compte trois.
// ————————————————————————————————————————————————————————————————

const fichiers = globSync('src/**/*.{ts,tsx}')
const rayonsAutorises = new Set([...rayons, 'none'])
const ombresAutorisees = new Set([...ombres, 'none'])

const fautes = []
for (const fichier of fichiers) {
  const contenu = readFileSync(fichier, 'utf8')
  // La valeur arbitraire — `rounded-[2px]` — est visée explicitement : c'est
  // la porte de sortie la plus tentante, et elle contourne l'échelle sans
  // jamais déclarer de jeton.
  for (const m of contenu.matchAll(/\brounded(?:-[trbl][lr]?)?-(\[[^\]]+\]|[a-z0-9]+)\b/g)) {
    if (!rayonsAutorises.has(m[1])) fautes.push(`${fichier} : ${m[0]}`)
  }
  for (const m of contenu.matchAll(/\bshadow-(\[[^\]]+\]|[a-z0-9]+)\b/g)) {
    if (!ombresAutorisees.has(m[1])) fautes.push(`${fichier} : ${m[0]}`)
  }
}
verifier(
  'aucun rayon ni ombre hors échelle dans les composants',
  fautes.length === 0,
  fautes.slice(0, 5).join(' · '),
)

// ————————————————————————————————————————————————————————————————
// 4. Le rendu applique bien la carte.
// ————————————————————————————————————————————————————————————————

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const navigateur = await chromium.launch({ executablePath: CHROME })
const page = await (await navigateur.newContext()).newPage()
await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' })

const mesure = await page.evaluate(() => {
  const el = document.createElement('div')
  el.className = 'carte'
  document.body.append(el)
  const c = getComputedStyle(el)
  return { rayon: c.borderRadius, ombre: c.boxShadow, fond: c.backgroundColor }
})
await navigateur.close()

verifier(
  'la carte a un rayon',
  /^[1-9]/.test(mesure.rayon),
  mesure.rayon,
)
verifier('la carte a une ombre', mesure.ombre !== 'none', mesure.ombre)
verifier(
  'la carte se détache du fond',
  mesure.fond !== 'rgba(0, 0, 0, 0)',
  mesure.fond,
)

// ————————————————————————————————————————————————————————————————

const echecs = resultats.filter((r) => !r.ok).length
console.log('')
console.log(`${resultats.length - echecs}/${resultats.length}`)
process.exit(echecs === 0 ? 0 : 1)
