/*
 * Génère les icônes PNG de la PWA à partir d'un SVG écrit ici même.
 *
 * Le dessin est « le mur du mois » réduit à seize cases : chacune se remplit
 * depuis le bas selon un palier différent. C'est l'élément signature de
 * l'application, et c'est aussi la seule chose qui reste lisible à 40px sur
 * un écran d'accueil.
 *
 *     npm run icones
 *
 * Les PNG produits sont commités : ça évite d'imposer sharp au déploiement.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const ENCRE = '#0A0A0B'
const PAPIER = '#FBFBF9'

/** Paliers de remplissage, de 0 à 5, un par case. Motif figé, pas aléatoire. */
const PALIERS = [5, 2, 4, 0, 3, 5, 1, 4, 5, 3, 0, 2, 4, 5, 3, 1]

/**
 * @param {number} taille    côté du PNG
 * @param {number} marge     proportion de vide autour du dessin (0 à 0.5).
 *                           Une icône maskable peut être rognée jusqu'à 10 %
 *                           de chaque côté : elle a besoin de plus de marge.
 */
function svg(taille, marge) {
  const zone = taille * (1 - marge * 2)
  const origine = taille * marge
  const colonnes = 4
  const espace = zone * 0.06
  const cote = (zone - espace * (colonnes - 1)) / colonnes

  const cases = PALIERS.map((palier, index) => {
    const colonne = index % colonnes
    const ligne = Math.floor(index / colonnes)
    const x = origine + colonne * (cote + espace)
    const y = origine + ligne * (cote + espace)
    const hauteur = (cote * palier) / 5

    return [
      `<rect x="${x}" y="${y}" width="${cote}" height="${cote}"`,
      ` fill="none" stroke="${PAPIER}" stroke-width="${taille * 0.008}" opacity="0.35"/>`,
      `<rect x="${x}" y="${y + cote - hauteur}" width="${cote}" height="${hauteur}"`,
      ` fill="${PAPIER}"/>`,
    ].join('')
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" fill="${ENCRE}"/>
  ${cases}
</svg>`
}

async function png(chemin, taille, marge) {
  await sharp(Buffer.from(svg(taille, marge))).png({ compressionLevel: 9 }).toFile(chemin)
  console.log('écrit', chemin)
}

const dossier = 'public/icones'
await mkdir(dossier, { recursive: true })

await writeFile(`${dossier}/icone.svg`, svg(512, 0.14))
console.log('écrit', `${dossier}/icone.svg`)

await png(`${dossier}/icone-192.png`, 192, 0.14)
await png(`${dossier}/icone-512.png`, 512, 0.14)
// Zone de sécurité élargie : le masque d'Android peut rogner un cercle.
await png(`${dossier}/icone-maskable-512.png`, 512, 0.24)
// iOS n'applique aucun masque et ajoute lui-même les coins arrondis.
await png('public/apple-touch-icon.png', 180, 0.12)
// Next sert automatiquement src/app/icon.png comme favicon.
await png('src/app/icon.png', 64, 0.1)
