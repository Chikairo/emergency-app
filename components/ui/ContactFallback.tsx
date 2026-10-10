export function ContactFallback({ number = "000-MOCK" }: { number?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-lg text-zinc-700">
        Online contact is unavailable in this demo. Call your local emergency number directly:
      </p>
      <a
        href={`tel:${number}`}
        className="mt-3 flex min-h-[56px] items-center justify-center rounded-xl bg-[#0E7C3E] px-6 text-2xl font-bold text-white"
      >
        Call {number}
      </a>
      <p className="mt-2 text-base text-zinc-600">
        Mock build: tapping call does not notify any real service. Your report and location stay on this device.
      </p>
    </div>
  );
}
