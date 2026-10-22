"use client";

import Link from "next/link";
import { EmergencyStartButton } from "@/components/emergency/EmergencyStartButton";
import { InstallApp } from "@/components/pwa/InstallApp";

const GUIDANCE_CARDS = [
  {
    slug: "severe-bleeding",
    title: "Severe bleeding",
    icon: "🩸",
  },
  {
    slug: "difficulty-breathing",
    title: "Can't breathe",
    icon: "🫁",
  },
  {
    slug: "unconscious",
    title: "Unconscious person",
    icon: "🧍",
  },
  {
    slug: "other",
    title: "Something else",
    icon: "⚠️",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#17283c] font-sans">
      <header className="sticky top-0 z-40 flex min-h-[70px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#e7edf4] bg-white px-4 py-3 sm:px-[clamp(14px,4vw,50px)]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ed343b] text-[22px] text-white">
            ✚
          </div>
          <div className="min-w-0">
            <div className="font-black text-lg text-[#142b43]">Emergency Care</div>
            <div className="text-[10px] font-medium text-[#718096] sm:text-[11px]">
              One tap sends an emergency alert
            </div>
          </div>
        </div>
        <nav
          aria-label="Main navigation"
          className="ml-auto flex max-w-full items-center gap-1 rounded-[11px] bg-[#f0f3f7] p-1 max-[380px]:w-full max-[380px]:justify-center"
        >
          <Link
            href="/"
            aria-current="page"
            className="min-h-10 rounded-[8px] border-0 bg-white px-3 py-2 text-xs font-bold text-[#142b43] shadow-sm sm:px-[13px] sm:text-sm"
          >
            Client app
          </Link>
          <Link
            href="/sign-in?next=/ops"
            aria-label="Staff sign in"
            className="min-h-10 rounded-[8px] border-0 bg-transparent px-3 py-2 text-xs font-bold text-[#607086] transition-colors hover:bg-white/50 sm:px-[13px] sm:text-sm"
          >
            Staff sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-[22px] sm:py-[34px]">
        <section className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-[25px]">
          <div>
            <div className="mb-[14px] text-[12px] font-bold uppercase tracking-wider text-[#c51f2b]">
              ● Here when every second matters
            </div>
            <h1 className="mb-[14px] text-[clamp(34px,4vw,50px)] font-bold leading-[1.08] tracking-tighter text-[#17283c]">
              Help is closer
              <br />
              than you think.
            </h1>
            <p className="mb-[24px] max-w-[470px] text-[16px] leading-relaxed text-[#718096] sm:text-[17px]">
              One tap records an emergency alert. Dispatch status and any ambulance confirmation
              are shown as authorized staff update them.
            </p>
            <div className="mb-[24px] grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-[10px]">
              {GUIDANCE_CARDS.map((card) => (
                <Link
                  key={card.slug}
                  href={`/help/${card.slug}`}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-[16px] border border-[#e7edf4] bg-white p-3 text-center shadow-sm transition-colors hover:border-[#f2a3a6] hover:bg-[#fff8f8] sm:rounded-[18px] sm:p-[13px]"
                >
                  <span className="text-2xl">{card.icon}</span>
                  <span className="mt-1 break-words text-[11px] font-black sm:text-[12px]">{card.title}</span>
                  <span className="text-[10px] leading-tight text-[#718096]">
                    {card.slug === "severe-bleeding"
                      ? "Heavy or spurting blood"
                      : card.slug === "difficulty-breathing"
                        ? "Choking or gasping"
                        : card.slug === "unconscious"
                          ? "Not awake or responding"
                          : "Any other emergency"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-[26px] border border-[#e7edf4] bg-white px-4 py-8 shadow-sm sm:min-h-[420px]">
              <div aria-hidden="true" className="absolute left-1/2 top-[-90px] h-[180px] w-[290px] -translate-x-1/2 rounded-b-full bg-[#fff0f0]" />
              <div className="relative z-10 text-center">
                <div className="text-xl font-black text-[#142b43]">Emergency Care</div>
                <div className="mt-[2px] text-sm text-[#718096]">One tap to send an emergency alert</div>
                <EmergencyStartButton />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-[25px]">
          <article className="rounded-[18px] border border-[#e7edf4] bg-white p-4 shadow-sm sm:p-[17px]">
            <h2 className="mb-[10px] text-lg font-bold text-[#17283c]">What happens next?</h2>
            <p className="mb-[14px] text-sm leading-relaxed text-[#718096]">
              Coordination begins immediately. No long form before help starts.
            </p>
            <div className="space-y-[10px]">
              {[
                { icon: "✓", title: "Incident registered", desc: "Your request is recorded for the response team." },
                { icon: "📍", title: "Location shared when available", desc: "You can review or correct the location." },
                { icon: "☎", title: "Dispatch review begins", desc: "Authorized staff review the request and record availability." },
              ].map((step) => (
                <div key={step.title} className="flex items-start gap-[10px]">
                  <span className="mt-[2px] grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#fff0f0] text-sm font-bold text-[#ed343b]">{step.icon}</span>
                  <div>
                    <b className="text-sm text-[#17283c] block">{step.title}</b>
                    <small className="text-[10px] text-[#718096] block">{step.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[18px] border border-[#e7edf4] bg-white p-4 shadow-sm sm:p-[17px]">
            <h2 className="mb-[10px] text-lg font-bold text-[#17283c]">Quick guidance</h2>
            <p className="mb-[14px] text-sm leading-relaxed text-[#718096]">
              Optional information links&mdash;not steps you must complete before asking for help.
            </p>
            <div className="flex flex-wrap gap-[10px] mb-[14px]">
              {[
                { title: "Severe bleeding", slug: "severe-bleeding" },
                { title: "Breathing difficulty", slug: "difficulty-breathing" },
                { title: "Unconscious person", slug: "unconscious" },
                { title: "Other emergency", slug: "other" },
              ].map((label) => (
                <Link
                  key={label.slug}
                  href={`/help/${label.slug}`}
                  className="inline-flex min-h-10 items-center rounded-[11px] border border-[#e7edf4] bg-white px-3 py-2 text-xs font-semibold text-[#17283c] transition-colors hover:bg-[#f5f7fb] sm:px-[13px] sm:text-sm"
                >
                  {label.title}
                </Link>
              ))}
            </div>
            <p className="mt-[10px] text-[10px] text-[#718096]">
              <strong>DRAFT SAMPLE — NOT clinically reviewed.</strong> Not a substitute for emergency services.
            </p>
          </article>
        </section>
      </main>

      <InstallApp />
    </div>
  );
}