import { db } from "@/lib/db";
import { CoordinationStore, type CoordinationPort } from "@/modules/coordination/store";
import type { IncidentStore } from "@/modules/incidents/repository";
import { MemoryIncidentStore } from "@/modules/incidents/memory-store";
import { PrismaCoordinationStore } from "@/lib/prisma-coordination-store";
import { PrismaIncidentStore } from "@/lib/prisma-incident-store";

const memoryIncidents = new MemoryIncidentStore();
const memoryCoordination = new CoordinationStore();
const prismaIncidents = new PrismaIncidentStore(db);
const prismaCoordination = new PrismaCoordinationStore(db);

let warnedNoUrl = false;

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

function warnNoUrl(label: string): void {
  if (!warnedNoUrl) {
    warnedNoUrl = true;
    console.warn(
      `[stores] No DATABASE_URL — ${label} uses volatile in-memory storage (dev only, data is lost on restart).`,
    );
  }
}

function warnUnreachable(label: string): void {
  console.warn(
    `[stores] DATABASE_URL is set but unreachable. ` +
      `${label} falls back to volatile in-memory storage for local development. ` +
      `Start the database or unset DATABASE_URL; production never falls back.`,
  );
}

// Connectivity probe without wall-clock reads: Next 16 treats Date.now()
// as unstable during prerender, so re-probing is counted, not timed
// (dev only; production never probes).
const REPROBE_EVERY = 50;
let resolutionsSinceProbe = REPROBE_EVERY; // probe on first use
let lastProbeOk = false;
let justProbed = false;

async function dbReachable(): Promise<boolean> {
  if (resolutionsSinceProbe < REPROBE_EVERY) {
    resolutionsSinceProbe += 1;
    justProbed = false;
    return lastProbeOk;
  }
  resolutionsSinceProbe = 1;
  justProbed = true;
  try {
    await db.$queryRaw`SELECT 1`;
    lastProbeOk = true;
    return true;
  } catch {
    lastProbeOk = false;
    return false;
  }
}

function select<T extends object>(label: string, prisma: T, memory: T): T {
  const call = async (backend: T, method: keyof T, args: unknown[]): Promise<unknown> => {
    const fn = backend[method] as unknown as (...a: unknown[]) => Promise<unknown>;
    return fn.apply(backend, args);
  };
  return new Proxy({} as T, {
    get(_target, prop) {
      const method = prop as keyof T;
      return (...args: unknown[]) => decide(label, prisma, memory, method, args);
    },
  });

  async function decide(
    lbl: string,
    p: T,
    m: T,
    meth: keyof T,
    args: unknown[],
  ): Promise<unknown> {
    const url = process.env["DATABASE_URL"];
    if (!url) {
      if (isProduction()) {
        throw new Error(
          "DATABASE_URL is not configured. Refusing to serve " +
            `${lbl} from volatile memory in production.`,
        );
      }
      warnNoUrl(lbl);
      return call(m, meth, args);
    }
    if (isProduction()) {
      // Production: connection errors surface as honest failures.
      return call(p, meth, args);
    }
    if (await dbReachable()) {
      // Reachable: Prisma errors surface honestly (no silent split-brain).
      return call(p, meth, args);
    }
    // Warn once per probe cycle, not on every call.
    if (justProbed) warnUnreachable(lbl);
    return call(m, meth, args);
  }
}

/**
 * Storage selector. Production fails closed without DATABASE_URL and never
 * silently substitutes memory. Development uses Postgres when reachable and
 * warns loudly otherwise. Tests import the memory classes directly.
 */
export function getIncidentStore(): IncidentStore {
  return select<IncidentStore>("incidents", prismaIncidents, memoryIncidents);
}

export function getCoordinationStore(): CoordinationPort {
  return select<CoordinationPort>("coordination", prismaCoordination, memoryCoordination);
}
