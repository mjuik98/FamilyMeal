self.APP_CACHE_PREFIXES = ["familymeal-", "family-meal-", "next-pwa-", "workbox-"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => keys.filter((key) => self.APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))))
      .then((keysToDelete) => Promise.all(keysToDelete.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", () => {
  // Intentionally no runtime caching.
});
