"use client";

import { useEffect } from "react";
import { publicEnv } from "@/lib/config/public-env";

const CLEANUP_STORAGE_KEY = `familymeal:sw-cleanup:${publicEnv.appVersion}`;
const APP_CACHE_PATTERNS = [
  /^familymeal-(precache|runtime)-/,
  /^family-meal-(precache|runtime)-/,
  /^next-pwa-(precache|runtime)-/,
  /^workbox-precache-v2-/,
  /^workbox-runtime-/,
];

const shouldDeleteCache = (key: string): boolean =>
  APP_CACHE_PATTERNS.some((pattern) => pattern.test(key));

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CLEANUP_STORAGE_KEY) === "done") {
        return;
      }
      window.localStorage.setItem(CLEANUP_STORAGE_KEY, "done");
    } catch {
      // Ignore storage write failures and continue with cleanup.
    }

    void (async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(shouldDeleteCache).map((key) => caches.delete(key)));
      }
    })();
  }, []);

  return null;
}
