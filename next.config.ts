import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const enablePwa = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

const withPWA = withPWAInit({
  dest: "public",
  disable: !enablePwa,
  register: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
