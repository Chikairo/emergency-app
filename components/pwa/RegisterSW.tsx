"use client";

import { useSyncExternalStore } from "react";

// Module-level registration state shared by all consumers. useSyncExternalStore
// keeps this lint-clean (no setState-in-effect) and safe under StrictMode.
type SWStatus = "pending" | "ready" | "unsupported";

let status: SWStatus = "pending";
let started = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

function setStatus(next: SWStatus): void {
  if (status === next) return;
  status = next;
  emit();
}

function ensureRegistered(): void {
  if (started) return;
  started = true;
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    process.env.NODE_ENV !== "production"
  ) {
    setStatus("unsupported");
    return;
  }
  navigator.serviceWorker.register("/sw.js").then(
    () => setStatus("ready"),
    () => setStatus("unsupported"),
  );
}

// Registers /sw.js in production only (dev keeps network-only behavior so
// caching never masks code changes). Never caches private data (policy in
// public/sw.js).
export function useServiceWorker(): SWStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      ensureRegistered();
      return () => {
        listeners.delete(cb);
      };
    },
    () => status,
    () => "pending",
  );
}

export function RegisterSW() {
  useServiceWorker();
  return null;
}
