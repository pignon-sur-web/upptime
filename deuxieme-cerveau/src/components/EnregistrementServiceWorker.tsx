'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker après le chargement, sans jamais bloquer le
 * rendu. `updateViaCache: 'none'` empêche le navigateur de servir une ancienne
 * version du fichier depuis son propre cache HTTP — sans ça, une correction du
 * service worker peut mettre des jours à atteindre un appareil.
 */
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const enregistrer = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // Un échec d'enregistrement ne doit jamais casser l'application :
          // elle fonctionne parfaitement sans service worker.
        })
    }

    if (document.readyState === 'complete') enregistrer()
    else window.addEventListener('load', enregistrer, { once: true })
  }, [])

  return null
}
