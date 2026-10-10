import { GuidanceStep } from "@/components/ui/GuidanceStep";
import { GUIDANCE_BUNDLES } from "@/modules/guidance/bundles";

export default function GuidancePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">First-aid guidance</h1>
      <p className="text-lg text-zinc-600">
        Saved interim steps for when you have no connection. Sample content only —{" "}
        <strong>not clinically reviewed</strong>. Professional help is always still required.
      </p>
      {GUIDANCE_BUNDLES.map((b) => (
        <section key={b.slug} className="rounded-2xl bg-white p-5 shadow-sm" aria-label={b.title}>
          <h2 className="text-2xl font-bold">{b.title}</h2>
          <p className="mt-1 text-base text-zinc-600">
            v{b.version} · {b.locale} · {b.status} · {b.offlineCapable ? "available offline" : "online only"}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {b.steps.map((s) => (
              <GuidanceStep key={s.order} step={s} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
