/**
 * Root layout — wraps every page with global styles, PWA metadata, and the
 * ConnectionStatusBar that shows online/offline/syncing state at the top.
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConnectionStatusBar } from "@/components/connection-status";

export const metadata: Metadata = {
  title: "SPONSApp - Warehouse Survey",
  description: "Voice-driven lifecycle costing for warehouse surveys",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPONSApp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <ConnectionStatusBar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
