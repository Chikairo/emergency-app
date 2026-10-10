import { getIncidentStore } from "@/lib/stores";
import type { IncidentStore } from "@/modules/incidents/repository";

// Stable import surface; every access resolves the current backend
// (Prisma when DATABASE_URL is set, guarded memory in dev). Methods stay
// bound so `this` always refers to the live backend.
export const incidentStore: IncidentStore = new Proxy({} as IncidentStore, {
  get(_target, prop) {
    const backend = getIncidentStore() as unknown as Record<string | symbol, unknown>;
    const value = backend[prop];
    return typeof value === "function" ? value.bind(backend) : value;
  },
});
