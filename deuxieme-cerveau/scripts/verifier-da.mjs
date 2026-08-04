/*
 * Les jetons de couleur, vérifiés au navigateur.
 *
 *   npm start &
 *   npm run verifier:da
 *
 * ─── Ce banc a changé de rôle le 4 août 2026 ──────────────────────────────
 *
 * Il vérifiait jusque-là que la direction artistique était FERMÉE : espaces de
 * noms Tailwind vidés, trois rayons, une ombre, et aucune valeur hors échelle
 * dans les composants. Il échouait si quelqu'un écrivait `rounded-xl`.
 *
 * L'installation de la skill `ui-ux-pro-max` a levé cette fermeture — une base
 * de 84 styles et 192 palettes n'a aucune utilité dans un cadre qui refuse par
 * construction tout ce qu'elle propose. Les trois contrôles correspondants ont
 * donc été retirés. Ce n'est pas un affaiblissement accidentel : c'est une
 * décision, elle est documentée dans `src/app/globals.css` et dans le README.
 *
 * Ce qui reste à protéger n'a pas disparu pour autant, et c'est même la partie
 * qui casse le plus silencieusement. Les jetons sémantiques — `--accent`,
 * `--reussite`, `--urgent-fond` et les autres — sont employés par des dizaines
 * de composants. Le jour où l'un d'eux est retiré ou mal orthographié, la
 * propriété CSS devient simplement invalide : aucune erreur de compilation,
 * aucun avertissement, l'élément hérite d'une couleur voisine et personne ne
 * s'en aperçoit avant de regarder une capture d'écran.
 *
 * Ce banc résout donc chaque jeton dans un vrai navigateur, DANS LES DEUX
 * THÈMES — parce qu'ils sont déclarés en `light-dark()` et qu'un seul des deux
 * versants peut être faux.
 */

import { chromium } from 'playwright'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BASE = 'http://localhost:3000'

const resultats = []
const verifier = (nom, ok, detail = '') => {
  resultats.push({ nom, ok })
  console.log(`${ok ? '  ok  ' : ' ECHEC'}  ${nom}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Les jetons que l'application emploie. La liste est écrite à la main plutôt
 * que lue dans `globals.css` : un banc qui dérive sa propre attente du fichier
 * qu'il contrôle ne contrôle rien — il constaterait la suppression d'un jeton
 * en même temps qu'il cesserait de l'attendre.
 */
const JETONS = [
  'fond',
  'carte',
  'texte',
  'secondaire',
  'trait',
  'urgent',
  'urgent-fond',
  'important',
  'important-fond',
  'secondaire-badge',
  'secondaire-badge-fond',
  'accent',
  'accent-fond',
  'reussite',
  'echec',
  'reussite-fond',
  'echec-fond',
]

const navigateur = await chromium.launch({ executablePath: CHROME })

for (const schema of ['light', 'dark']) {
  const contexte = await navigateur.newContext({ colorScheme: schema })
  const page = await contexte.newPage()
  await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })

  const valeurs = await page.evaluate((noms) => {
    /*
     * `getPropertyValue` rendrait le texte brut « light-dark(#f7f7f5, …) »,
     * qui ne dit pas lequel des deux versants s'applique. On force donc le
     * navigateur à résoudre : on peint la variable sur un élément, et on relit
     * la couleur calculée.
     */
    const sonde = document.createElement('div')
    document.body.append(sonde)
    const resultat = {}
    for (const nom of noms) {
      sonde.style.color = ''
      sonde.style.color = `var(--${nom})`
      resultat[nom] = getComputedStyle(sonde).color
    }
    sonde.remove()
    return resultat
  }, JETONS)

  const invalides = JETONS.filter((nom) => !/^rgba?\(/.test(valeurs[nom] ?? ''))
  verifier(
    `les ${JETONS.length} jetons se résolvent en ${schema === 'light' ? 'clair' : 'sombre'}`,
    invalides.length === 0,
    invalides.length ? invalides.join(', ') : '',
  )

  // Deux jetons qui doivent DIFFÉRER d'un thème à l'autre : si la bascule
  // `light-dark()` cassait, tout se résoudrait quand même — en une seule
  // palette. Le contrôle ci-dessus passerait sans rien voir.
  verifier(
    `le fond du thème ${schema === 'light' ? 'clair' : 'sombre'} est le bon`,
    valeurs.fond === (schema === 'light' ? 'rgb(247, 247, 245)' : 'rgb(19, 19, 22)'),
    valeurs.fond,
  )

  await contexte.close()
}

// ————————————————————————————————————————————————————————————————
// La carte se rend vraiment.
// ————————————————————————————————————————————————————————————————

const page = await (await navigateur.newContext()).newPage()
await page.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })

const mesure = await page.evaluate(() => {
  const el = document.createElement('div')
  el.className = 'carte'
  document.body.append(el)
  const c = getComputedStyle(el)
  const carte = { rayon: c.borderRadius, ombre: c.boxShadow, fond: c.backgroundColor }
  el.remove()

  /*
   * Et la preuve que les échelles sont bien ouvertes : deux classes Tailwind
   * standard, qui ne compilaient pas avant le 4 août 2026.
   *
   * Elles rendent quelque chose parce que la chaîne « rounded-xl shadow-lg »
   * apparaît en clair dans CE fichier, que Tailwind scanne comme le reste du
   * projet. Ce n'est pas un hasard heureux, c'est ce qui rend le contrôle
   * valide : si les espaces de noms étaient à nouveau vidés avec `initial`,
   * l'utilitaire n'existerait pas et la sonde retomberait à 0px — le scan ne
   * peut pas fabriquer une valeur qui n'est plus déclarée nulle part.
   *
   * Si ce contrôle échoue, c'est que quelqu'un a remis les `: initial`, et
   * que la skill `ui-ux-pro-max` est redevenue inutilisable. Il faut le
   * savoir.
   */
  const sonde = document.createElement('div')
  sonde.className = 'rounded-xl shadow-lg'
  document.body.append(sonde)
  const s = getComputedStyle(sonde)
  const ouvert = { rayon: s.borderRadius, ombre: s.boxShadow }
  sonde.remove()

  return { carte, ouvert }
})
await navigateur.close()

verifier('la carte a un rayon', /^[1-9]/.test(mesure.carte.rayon), mesure.carte.rayon)
verifier('la carte a une ombre', mesure.carte.ombre !== 'none', mesure.carte.ombre)
verifier(
  'la carte se détache du fond',
  mesure.carte.fond !== 'rgba(0, 0, 0, 0)',
  mesure.carte.fond,
)
verifier(
  'les échelles Tailwind sont ouvertes',
  /^[1-9]/.test(mesure.ouvert.rayon) && mesure.ouvert.ombre !== 'none',
  `rounded-xl → ${mesure.ouvert.rayon}, shadow-lg → ${mesure.ouvert.ombre === 'none' ? 'none' : 'présente'}`,
)

// ————————————————————————————————————————————————————————————————

const echecs = resultats.filter((r) => !r.ok).length
console.log('')
console.log(`${resultats.length - echecs}/${resultats.length}`)
process.exit(echecs === 0 ? 0 : 1)
