import Link from "next/link";
import { ContactFallback } from "@/components/ui/ContactFallback";
import { GuidanceStep } from "@/components/ui/GuidanceStep";
import { getBundle } from "@/modules/guidance/bundles";

// Shared help-type content. Valid emergency types are individual static
// routes (app/help/<slug>/page.tsx) so an unlisted slug matches no route
// and serves a genuine HTTP 404 instead of rendering inside a dynamic
// segment. Copy below is unchanged from the original help pages.
export function HelpTypeContent({
  title,
  intro,
  bundleSlug,
  missingNote,
}: {
  title: string;
  intro: string;
  bundleSlug: string | null;
  missingNote: string | null;
}) {
  const bundle = bundleSlug ? getBundle(bundleSlug) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-xl leading-8 text-zinc-700">{intro}</p>
      </div>

      {bundle ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="First-aid steps">
          <h2 className="text-2xl font-bold">What to do right now</h2>
          <p className="mt-1 text-base text-zinc-600">
            Interim steps · v{bundle.version} ·{" "}
            <strong>DRAFT sample — not clinically reviewed.</strong> Professional help is
            still required.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {bundle.steps.map((s) => (
              <GuidanceStep key={s.order} step={s} />
            ))}
          </ul>
        </section>
      ) : missingNote ? (
        <section
          className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5"
          aria-label="Guidance unavailable"
          role="status"
        >
          <h2 className="text-2xl font-bold text-amber-900">Call for help now</h2>
          <p className="mt-1 text-lg leading-7 text-amber-900">{missingNote}</p>
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Next step">
          <h2 className="text-2xl font-bold">Next step</h2>
          <p className="mt-1 text-lg text-zinc-700">
            Start a short report so the right guidance and status tracking can follow.
          </p>
          <Link
            href="/report"
            className="mt-3 inline-flex min-h-[56px] items-center rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white"
          >
            Start a report
          </Link>
        </section>
      )}

      <ContactFallback />

      <Link
        href="/report"
        className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-[#7F1D1D] px-6 text-xl font-bold text-[#7F1D1D]"
      >
        Report this emergency
      </Link>
    </div>
  );
}
