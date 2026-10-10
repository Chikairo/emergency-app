import Link from "next/link";

export function EmergencyButton({ href = "/report" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Report an emergency now"
      className="flex min-h-[64px] w-full items-center justify-center rounded-2xl bg-[#C81E1E] px-8 text-2xl font-bold text-white shadow-lg transition-colors hover:bg-[#A61717] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#C81E1E]"
    >
      Report emergency
    </Link>
  );
}
