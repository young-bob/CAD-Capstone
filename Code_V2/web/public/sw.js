const CACHE_NAME = 'vsms-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Network-first for API calls — never serve stale API data
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for static assets (JS, CSS, fonts, images)
    if (request.destination === 'script' || request.destination === 'style' ||
        request.destination === 'font'   || request.destination === 'image') {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (!response || response.status !== 200) return response;
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Network-first with cache fallback for HTML navigation
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request).then(r => r || caches.match('/')))
    );
});
