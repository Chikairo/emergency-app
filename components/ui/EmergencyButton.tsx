import Link from "next/link";

const BAR_CLASS =
  "flex min-h-[64px] w-full items-center justify-center rounded-2xl bg-[#dc2626] px-8 text-2xl font-bold text-white shadow-lg transition-colors hover:bg-[#b91c1c] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#dc2626]";

// Prominent circular emergency call-to-action for the home screen. The
// sticky bottom bar keeps using the rectangular variant.
const CIRCLE_CLASS =
  "flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-full bg-[#dc2626] text-white shadow-2xl ring-8 ring-[#dc2626]/30 transition-colors hover:bg-[#b91c1c] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#dc2626]";

export function EmergencyButton({
  href = "/report",
  variant = "bar",
}: {
  href?: string;
  variant?: "bar" | "circle";
}) {
  if (variant === "circle") {
    return (
      <Link href={href} aria-label="Report an emergency now" className={CIRCLE_CLASS}>
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl">🔔</span>
        </div>
        <span className="px-4 text-center text-2xl font-bold leading-7">
          I NEED EMERGENCY HELP
        </span>
      </Link>
    );
  }
  return (
    <Link href={href} aria-label="Report an emergency now" className={BAR_CLASS}>
      Report emergency
    </Link>
  );
}
