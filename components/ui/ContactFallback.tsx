import { resolveEmergencyNumber } from "@/modules/contact/emergency-number";

// Real phone-call handoff. The number comes from NEXT_PUBLIC_EMERGENCY_NUMBER
// and is shown as a tappable tel: link ONLY when genuinely configured —
// mock or unspecified values never become dial links.
export function ContactFallback({
  number,
  compact = false,
}: {
  number?: string;
  compact?: boolean;
}) {
  const resolved = resolveEmergencyNumber(
    number ?? process.env["NEXT_PUBLIC_EMERGENCY_NUMBER"],
  );

  if (!resolved.configured) {
    if (compact) {
      return (
        <p className="text-center text-sm text-slate-600">
          No emergency number is configured in this app. In a real emergency, call your local
          emergency number directly from your phone.
        </p>
      );
    }
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xl font-bold text-zinc-900">Call for help directly</p>
        <p className="mt-1 text-lg text-zinc-700">
          In a real emergency, call your local emergency number directly from your phone.
        </p>
        <p className="mt-2 text-base text-zinc-600">
          This build has no emergency number configured, so there is no call button here.
          Online contact through this app is not operational.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <a
        href={resolved.telHref ?? undefined}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0E7C3E] px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#0b6834]"
      >
        <span aria-hidden="true">☎</span>
        Call emergency services
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-lg text-zinc-700">
        Emergency call — tapping dials {resolved.display} directly on this device:
      </p>
      <a
        href={resolved.telHref ?? undefined}
        className="mt-3 flex min-h-[56px] items-center justify-center rounded-xl bg-[#0E7C3E] px-6 text-2xl font-bold text-white"
      >
        Call {resolved.display}
      </a>
      <p className="mt-2 text-base text-zinc-600">
        This dials only the number above. Online contact through this app is not operational.
      </p>
    </div>
  );
}
