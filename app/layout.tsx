import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { ConfirmProvider } from "@/lib/platform/feedback/ConfirmDialog";
import { ToastProvider } from "@/lib/platform/feedback/ToastProvider";
import ClientErrorMonitor from "@/lib/platform/monitoring/ClientErrorMonitor";
import ServiceWorkerCleanup from "@/lib/platform/pwa/ServiceWorkerCleanup";
import Navbar from "@/components/Navbar";
import { publicEnv } from "@/lib/config/public-env";
import { UserProvider } from "@/lib/modules/profile/ui/UserSessionProvider";

const AppUpdateBanner = dynamic(() => import("@/lib/platform/pwa/AppUpdateBanner"));

export const metadata: Metadata = {
  title: "가족 식사 기록",
  description: "가족들과 함께 맛있는 추억을 남겨보세요",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon.svg",
    icon: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#FAFAF5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldCleanupServiceWorker = !publicEnv.enablePwa;

  return (
    <html lang="ko">
      <body>
        {shouldCleanupServiceWorker && <ServiceWorkerCleanup />}
        <ClientErrorMonitor />
        <UserProvider>
          <ToastProvider>
            <ConfirmProvider>
              <div className="app-container">
                <main className="app-main">
                  {children}
                </main>
                {publicEnv.enablePwa && <AppUpdateBanner />}
              </div>
              <Navbar />
            </ConfirmProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
