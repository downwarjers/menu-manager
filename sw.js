const CACHE_NAME = 'menu-manager-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './data/latest.json',
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
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js',
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
  // 對最新資料檔採取 Network-First 策略，其餘靜態檔採取 Cache-First
  if (event.request.url.includes('/data/latest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') {
            return res;
          }
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
      );
    }),
  );
});