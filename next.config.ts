import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { publicEnv } from "@/lib/config/public-env";

const enablePwa = publicEnv.enablePwa;

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

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
