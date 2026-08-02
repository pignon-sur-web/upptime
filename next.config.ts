import type { NextConfig } from 'next'

/*
 * Le domaine du bucket Storage est dérivé de SUPABASE_URL plutôt qu'écrit en
 * dur : le jour où le projet Supabase change, l'application suit sans qu'on
 * ait à se souvenir de ce fichier. Sans cette entrée, `next/image` refuse une
 * source distante — et la couverture de livre disparaîtrait avec une erreur
 * qui ne dit pas pourquoi.
 */
const hoteSupabase = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  experimental: {
    /*
     * Ne jamais resservir une page depuis le cache de navigation du client.
     *
     * Par défaut, Next garde en mémoire les pages déjà visitées pendant trente
     * secondes. Conséquence observée : on coche une habitude sur /habitudes,
     * on revient sur l'accueil par la barre d'onglets, et le score affiche
     * encore l'ancienne valeur — la page vient du cache, pas du serveur. Le
     * geste central de l'application semblait alors sans effet, ce qui est la
     * pire chose qu'un tableau de bord puisse faire.
     *
     * Toutes les pages ici sont `force-dynamic` et personnelles : il n'y a
     * rien à gagner à les garder, et tout à perdre.
     */
    staleTimes: { dynamic: 0, static: 0 },
  },

  images: {
    remotePatterns: hoteSupabase
      ? [
          {
            protocol: 'https',
            hostname: hoteSupabase,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },

  async headers() {
    return [
      {
        // Le service worker ne doit jamais être servi depuis le cache HTTP,
        // sinon une version fautive reste collée sur une PWA iOS installée.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
