const CACHE_NAME = 'garisphere-pwa-v1';
const STATIC_ASSETS = [
  '/app',
  '/garisphere-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API routes, auth endpoints, or non-GET requests to prevent exposing sensitive dealership data
  if (url.pathname.startsWith('/api/') || request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Network-first strategy for HTML pages and app shell
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const appShell = await caches.match('/app');
          if (appShell) return appShell;
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline | GariSphere DMS</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: white; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; text-align: center; padding: 1.5rem; box-sizing: border-box; }
                  .card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #f59e0b; }
                  p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
                  button { background: #0066ff; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.9rem; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">📡</div>
                  <h1>You're Offline</h1>
                  <p>Some GariSphere functions require an active internet connection. Please check your network and try again.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Cache-first strategy for static assets (images, CSS, JS)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
