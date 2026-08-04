import type { Metadata, Viewport } from 'next'
import { Inter_Tight, Geist_Mono } from 'next/font/google'
import { EnregistrementServiceWorker } from '@/components/EnregistrementServiceWorker'
import './globals.css'

const interfaceTypo = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--police-interface',
  display: 'swap',
})

const chiffresTypo = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--police-chiffres',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mon 2ᵉ Cerveau',
  description: 'Tableau de bord personnel',
  applicationName: 'Mon 2ᵉ Cerveau',
  appleWebApp: {
    capable: true,
    title: '2ᵉ Cerveau',
    statusBarStyle: 'default',
  },
  // Un outil personnel n'a rien à faire dans un index de moteur de recherche.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Indispensable pour que env(safe-area-inset-*) renvoie autre chose que 0.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFBF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0E10' },
  ],
}

export default function LayoutRacine({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${interfaceTypo.variable} ${chiffresTypo.variable}`}>
      <body>
        {children}
        <EnregistrementServiceWorker />
      </body>
    </html>
  )
}
