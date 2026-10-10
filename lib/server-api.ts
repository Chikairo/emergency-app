import { headers } from "next/headers";

// Server-component HTTP client for our own API routes. Pages never import
// storage directly: in serverless and multi-worker runtimes each module
// graph has its own memory, so the Route Handlers are the single
// data-access layer. Session cookies are forwarded so guards keep working.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const h = await headers();
  const res = await fetch(`${await baseUrl()}${path}`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (res.status === 404) throw new ApiError(404, `Not found: ${path}`);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, data?.error ?? `Request failed: ${path}`);
  }
  return (await res.json()) as T;
}
