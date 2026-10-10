import { MemoryIncidentStore } from "@/modules/incidents/memory-store";

const globalForStore = globalThis as unknown as {
  incidentStore?: MemoryIncidentStore;
};

// Dev/DB-free singleton. The Prisma adapter will replace this behind the
// same IncidentStore interface once a database is available.
export const incidentStore =
  globalForStore.incidentStore ?? new MemoryIncidentStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.incidentStore = incidentStore;
}
