import { MemoryDemoStore } from "@/modules/demo/store";

const globalForDemo = globalThis as unknown as { demoStore?: MemoryDemoStore };

// Demo sessions are intentionally ephemeral and single-server: they exist
// for a live rehearsal, not as records. Production pilot flows keep using
// the incident stores, never this demo store.
export const demoStore = globalForDemo.demoStore ?? new MemoryDemoStore();

if (process.env.NODE_ENV !== "production") {
  globalForDemo.demoStore = demoStore;
}
