import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

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
