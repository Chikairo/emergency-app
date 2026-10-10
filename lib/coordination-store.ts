import { CoordinationStore } from "@/modules/coordination/store";

const globalForCoord = globalThis as unknown as {
  coordinationStore?: CoordinationStore;
};

// Dev/DB-free singleton; a Prisma-backed implementation slots in later.
export const coordinationStore =
  globalForCoord.coordinationStore ?? new CoordinationStore();

if (process.env.NODE_ENV !== "production") {
  globalForCoord.coordinationStore = coordinationStore;
}
