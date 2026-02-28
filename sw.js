const CACHE_NAME = 'cine-ark-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.tailwindcss.com'
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos o addAll mas capturamos erros para não quebrar o SW
      return cache.addAll(ASSETS).catch(err => console.warn("Aviso: Alguns assets falharam no cache inicial", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // BYPASS TOTAL: Se for MangaDex ou Supabase, sai do Service Worker imediatamente
  if (url.hostname.includes('mangadex.org') || url.hostname.includes('supabase.co')) {
    return; // O navegador assume o controlo normal de rede
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          // Não guardar em cache pedidos que não sejam GET ou que sejam de terceiros
          if (event.request.method === 'GET' && url.origin === location.origin) {
            cache.put(event.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    }).catch(() => {
        // Se for uma navegação de página, pode retornar o index.html
        if (event.request.mode === 'navigate') return caches.match('/index.html');
    })
  );
});