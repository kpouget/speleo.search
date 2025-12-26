const cacheName = "ChercheLeTrou-20241226_1810";
const contentToCache = [
    "libs.js",
    "trouve.js",
    "pwa.js",
    "simple_map.js",

    "index.html",
    "cherche.html",

    "favicon.png",
    "trouve512x512.png",
    "speleo.png"
];

self.addEventListener('install', (e) => {
    console.log(`[Service Worker ${cacheName}] Install`);

    // Force immediate activation of new service worker
    self.skipWaiting();

    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            console.log('[Service Worker] Mise en cache globale: app shell et contenu');
            return cache.addAll(contentToCache);
        })
    )
});

function removeQuery(request) {
var url = new URL(request.url);

    // Preserve version parameters for JavaScript files to enable cache busting
    if (url.pathname.endsWith('.js') && url.search.includes('v=')) {
        // Keep the version parameter for JS files
        url.fragment = '';
    } else {
        // Remove all query parameters for other files
        url.search = '';
        url.fragment = '';
    }

    return new Request(url, {
        method: request.method,
        headers: request.headers,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer,
        integrity: request.integrity,
    });
}

self.addEventListener('fetch', (e) => {
    var cleanRq = removeQuery(e.request);

    console.log(`[Service Worker ${cacheName}] Fetching resource`, cleanRq);

    e.respondWith((async () => {
        const r = await caches.match(cleanRq);
        console.log(`[Service Worker] Fetching resource: ${cleanRq.url}`);
        if (r) { return r; }

        const response = await fetch(e.request);
        const cache = await caches.open(cacheName);

        console.log(`[Service Worker] Caching new resource: ${cleanRq.url}`);
        cache.put(e.request, response.clone());

        return response;
    })());
});

const expectedCaches = [cacheName];


self.addEventListener('activate', event => {
  // Take immediate control of all clients
  self.clients.claim();

  // delete any caches that aren't in expectedCaches
  // which will get rid of static-v1
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!expectedCaches.includes(key)) {
          console.log(`[Service Worker] Deleting old cache: ${key}`);
          return caches.delete(key);
        }
      })
    )).then(() => {
      console.log(`[Service Worker ${cacheName}] now ready to handle fetches!`);
    })
  );
});
