// Approved-guidance catalogue for DB-free development.
// Entries mirror prisma/seed.ts and are DRAFT SAMPLEs — NOT clinically
// reviewed. Never present as medically approved.

export interface GuidanceStep {
  order: number;
  do: string;
  dont: string;
}

export interface GuidanceBundle {
  slug: string;
  version: number;
  locale: string;
  title: string;
  steps: GuidanceStep[];
  status: "DRAFT" | "APPROVED" | "ARCHIVED";
  reviewedAt: string | null;
  offlineCapable: boolean;
}

export const GUIDANCE_BUNDLES: GuidanceBundle[] = [
  {
    slug: "sample-bleeding",
    version: 1,
    locale: "en",
    title: "[SAMPLE-NOT-REVIEWED] Severe bleeding interim steps",
    steps: [
      {
        order: 1,
        do: "Call the local emergency number immediately (mock: 000-MOCK).",
        dont: "Do not delay calling to search for supplies.",
      },
      {
        order: 2,
        do: "Apply firm pressure with a clean cloth.",
        dont: "Do not remove soaked cloths; add more on top.",
      },
    ],
    status: "DRAFT",
    reviewedAt: null,
    offlineCapable: true,
  },
  {
    slug: "sample-choking",
    version: 1,
    locale: "en",
    title: "[SAMPLE-NOT-REVIEWED] Choking interim steps",
    steps: [
      {
        order: 1,
        do: "Ask if the person can cough or speak; call emergency number (mock: 000-MOCK).",
        dont: "Do not perform blind finger sweeps.",
      },
    ],
    status: "DRAFT",
    reviewedAt: null,
    offlineCapable: true,
  },
];

export function getBundle(slug: string, locale = "en"): GuidanceBundle | null {
  return (
    GUIDANCE_BUNDLES.find((b) => b.slug === slug && b.locale === locale) ?? null
  );
}
