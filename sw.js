const CACHE = 'roadtrip-v60';
const STATIC = ['/', '/index.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const u = req.url;
  // Ne pas intercepter : POST, API, et ressources externes (tuiles, météo, CDN…)
  if (req.method !== 'GET' || u.includes('/api/') || u.includes('openstreetmap') ||
      u.includes('open-meteo') || u.includes('geocoding-api') ||
      u.includes('unpkg.com')) return;

  // Pages HTML (navigation) → NETWORK-FIRST : toujours la dernière version quand il
  // y a du réseau, et repli sur le cache uniquement hors-ligne. Évite que l'app reste
  // bloquée sur une ancienne version après un déploiement.
  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Autres ressources même origine (icônes, manifest…) → CACHE-FIRST (versionnées par CACHE).
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
