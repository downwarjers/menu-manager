const CACHE_NAME = 'menu-manager-v-auto';
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
  './js/components/modals/SlotQuickEditModal.js',
  './js/components/modals/SimpleBaseModal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const freshRequests = STATIC_ASSETS.map((url) => {
        return new Request(url, { cache: 'reload' });
      });
      return cache.addAll(freshRequests);
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

  // 1. latest.json 走 Network-First（有網路就抓最新，斷網才讀快取）
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

  // 2. 其他靜態資源走 Stale-While-Revalidate（有快取先顯示，背景自動下載最新版替換）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              return cache.put(event.request, clone);
            });
          }
          return res;
        })
        .catch(() => {
          return cached;
        });

      return cached || networkFetch;
    }),
  );
});
