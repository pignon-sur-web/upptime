/*
 * Service worker minimal — et il doit le rester.
 *
 * Toutes les pages de cette application sont dynamiques et personnelles.
 * Mettre du HTML en cache donnerait un tableau de bord daté de mardi dernier,
 * sans aucun moyen évident de forcer un rafraîchissement : en mode standalone
 * il n'y a pas de bouton recharger.
 *
 * Règle : réseau seul pour les navigations, cache seulement pour ce qui est
 * immuable (les fichiers /_next/static/ sont hachés, donc un nouveau contenu
 * a forcément une nouvelle URL) et pour les icônes.
 *
 * Si un jour ce fichier pose problème sur une PWA installée, le remplacer
 * entièrement par :
 *     self.addEventListener('install', () => self.skipWaiting())
 *     self.addEventListener('activate', () => self.registration.unregister())
 * puis déployer. C'est le seul moyen simple de purger un service worker
 * fautif sur iOS.
 */

const VERSION = 'v1'
const CACHE = `cerveau-${VERSION}`
const HORS_LIGNE = '/hors-ligne'

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([HORS_LIGNE]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))),
      )
      .then(() => self.clients.claim()),
  )
})

function estImmuable(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icones/')
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request

  // Ne jamais intercepter les écritures : les Server Actions sont des POST
  // vers l'URL de la page elle-même.
  if (requete.method !== 'GET') return

  const url = new URL(requete.url)
  if (url.origin !== self.location.origin) return

  // Navigations : réseau seul, page hors ligne en dernier recours.
  if (requete.mode === 'navigate') {
    evenement.respondWith(fetch(requete).catch(() => caches.match(HORS_LIGNE)))
    return
  }

  // Ressources immuables : cache d'abord, réseau en remplissage.
  if (estImmuable(url)) {
    evenement.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ??
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone()
              caches.open(CACHE).then((cache) => cache.put(requete, copie))
            }
            return reponse
          }),
      ),
    )
  }

  // Tout le reste passe au réseau sans interception.
})
