// Daily video adapter (server-only). Creates private per-incident rooms and
// issues short-lived, participant-scoped meeting tokens. The API key never
// leaves the server: browsers receive only a room URL plus their own token.
import { isDemoMode } from "@/lib/demo-mode";

export interface DailyConfig {
  apiKey: string;
  apiBase: string;
}

export function dailyConfig(): DailyConfig | null {
  const apiKey = process.env["DAILY_API_KEY"]?.trim() ?? "";
  if (!apiKey) return null;
  return {
    apiKey,
    apiBase: (process.env["DAILY_API_BASE"]?.trim() || "https://api.daily.co/v1").replace(/\/$/, ""),
  };
}

export function isDailyConfigured(): boolean {
  const explicitlyEnabledForDevelopment =
    process.env["NODE_ENV"] === "development" &&
    process.env["DAILY_ENABLED"] === "true";
  return (
    dailyConfig() !== null &&
    (explicitlyEnabledForDevelopment || !isDemoMode())
  );
}

export class DailyError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "DailyError";
    this.status = status;
  }
}

/** Deterministic room name per incident: no storage, no collisions. */
export function roomNameForIncident(incidentId: string): string {
  const safe = incidentId.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return `emergency-${safe || "room"}`;
}

export interface RoomInfo {
  name: string;
  url: string;
}

async function dailyFetch(
  config: DailyConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(`${config.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new DailyError(502, "Video provider is unreachable.");
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new DailyError(res.status >= 500 ? 502 : 422, "Video provider rejected the request.");
  }
  return res.json().catch(() => ({}));
}

/** Get the incident room, creating it (private, 2h expiry) when missing. */
export async function getOrCreateRoom(
  incidentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RoomInfo> {
  const config = dailyConfig();
  if (!config || !isDailyConfigured()) {
    throw new DailyError(503, "Video provider is not configured.");
  }
  const name = roomNameForIncident(incidentId);
  const existing = (await dailyFetch(config, `/rooms/${name}`, { method: "GET" }, fetchImpl)) as {
    url?: string;
  } | null;
  if (existing?.url) return { name, url: existing.url };
  const created = (await dailyFetch(
    config,
    "/rooms",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        privacy: "private",
        properties: {
          exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
          eject_at_room_exp: true,
          enable_prejoin_ui: false,
        },
      }),
    },
    fetchImpl,
  )) as { url?: string };
  if (!created?.url) throw new DailyError(502, "Video provider returned no room URL.");
  return { name, url: created.url };
}

export type CallParticipant = "patient" | "doctor";

/** Issue a meeting token scoped to one room and one participant. */
export async function issueMeetingToken(
  roomName: string,
  participant: CallParticipant,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ token: string }> {
  const config = dailyConfig();
  if (!config || !isDailyConfigured()) {
    throw new DailyError(503, "Video provider is not configured.");
  }
  const created = (await dailyFetch(
    config,
    "/meeting-tokens",
    {
      method: "POST",
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: `${participant}:${userId}`.slice(0, 64),
          is_owner: participant === "doctor",
        },
      }),
    },
    fetchImpl,
  )) as { token?: string };
  if (!created?.token) throw new DailyError(502, "Video provider returned no meeting token.");
  return { token: created.token };
}
