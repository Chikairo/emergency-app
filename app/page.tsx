import Link from "next/link";
import { ContactFallback } from "@/components/ui/ContactFallback";
import { EmergencyButton } from "@/components/ui/EmergencyButton";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold leading-10">
          Help is on the way. Here&apos;s what to do meanwhile.
        </h1>
        <p className="mt-2 text-xl leading-8 text-zinc-700">
          Report an emergency in under a minute, get clear interim guidance, and track
          honest status updates. Nothing here replaces calling your local emergency number.
        </p>
        <div className="mt-5">
          <EmergencyButton />
        </div>
        <p className="mt-3 text-lg text-zinc-600">
          3 quick questions at most — you can skip them and get help immediately.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/guidance" className="rounded-2xl bg-white p-5 shadow-sm hover:shadow">
          <p className="text-xl font-bold">First-aid guidance</p>
          <p className="mt-1 text-lg text-zinc-600">
            Saved, versioned interim steps. Sample content — not clinically reviewed.
          </p>
        </Link>
        <Link href="/design" className="rounded-2xl bg-white p-5 shadow-sm hover:shadow">
          <p className="text-xl font-bold">Design system</p>
          <p className="mt-1 text-lg text-zinc-600">
            Buttons, status pills, guidance steps, and failure states.
          </p>
        </Link>
      </section>

      <ContactFallback />
    </div>
  );
}
