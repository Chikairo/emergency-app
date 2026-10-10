import type { GuidanceStep as Step } from "@/modules/guidance/bundles";

export function GuidanceStep({ step }: { step: Step }) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-zinc-500">Step {step.order}</p>
      <p className="mt-1 text-xl leading-8 text-zinc-900">{step.do}</p>
      <p className="mt-2 border-l-4 border-[#C81E1E] pl-3 text-lg text-zinc-700">
        Don&apos;t: {step.dont}
      </p>
    </li>
  );
}
