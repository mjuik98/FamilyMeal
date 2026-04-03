export const APP_CACHE_PATTERNS = [
  /^familymeal-(precache|runtime)-/,
  /^family-meal-(precache|runtime)-/,
  /^next-pwa-(precache|runtime)-/,
  /^workbox-precache-v2-/,
  /^workbox-runtime-/,
] as const;

export const shouldDeletePwaCache = (key: string): boolean =>
  APP_CACHE_PATTERNS.some((pattern) => pattern.test(key));
