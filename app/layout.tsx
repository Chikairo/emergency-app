import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { EmergencyButton } from "@/components/ui/EmergencyButton";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { AuthStatusSlot } from "@/components/auth/AuthStatusSlot";
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
  title: "Emergency Care — While Help Is on the Way",
  description:
    "Report an emergency and follow safe interim guidance while professional help is arranged.",
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
  themeColor: "#2B0A0A",
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
      <body className="flex min-h-full flex-col bg-[#FAF6F2] text-[#2A1414]">
        <RegisterSW />
        <OfflineBanner />
        <header className="bg-gradient-to-r from-[#2B0A0A] to-[#5C1A1A] px-4 py-4 text-white shadow-md">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold leading-7">Emergency Care</p>
              <p className="text-base text-red-100">While help is on the way · demo build (mock services)</p>
            </div>
            <span className="rounded-full border border-red-200/50 px-3 py-1 text-sm font-semibold text-red-100">
              MOCK
            </span>
            <Suspense fallback={null}>
              <AuthStatusSlot />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 pb-28">
          <main className="flex flex-1 flex-col gap-6">{children}</main>
          <footer className="rounded-2xl bg-[#2B1212] p-5 text-base text-red-50">
            <p className="font-semibold">Emergency Care — demo build (mock services).</p>
            <p className="mt-1">
              Not a replacement for emergency numbers or hospitals. Always call your local
              emergency number directly in a real emergency.
            </p>
          </footer>
        </div>
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#5C1A1A] bg-white/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <EmergencyButton />
          </div>
        </div>
      </body>
    </html>
  );
}
