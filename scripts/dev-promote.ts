// Dev-only staff elevation. The person signs up normally first (public
// BYSTANDER role, their own password — this script never sees credentials),
// then a developer elevates that account on the LOCAL database only.
//
// Refuses to run in production and refuses non-loopback DATABASE_URLs, so
// it cannot touch staging or production data. Seeded staff rows carry no
// passwords and can never sign in; elevate a real sign-up instead.
//
// Usage: npx tsx scripts/dev-promote.ts user@example.com
import { PrismaClient } from "@prisma/client";
import { isLocalDatabaseUrl, parsePromoteArgs } from "../lib/staff-provision";

async function main(): Promise<void> {
  if (process.env["NODE_ENV"] === "production") {
    console.error("dev-promote refuses to run in production.");
    process.exit(1);
  }
  if (!isLocalDatabaseUrl(process.env["DATABASE_URL"])) {
    console.error("dev-promote refuses: DATABASE_URL is not a loopback database.");
    process.exit(1);
  }
  let args: { email: string };
  try {
    args = parsePromoteArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: args.email } });
    if (!user) {
      console.error(`No account for ${args.email}: sign up through the app first.`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { email: args.email },
      data: { role: "SYSTEM_ADMIN" },
    });
    console.log(`Elevated ${args.email} to SYSTEM_ADMIN on the local dev database.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
