// Development seed — fictional data only. Never real patient information.
// Guidance bundles are DRAFT SAMPLEs, NOT clinically reviewed.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  { name: "Ama Patient", email: "patient@example.com", role: "PATIENT" },
  { name: "Ben Bystander", email: "bystander@example.com", role: "BYSTANDER" },
  { name: "Rosa Responder", email: "responder@example.com", role: "RESPONDER" },
  { name: "Dr. Mina Pro", email: "medpro@example.com", role: "MEDICAL_PROFESSIONAL" },
  { name: "Dan Dispatcher", email: "dispatcher@example.com", role: "DISPATCHER" },
  { name: "Hana Hospital", email: "hospital@example.com", role: "HOSPITAL_ADMIN" },
  { name: "Sam System", email: "sysadmin@example.com", role: "SYSTEM_ADMIN" },
] as const;

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role as never },
      create: { name: u.name, email: u.email, role: u.role as never },
    });
  }

  const facility = await prisma.facility.upsert({
    where: { id: "seed-sample-hospital" },
    update: {},
    create: {
      id: "seed-sample-hospital",
      type: "HOSPITAL",
      name: "Sample General Hospital (fictional)",
      capabilities: ["emergency", "surgery"],
      availability: "unknown",
      contactName: "Fictional Intake Desk",
      contactPhone: "+000-000-0000",
      addressText: "1 Example Road, Mock City",
      latitude: 0,
      longitude: 0,
    },
  });

  await prisma.user.update({
    where: { email: "hospital@example.com" },
    data: { facilityId: facility.id },
  });

  await prisma.responderProfile.upsert({
    where: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: "responder@example.com" } })).id },
    update: {},
    create: {
      userId: (await prisma.user.findUniqueOrThrow({ where: { email: "responder@example.com" } })).id,
      capabilities: ["first-aid"],
      availability: "available",
      status: "APPROVED",
    },
  });

  await prisma.regionConfig.upsert({
    where: { code: "pilot-mock" },
    update: {},
    create: {
      code: "pilot-mock",
      name: "Pilot Mock Region (no real services)",
      emergencyNumber: "000-MOCK",
      languages: ["en"],
      features: {
        partnerDispatch: false,
        livePro: false,
        responderAlerts: false,
        hospitalRecommend: false,
      },
    },
  });

  const bundles = [
    {
      slug: "sample-bleeding",
      title: "[SAMPLE-NOT-REVIEWED] Severe bleeding interim steps",
      steps: [
        { order: 1, do: "Call the local emergency number immediately (mock: 000-MOCK).", dont: "Do not delay calling to search for supplies." },
        { order: 2, do: "Apply firm pressure with a clean cloth.", dont: "Do not remove soaked cloths; add more on top." },
      ],
    },
    {
      slug: "sample-choking",
      title: "[SAMPLE-NOT-REVIEWED] Choking interim steps",
      steps: [
        { order: 1, do: "Ask if the person can cough or speak; call emergency number (mock: 000-MOCK).", dont: "Do not perform blind finger sweeps." },
      ],
    },
  ];
  for (const b of bundles) {
    await prisma.guidanceBundle.upsert({
      where: { slug_version_locale: { slug: b.slug, version: 1, locale: "en" } },
      update: {},
      create: { slug: b.slug, version: 1, locale: "en", title: b.title, steps: b.steps, status: "DRAFT" },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    facilities: await prisma.facility.count(),
    guidance: await prisma.guidanceBundle.count(),
    regions: await prisma.regionConfig.count(),
  };
  console.log("Seed OK (fictional):", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
