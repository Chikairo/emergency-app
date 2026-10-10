import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EmergencyButton } from "@/components/ui/EmergencyButton";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
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
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <OfflineBanner />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
          <main className="flex flex-1 flex-col gap-6">{children}</main>
          <footer className="border-t border-zinc-200 pt-4 text-base text-zinc-600">
            <p className="font-semibold">Emergency Care — demo build (mock services).</p>
            <p>
              Not a replacement for emergency numbers or hospitals. Always call your local
              emergency number directly in a real emergency.
            </p>
          </footer>
        </div>
        <div className="sticky bottom-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <EmergencyButton />
          </div>
        </div>
      </body>
    </html>
  );
}
