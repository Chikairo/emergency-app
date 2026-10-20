import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { AuthStatusSlot } from "@/components/auth/AuthStatusSlot";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emergency Care",
  description: "Send an emergency alert and follow server-confirmed response updates.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Emergency Care",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f5f7fb] text-[#17283c]">
        <RegisterSW />
        <OfflineBanner />
        <RouteChrome
          authStatus={
            <Suspense fallback={null}>
              <AuthStatusSlot />
            </Suspense>
          }
        >
          {children}
        </RouteChrome>
      </body>
    </html>
  );
}
