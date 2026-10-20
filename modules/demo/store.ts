import { randomUUID } from "node:crypto";
import { illustrativeEtaMinutes } from "./geo";
import { demoActionSchema, type DemoAction, type DemoDestination } from "./validation";

// Demo incident state machine. All movement is simulated and agency-driven:
// progress only changes on explicit agency actions, never on timers.
export type DemoStatus =
  | "LAUNCHED"
  | "AVAILABILITY_REQUESTED"
  | "DECLINED"
  | "APPROVED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "CLOSED";

export type DemoRole = "patient" | "agency";

export interface DemoEvent {
  id: string;
  at: Date;
  kind: string;
  label: string;
  actor: DemoRole | "system";
}

export interface DemoSession {
  id: string;
  destination: DemoDestination;
  status: DemoStatus;
  progress: number; // 0-100, simulated
  etaMinutes: number; // illustrative, derived from progress
  patientToken: string;
  agencyToken: string;
  doctorContacted: boolean;
  consultationPreviewed: boolean;
  events: DemoEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export class DemoError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DemoError";
    this.code = code;
  }
}

function event(session: DemoSession, kind: string, label: string, actor: DemoEvent["actor"]): void {
  session.events.push({ id: randomUUID(), at: new Date(), kind, label, actor });
  session.updatedAt = new Date();
}

// Role-filtered view: the patient payload never contains the agency token
// and vice versa, so a shared link cannot escalate roles.
export function viewFor(session: DemoSession, role: DemoRole): Omit<DemoSession, "patientToken" | "agencyToken"> & { role: DemoRole } {
  const { patientToken: _p, agencyToken: _a, ...rest } = session;
  void _p;
  void _a;
  return { ...rest, role };
}

export interface DemoStore {
  createDemo(destination: DemoDestination, idempotencyKey: string): DemoSession;
  getDemo(id: string): DemoSession | null;
  applyAction(id: string, raw: unknown): DemoSession;
}

const ADVANCE_STEP = 25;

export class MemoryDemoStore implements DemoStore {
  private sessions = new Map<string, DemoSession>();
  private createKeys = new Map<string, string>();
  private actionKeys = new Set<string>();

  createDemo(destination: DemoDestination, idempotencyKey: string): DemoSession {
    const seen = this.createKeys.get(idempotencyKey);
    if (seen) {
      const existing = this.sessions.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const session: DemoSession = {
      id: randomUUID(),
      destination,
      status: "AVAILABILITY_REQUESTED",
      progress: 0,
      etaMinutes: illustrativeEtaMinutes(0),
      patientToken: randomUUID(),
      agencyToken: randomUUID(),
      doctorContacted: false,
      consultationPreviewed: false,
      events: [],
      createdAt: now,
      updatedAt: now,
    };
    event(session, "launched", "Demo incident launched (simulated emergency).", "system");
    event(session, "availability-requested", "Emergency van required. Is a response vehicle available?", "system");
    this.sessions.set(session.id, session);
    this.createKeys.set(idempotencyKey, session.id);
    return session;
  }

  getDemo(id: string): DemoSession | null {
    return this.sessions.get(id) ?? null;
  }

  applyAction(id: string, raw: unknown): DemoSession {
    const input = demoActionSchema.parse(raw);
    const session = this.sessions.get(id);
    if (!session) throw new DemoError("NOT_FOUND", `Demo session not found: ${id}`);
    const role: DemoRole | null =
      input.token === session.agencyToken ? "agency" : input.token === session.patientToken ? "patient" : null;
    if (!role) throw new DemoError("FORBIDDEN", "This link does not grant access to this demo session.");
    // Idempotent replay: same key returns current state without side effects.
    const key = `${id}:${input.action}:${input.idempotencyKey}`;
    if (this.actionKeys.has(key)) return session;
    this.apply(session, role, input.action, input.note);
    this.actionKeys.add(key);
    return session;
  }

  private apply(session: DemoSession, role: DemoRole, action: DemoAction, note?: string): void {
    if (session.status === "CLOSED") {
      throw new DemoError("CLOSED", "This demo has ended. Start a new demo to continue.");
    }
    switch (action) {
      case "approve": {
        this.requireRole(role, "agency", action);
        if (session.status !== "AVAILABILITY_REQUESTED" && session.status !== "DECLINED") {
          throw new DemoError("ILLEGAL", `Cannot approve while ${session.status}.`);
        }
        session.status = "APPROVED";
        session.progress = 0;
        session.etaMinutes = illustrativeEtaMinutes(0);
        event(session, "approved", "Agency approved dispatch (simulated). Demo van dispatched.", "agency");
        // Approval immediately starts the simulated journey.
        session.status = "EN_ROUTE";
        event(session, "dispatched", "Simulated journey started from Yaba staging point.", "system");
        break;
      }
      case "decline": {
        this.requireRole(role, "agency", action);
        if (session.status !== "AVAILABILITY_REQUESTED") {
          throw new DemoError("ILLEGAL", `Cannot decline while ${session.status}.`);
        }
        session.status = "DECLINED";
        event(session, "declined", "Agency reported no demo vehicle currently available.", "agency");
        break;
      }
      case "reconsider": {
        this.requireRole(role, "agency", action);
        if (session.status !== "DECLINED") {
          throw new DemoError("ILLEGAL", "There is no declined request to reconsider.");
        }
        session.status = "AVAILABILITY_REQUESTED";
        event(session, "availability-requested", "Agency is reconsidering availability.", "agency");
        break;
      }
      case "advance": {
        this.requireRole(role, "agency", action);
        if (session.status !== "EN_ROUTE") {
          throw new DemoError("ILLEGAL", "The van only moves after dispatch approval, while en route.");
        }
        session.progress = Math.min(100, session.progress + ADVANCE_STEP);
        session.etaMinutes = illustrativeEtaMinutes(session.progress);
        event(session, "advanced", `Simulated van progress: ${session.progress}% (illustrative).`, "agency");
        break;
      }
      case "arrive": {
        this.requireRole(role, "agency", action);
        if (session.status !== "EN_ROUTE") {
          throw new DemoError("ILLEGAL", "Arrival can only be confirmed while en route.");
        }
        session.status = "ARRIVED";
        session.progress = 100;
        session.etaMinutes = 0;
        event(session, "arrived", "Agency confirmed vehicle arrival (simulated).", "agency");
        break;
      }
      case "doctor-contacted": {
        this.requireRole(role, "agency", action);
        session.doctorContacted = true;
        event(
          session,
          "doctor-contacted",
          note ? `Agency logged doctor contact (simulated): ${note}` : "Agency logged doctor contact (simulated).",
          "agency",
        );
        break;
      }
      case "consultation-previewed": {
        if (role !== "patient") this.requireRole(role, "patient", action);
        session.consultationPreviewed = true;
        event(session, "consultation-previewed", "Patient opened the consultation preview (not connected).", "patient");
        break;
      }
      case "reset": {
        this.requireRole(role, "agency", action);
        session.status = "CLOSED";
        event(session, "closed", "Demo ended by the agency controller.", "agency");
        break;
      }
    }
  }

  private requireRole(role: DemoRole, expected: DemoRole, action: string): void {
    if (role !== expected) {
      throw new DemoError("FORBIDDEN", `Only the ${expected} link can perform "${action}".`);
    }
  }
}
