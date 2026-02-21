"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

type VersionResponse = {
  version?: string;
};

export default function AppUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentVersionRef = useRef<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let intervalId: number | null = null;
    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;

    const setUpdateReady = (worker?: ServiceWorker | null) => {
      if (worker) {
        waitingWorkerRef.current = worker;
      }
      setUpdateAvailable(true);
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
        // Ignore network errors during background polling.
      }
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

    void checkDeployedVersion();
    void setupServiceWorker();

    intervalId = window.setInterval(() => {
      if (!active) return;
      void checkDeployedVersion();
      registration?.update().catch(() => {
        // Ignore update polling errors.
      });
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
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  if (!updateAvailable) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <p className="update-banner-text">새 버전이 배포되었습니다. 새로고침해서 최신 화면을 적용하세요.</p>
      <button type="button" onClick={() => void handleRefresh()} className="update-banner-btn" disabled={isRefreshing}>
        <RefreshCw size={13} />
        {isRefreshing ? "적용 중..." : "새로고침"}
      </button>
    </div>
  );
}
