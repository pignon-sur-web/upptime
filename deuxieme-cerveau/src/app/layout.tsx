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

/**
 * Pose le thème choisi avant la première peinture.
 *
 * La préférence vit dans `localStorage` et non dans un cookie : lire un
 * cookie ici rendrait dynamiques les routes aujourd'hui prérendues, dont
 * `/hors-ligne` — celle que le service worker doit pouvoir servir sans réseau.
 *
 * Le script est inline et bloquant, donc il s'exécute avant tout rendu : pas
 * de clignotement clair→sombre. S'il échoue — navigation privée stricte,
 * stockage refusé — on retombe sur `color-scheme: light dark`, c'est-à-dire
 * sur la préférence du système, qui est le bon défaut.
 */
const SCRIPT_THEME = `try{var t=localStorage.getItem('theme');if(t==='clair'||t==='sombre'){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name=theme-color]:not([media])')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'theme-color'}));m.content=t==='sombre'?'#131316':'#f7f7f5'}}catch(e){}`

export default function LayoutRacine({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${interfaceTypo.variable} ${chiffresTypo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        {children}
        <EnregistrementServiceWorker />
      </body>
    </html>
  )
}
