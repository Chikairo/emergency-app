"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Silent periodic refresh for staff lists (incoming incidents). Uses the
// existing router.refresh data path — no new realtime infrastructure, no
// writes, unmounted cleanly.
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
