"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DemoView {
  id: string;
  destination: string;
  status: string;
  progress: number;
  etaMinutes: number;
  doctorContacted: boolean;
  consultationPreviewed: boolean;
  events: { id: string; at: string; kind: string; label: string; actor: string }[];
  role: "patient" | "agency";
}

interface UseDemo {
  demo: DemoView | null;
  loading: boolean;
  error: string | null;
  act: (action: string, note?: string) => Promise<boolean>;
  refresh: () => void;
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Shared polling hook: both browsers read the same session through the API
// every 2.5s. No localStorage, no component-state sharing across devices.
export function useDemo(id: string, token: string): UseDemo {
  const [demo, setDemo] = useState<DemoView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const loadDemo = useCallback(async (): Promise<DemoView> => {
    const res = await fetch(`/api/demo/${id}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Demo session unavailable.");
    }
    const data = (await res.json()) as { demo: DemoView };
    return data.demo;
  }, [id, token]);

  const refresh = useCallback(async () => {
    try {
      setDemo(await loadDemo());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo session unavailable.");
    } finally {
      setLoading(false);
    }
  }, [loadDemo]);

  useEffect(() => {
    // Promise callbacks (not the effect body) own state updates here.
    loadDemo().then(
      (demo) => {
        setDemo(demo);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : "Demo session unavailable.");
        setLoading(false);
      },
    );
    timer.current = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [loadDemo, refresh]);

  const act = useCallback(
    async (action: string, note?: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/demo/${id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, token, note, idempotencyKey: newKey() }),
        });
        const data = (await res.json().catch(() => null)) as {
          demo?: DemoView;
          error?: string;
        } | null;
        if (!res.ok || !data?.demo) throw new Error(data?.error ?? "Action failed.");
        setDemo(data.demo);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
        return false;
      }
    },
    [id, token],
  );

  return { demo, loading, error, act, refresh };
}
