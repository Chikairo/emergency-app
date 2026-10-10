import Link from "next/link";

// Served from cache when the network is gone. Never claims an emergency
// request can reach anyone offline.
export default function OfflinePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">You are offline</h1>
      <p className="text-xl leading-8 text-zinc-700">
        Emergency requests, responder updates, and hospital coordination need a connection and
        have <strong>not</strong> been sent. If this is a real emergency, call your local
        emergency number directly — do not wait for the connection.
      </p>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold">Still available offline</h2>
        <p className="mt-1 text-lg text-zinc-600">Saved first-aid guidance on this device:</p>
        <Link href="/guidance" className="mt-3 inline-flex min-h-[56px] items-center rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white">
          Open saved guidance
        </Link>
      </div>
    </div>
  );
}
