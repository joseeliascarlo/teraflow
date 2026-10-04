/*
  TeraFlow: modo sin internet.
  Guarda una copia del app en el equipo para que abra aunque no haya conexión.
  Cada versión nueva cambia VERSION; el app avisa con "Hay una versión nueva".
*/
const VERSION = 'teraflow-2026.10.03.2';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './tailwind.css',
  './html2canvas.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './inter-400.woff2',
  './inter-500.woff2',
  './inter-600.woff2',
  './inter-700.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('teraflow-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google y Drive van directo a internet

  // config.js: primero internet (para que tu Client ID nuevo llegue), si no hay, la copia guardada
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./config.js', copy)); }
          return res;
        })
        .catch(() => caches.match('./config.js'))
    );
    return;
  }

  // Abrir el app: siempre la copia guardada de esta versión
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(req))
    );
    return;
  }

  // Lo demás: copia guardada primero; si falta, internet
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
