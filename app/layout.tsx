import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { UserProvider } from "@/context/UserContext";

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
  themeColor: "#FAFAF5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <UserProvider>
          <div className="app-container">
            <main className="flex-1">
              {children}
            </main>
            <Navbar />
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
