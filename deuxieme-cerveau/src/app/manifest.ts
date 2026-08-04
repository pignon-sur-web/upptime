import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mon 2ᵉ Cerveau',
    short_name: '2ᵉ Cerveau',
    description: 'Tableau de bord personnel',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr',
    // Le manifeste ne peut porter qu'une seule couleur ; le méta `theme-color`
    // du layout gère la bascule clair/sombre.
    background_color: '#FBFBF9',
    theme_color: '#FBFBF9',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icones/icone-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
