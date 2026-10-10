import { ContactFallback } from "@/components/ui/ContactFallback";
import { EmergencyButton } from "@/components/ui/EmergencyButton";
import { FailureBanner } from "@/components/ui/FailureBanner";
import { GuidanceStep } from "@/components/ui/GuidanceStep";
import { StatusPill } from "@/components/ui/StatusPill";
import { INCIDENT_STATUSES } from "@/modules/incidents/status";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Design system</h1>
        <p className="mt-1 text-lg text-zinc-600">
          Urgency-first tokens: warm paper background, deep maroon header/footer, dark-red
          (<span className="font-mono">#7F1D1D</span>) actions on white cards; bright red
          (<span className="font-mono">#C81E1E</span>) reserved for the emergency action and
          Do-not warnings only. 56px+ touch targets; base 16px, guidance at 20px+; status never
          by colour alone — every pill pairs colour with an icon and plain-language label.
        </p>
      </div>

      <Section title="Emergency action">
        <EmergencyButton />
      </Section>

      <Section title="Status language (PRD §9 — request ≠ acknowledgement ≠ dispatch)">
        <div className="flex flex-wrap gap-2">
          {INCIDENT_STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Guidance step">
        <ul className="flex flex-col gap-3">
          <GuidanceStep
            step={{
              order: 1,
              do: "Apply firm pressure with a clean cloth.",
              dont: "Do not remove soaked cloths; add more on top.",
            }}
          />
        </ul>
        <p className="text-base text-zinc-600">
          Version footer pattern: title · version · review state · “professional help still required”.
        </p>
      </Section>

      <Section title="Failure and fallback states">
        <FailureBanner
          title="Report not sent"
          detail="The network failed. Nothing was delivered — your report is still on this device. Try again or call directly."
          actionLabel="Retry"
          actionHref="/report"
        />
        <ContactFallback />
      </Section>
    </div>
  );
}
