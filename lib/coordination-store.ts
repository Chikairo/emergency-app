import { getCoordinationStore } from "@/lib/stores";
import type { CoordinationPort } from "@/modules/coordination/store";

// Stable import surface with the same fail-closed selector behaviour.
export const coordinationStore: CoordinationPort = new Proxy({} as CoordinationPort, {
  get(_target, prop) {
    const backend = getCoordinationStore() as unknown as Record<string | symbol, unknown>;
    const value = backend[prop];
    return typeof value === "function" ? value.bind(backend) : value;
  },
});
