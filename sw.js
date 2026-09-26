const CACHE_NAME = 'menu-manager-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './data/latest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/state/menuStore.js',
  './js/utils/exporter.js',
  './js/utils/pricing.js',
  './js/components/HeaderBar.js',
  './js/components/DishList.js',
  './js/components/PackageList.js',
  './js/components/BaseDataList.js',
  './js/components/modals/ChannelModal.js',
  './js/components/modals/DishModal.js',
  './js/components/modals/IngredientModal.js',
  './js/components/modals/PackageModal.js',
  './js/components/modals/SimpleBaseModal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // 針對最新資料採用 Network-First
  if (event.request.url.includes('/data/latest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            return cache.put(event.request, clone);
          });
          return res;
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
    return;
  }

  // 其餘資源採用 Cache-First, 失敗則回退網路並寫入快取
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') {
            return res;
          }
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            return cache.put(event.request, clone);
          });
          return res;
        })
      );
    }),
  );
});
