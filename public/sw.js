self.APP_CACHE_WHITELIST_PATTERNS = [
  /^familymeal-(precache|runtime)-/,
  /^family-meal-(precache|runtime)-/,
  /^next-pwa-(precache|runtime)-/,
  /^workbox-precache-v2-/,
  /^workbox-runtime-/,
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        keys.filter((key) => self.APP_CACHE_WHITELIST_PATTERNS.some((pattern) => pattern.test(key)))
      )
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
