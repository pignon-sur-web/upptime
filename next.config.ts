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
