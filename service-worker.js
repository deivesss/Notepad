const CACHE_NAME = "meu-notepad-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/login.html",
  "/profile.html",
  "/manifest.json",
  "/logo.png",
  "/style.css",
  "/script.js",
  "/login.js",
  "/firebase-config.js"
];

// Instala o service worker e armazena os arquivos no cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativa o service worker e remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Intercepta as requisições e usa o cache primeiro
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
