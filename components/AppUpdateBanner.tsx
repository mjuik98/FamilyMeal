"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { useAppUpdateMonitor } from "@/components/hooks/useAppUpdateMonitor";
import { publicEnv } from "@/lib/config/public-env";
import { shouldDeletePwaCache } from "@/lib/pwa-cache";

const isPwaEnabled = publicEnv.enablePwa;

export default function AppUpdateBanner() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { updateAvailable, waitingWorkerRef } = useAppUpdateMonitor(isPwaEnabled);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    const waitingWorker = waitingWorkerRef.current;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(shouldDeletePwaCache).map((key) => caches.delete(key)));
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
