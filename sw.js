const CACHE = 'finance-v8';
const PRECACHE = [
  './', './index.html', './manifest.json',
  './icon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png',
];

// ── Install: pre-cache local assets ───────────────────────────────────────
// `cache: 'reload'` is essential. GitHub Pages serves index.html with
// Cache-Control: max-age=600, so a plain addAll() reads the browser's HTTP
// cache and can bake a STALE index.html into a brand-new cache version —
// permanently, since we serve assets cache-first. Forcing revalidation means
// a new SW version always precaches what's actually deployed.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(u =>
        fetch(new Request(u, { cache: 'reload' }))
          .then(res => res.ok ? c.put(u, res) : null)
          .catch(() => null)
      ))
    )
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignore non-GET, browser-extension, and localhost dev noise
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // CDN (React, Babel, fonts): network-first, cache as fallback
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML / navigations: NETWORK-FIRST, cache only as an offline fallback.
  // Cache-first here meant a shipped fix could never reach an installed app —
  // the old index.html was served indefinitely and the only escape was
  // manually clearing site data. The app shell is small, so the network cost
  // is negligible and offline still works via the fallback.
  const isHTML = request.mode === 'navigate' ||
                 (request.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Other local assets (icons, manifest): cache-first, network fallback.
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});
