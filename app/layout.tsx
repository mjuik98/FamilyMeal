import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AppUpdateBanner from "@/components/AppUpdateBanner";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { publicEnv } from "@/lib/env";

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
        {shouldCleanupServiceWorker && (
          <Script id="cleanup-sw" strategy="beforeInteractive">
            {`
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  registrations.forEach((registration) => {
                    registration.unregister();
                  });
                });
              }
              if ('caches' in window) {
                caches.keys().then((keys) => {
                  keys.forEach((key) => caches.delete(key));
                });
              }
            `}
          </Script>
        )}
        <Script id="client-error-monitor" strategy="afterInteractive">
          {`
            (() => {
              let sent = 0;
              const maxReports = 3;
              const endpoint = '/api/client-errors';

              const send = (payload) => {
                if (sent >= maxReports) return;
                sent += 1;
                const body = JSON.stringify(payload);
                if (navigator.sendBeacon) {
                  const blob = new Blob([body], { type: 'application/json' });
                  navigator.sendBeacon(endpoint, blob);
                  return;
                }
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body,
                  keepalive: true,
                }).catch(() => {});
              };

              window.addEventListener('error', (event) => {
                send({
                  type: 'error',
                  message: event.message || 'Unknown error',
                  stack: event.error && event.error.stack ? String(event.error.stack) : undefined,
                  source: event.filename || undefined,
                  lineno: event.lineno || undefined,
                  colno: event.colno || undefined,
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  timestamp: new Date().toISOString(),
                });
              });

              window.addEventListener('unhandledrejection', (event) => {
                const reason =
                  typeof event.reason === 'string'
                    ? event.reason
                    : event.reason && event.reason.message
                      ? String(event.reason.message)
                      : 'Unhandled promise rejection';
                const stack =
                  event.reason && event.reason.stack ? String(event.reason.stack) : undefined;
                send({
                  type: 'unhandledrejection',
                  message: reason,
                  stack,
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  timestamp: new Date().toISOString(),
                });
              });
            })();
          `}
        </Script>
        <UserProvider>
          <ToastProvider>
            <ConfirmProvider>
              <div className="app-container">
                <main className="flex-1">
                  {children}
                </main>
                <AppUpdateBanner />
                <Navbar />
              </div>
            </ConfirmProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
