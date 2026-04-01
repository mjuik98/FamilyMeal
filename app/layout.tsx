import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import ClientErrorMonitor from "@/components/ClientErrorMonitor";
import Navbar from "@/components/Navbar";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { publicEnv } from "@/lib/env";

const AppUpdateBanner = dynamic(() => import("@/components/AppUpdateBanner"));

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
  maximumScale: 1,
  userScalable: false,
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
