"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 60_000;
const POLL_LOCK_TTL_MS = POLL_INTERVAL_MS + 15_000;
const UPDATE_LOCK_KEY = "familymeal:update-poll-lock";
const UPDATE_LOCK_NAME = "familymeal:update-poll";
const UPDATE_CHANNEL_NAME = "familymeal:update-channel";
const isPwaEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

const APP_CACHE_PATTERNS = [
  /^familymeal-(precache|runtime)-/,
  /^family-meal-(precache|runtime)-/,
  /^next-pwa-(precache|runtime)-/,
  /^workbox-precache-v2-/,
  /^workbox-runtime-/,
];

type PollLock = {
  owner: string;
  expiresAt: number;
};

type VersionResponse = {
  version?: string;
};

type NavigatorWithLocks = Navigator & {
  locks?: {
    request: (
      name: string,
      options: { mode?: "shared" | "exclusive"; ifAvailable?: boolean },
      callback: (lock: { name: string; mode: "shared" | "exclusive" } | null) => Promise<void> | void
    ) => Promise<void>;
  };
};

const parsePollLock = (raw: string | null): PollLock | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PollLock>;
    if (!parsed.owner || typeof parsed.expiresAt !== "number") return null;
    return { owner: parsed.owner, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
};

const shouldDeleteCache = (key: string): boolean =>
  APP_CACHE_PATTERNS.some((pattern) => pattern.test(key));

export default function AppUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentVersionRef = useRef<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPwaEnabled) return;
    if (typeof window === "undefined") return;

    if (!tabIdRef.current) {
      tabIdRef.current =
        window.crypto?.randomUUID?.() ??
        `tab-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000_000).toString(36)}`;
    }

    let intervalId: number | null = null;
    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;

    const readLock = (): PollLock | null => {
      try {
        return parsePollLock(window.localStorage.getItem(UPDATE_LOCK_KEY));
      } catch {
        return null;
      }
    };

    const writeLock = (value: PollLock | null) => {
      try {
        if (!value) {
          window.localStorage.removeItem(UPDATE_LOCK_KEY);
          return;
        }
        window.localStorage.setItem(UPDATE_LOCK_KEY, JSON.stringify(value));
      } catch {
        // Ignore storage write issues.
      }
    };

    const tryAcquireLock = (): boolean => {
      const tabId = tabIdRef.current;
      if (!tabId) return false;
      const now = Date.now();
      const lock = readLock();

      if (!lock || lock.expiresAt <= now || lock.owner === tabId) {
        writeLock({ owner: tabId, expiresAt: now + POLL_LOCK_TTL_MS });
        return true;
      }
      return false;
    };

    const releaseLock = () => {
      const tabId = tabIdRef.current;
      if (!tabId) return;
      const lock = readLock();
      if (lock?.owner === tabId) {
        writeLock(null);
      }
    };

    const runWithPollingLock = async (task: () => Promise<void>) => {
      const nav = navigator as NavigatorWithLocks;
      if (typeof nav.locks?.request === "function") {
        let completed = false;
        try {
          await nav.locks.request(
            UPDATE_LOCK_NAME,
            { mode: "exclusive", ifAvailable: true },
            async (lock) => {
              if (!lock) return;
              if (!tryAcquireLock()) return;
              completed = true;
              await task();
            }
          );
          if (completed) {
            return;
          }
        } catch {
          // Fallback to localStorage lock below.
        }
      }

      if (!tryAcquireLock()) return;
      await task();
    };

    const broadcastUpdateReady = () => {
      channelRef.current?.postMessage({ type: "update-available" });
    };

    const setUpdateReady = (worker?: ServiceWorker | null) => {
      if (worker) {
        waitingWorkerRef.current = worker;
      }
      setUpdateAvailable(true);
      broadcastUpdateReady();
    };

    const checkDeployedVersion = async () => {
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as VersionResponse;
        const incomingVersion = payload.version?.trim();
        if (!incomingVersion) return;

        if (!currentVersionRef.current) {
          currentVersionRef.current = incomingVersion;
          return;
        }

        if (incomingVersion !== currentVersionRef.current) {
          setUpdateReady();
        }
      } catch {
        // Ignore transient network errors.
      }
    };

    const checkForUpdate = async () => {
      if (!active) return;
      if (document.visibilityState !== "visible") return;

      await runWithPollingLock(async () => {
        await checkDeployedVersion();
        registration?.update().catch(() => {
          // Ignore service worker update polling failures.
        });
      });
    };

    const handleControllerChange = () => {
      window.location.reload();
    };

    const handleWorkerStateChange = () => {
      if (!installingWorker) return;
      if (installingWorker.state !== "installed") return;
      if (!navigator.serviceWorker.controller) return;
      setUpdateReady(installingWorker);
    };

    const handleUpdateFound = () => {
      if (!registration) return;
      installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener("statechange", handleWorkerStateChange);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        releaseLock();
        return;
      }
      void checkForUpdate();
    };

    const handleChannelMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "update-available") {
        setUpdateAvailable(true);
      }
    };

    const setupServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) return;

      const nextRegistration = await navigator.serviceWorker.getRegistration();
      if (!nextRegistration) return;
      registration = nextRegistration;

      if (registration.waiting) {
        setUpdateReady(registration.waiting);
      }

      registration.addEventListener("updatefound", handleUpdateFound);
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    };

    if ("BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel(UPDATE_CHANNEL_NAME);
      channelRef.current.addEventListener("message", handleChannelMessage);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void setupServiceWorker();
    void checkForUpdate();

    intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (registration) {
        registration.removeEventListener("updatefound", handleUpdateFound);
      }
      if (installingWorker) {
        installingWorker.removeEventListener("statechange", handleWorkerStateChange);
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channelRef.current) {
        channelRef.current.removeEventListener("message", handleChannelMessage);
        channelRef.current.close();
      }
      releaseLock();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    const waitingWorker = waitingWorkerRef.current;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(shouldDeleteCache).map((key) => caches.delete(key)));
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  if (!isPwaEnabled) return null;
  if (!updateAvailable) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <p className="update-banner-text">
        {"\uC0C8 \uBC84\uC804\uC774 \uBC30\uD3EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68\uD574 \uCD5C\uC2E0 \uD654\uBA74\uC744 \uC801\uC6A9\uD558\uC138\uC694."}
      </p>
      <button type="button" onClick={() => void handleRefresh()} className="update-banner-btn" disabled={isRefreshing}>
        <RefreshCw size={13} />
        {isRefreshing ? "\uC801\uC6A9 \uC911..." : "\uC0C8\uB85C\uACE0\uCE68"}
      </button>
    </div>
  );
}
