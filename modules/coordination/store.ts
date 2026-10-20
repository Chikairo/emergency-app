import { randomUUID } from "node:crypto";
import { findResponder } from "@/modules/responders/roster";
import { dispatchCreateSchema } from "./validation";
import type {
  AssignmentCreateInput,
  ContactCreateInput,
  DispatchCreateInput,
} from "./validation";

// Mock coordination provider for Docker-free development.
// Honest states only: sends are SENT (never dispatched), confirmations come
// exclusively through explicit `simulate*` calls flagged `simulated: true`.

export type CoordState =
  | "PENDING"
  | "SENT"
  | "ACKNOWLEDGED"
  | "ACCEPTED"
  | "DECLINED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "DELIVERED";

export interface DispatchRecord {
  id: string;
  incidentId: string;
  targetType: string;
  targetName: string;
  state: CoordState;
  attempts: number;
  simulated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedproRecord {
  id: string;
  incidentId: string;
  state: CoordState;
  provider: "mock";
  simulated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentRecord {
  id: string;
  incidentId: string;
  responderEmail: string;
  responderName: string;
  verified: boolean;
  state: CoordState;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactRecord {
  id: string;
  incidentId: string;
  name: string;
  channel: string;
  address: string;
  consentAt: Date;
  lastDelivery: CoordState | null;
}

export interface NotificationRecord {
  id: string;
  incidentId: string;
  recipient: string;
  channel: string;
  template: string;
  state: CoordState;
  provider: string;
  simulated: boolean;
  createdAt: Date;
}

export interface CoordinationPort {
  requestDispatch(incidentId: string, raw: unknown): Promise<DispatchRecord>;
  getDispatch(id: string): Promise<DispatchRecord | null>;
  simulateDispatchAck(id: string): Promise<DispatchRecord>;
  simulateDispatchConfirm(id: string): Promise<DispatchRecord>;
  listDispatches(incidentId: string): Promise<DispatchRecord[]>;
  recordDispatchDecision(
    incidentId: string,
    input: { targetName: string; idempotencyKey: string; confirmed: boolean },
  ): Promise<DispatchRecord>;
  recordAmbulanceAvailability(
    incidentId: string,
    input: { targetName: string; idempotencyKey: string },
  ): Promise<DispatchRecord>;
  findDispatchByIdempotencyKey(
    incidentId: string,
    idempotencyKey: string,
  ): Promise<DispatchRecord | null>;
  requestMedpro(incidentId: string, idempotencyKey: string): Promise<MedproRecord>;
  getMedpro(id: string): Promise<MedproRecord | null>;
  simulateMedproAccept(id: string): Promise<MedproRecord>;
  expireStaleMedpro(timeoutMs: number, now?: Date): Promise<number>;
  listMedpro(incidentId: string): Promise<MedproRecord[]>;
  assignResponder(incidentId: string, input: AssignmentCreateInput): Promise<AssignmentRecord>;
  getAssignment(id: string): Promise<AssignmentRecord | null>;
  acknowledgeAssignment(id: string): Promise<AssignmentRecord>;
  listAssignments(incidentId: string): Promise<AssignmentRecord[]>;
  addContact(incidentId: string, input: ContactCreateInput): Promise<ContactRecord>;
  listContacts(incidentId: string): Promise<ContactRecord[]>;
  notifyContacts(incidentId: string): Promise<NotificationRecord[]>;
  findSentNotification(
    incidentId: string,
    recipient: string,
    template: string,
  ): Promise<NotificationRecord | null>;
  recordNotification(
    incidentId: string,
    input: {
      channel: string;
      recipient: string;
      template: string;
      provider: string;
      state: "SENT" | "FAILED" | "DELIVERED";
      messageId?: string;
    },
  ): Promise<NotificationRecord>;
}

export class CoordinationStore implements CoordinationPort {
  private dispatches = new Map<string, DispatchRecord>();
  private dispatchKeys = new Map<string, string>();
  private medpros = new Map<string, MedproRecord>();
  private medproKeys = new Map<string, string>();
  private assignments = new Map<string, AssignmentRecord>();
  private assignmentKeys = new Map<string, string>();
  private contacts = new Map<string, ContactRecord[]>();
  private notifications: NotificationRecord[] = [];

  // ---------------------------------------------------------- dispatch ----
  /** Validated entry-point: parses raw input, then creates idempotently. */
  async requestDispatch(incidentId: string, raw: unknown): Promise<DispatchRecord> {
    return this.createDispatch(incidentId, dispatchCreateSchema.parse(raw));
  }

  async createDispatch(incidentId: string, input: DispatchCreateInput): Promise<DispatchRecord> {
    const seen = this.dispatchKeys.get(`${incidentId}:${input.idempotencyKey}`);
    if (seen) {
      const existing = this.dispatches.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const rec: DispatchRecord = {
      id: randomUUID(),
      incidentId,
      targetType: input.targetType,
      targetName: input.targetName,
      state: "SENT",
      attempts: 1,
      simulated: false,
      createdAt: now,
      updatedAt: now,
    };
    this.dispatches.set(rec.id, rec);
    this.dispatchKeys.set(`${incidentId}:${input.idempotencyKey}`, rec.id);
    return rec;
  }

  /** Scoped read for authorization: returns the record for incident binding. */
  async getDispatch(id: string): Promise<DispatchRecord | null> {
    return this.dispatches.get(id) ?? null;
  }

  /** Dev-only: pretend the named service acknowledged. Flagged simulated. */
  async simulateDispatchAck(id: string): Promise<DispatchRecord> {
    const rec = this.mustDispatch(id);
    if (rec.state !== "SENT") throw new Error(`Dispatch ${id} is ${rec.state}; only SENT can be acknowledged`);
    rec.state = "ACKNOWLEDGED";
    rec.simulated = true;
    rec.updatedAt = new Date();
    return rec;
  }

  /** Dev-only: pretend the service confirmed dispatch. Flagged simulated. */
  async simulateDispatchConfirm(id: string): Promise<DispatchRecord> {
    const rec = this.mustDispatch(id);
    if (rec.state !== "ACKNOWLEDGED") {
      throw new Error(`Dispatch ${id} is ${rec.state}; acknowledgement is required before dispatch`);
    }
    rec.state = "ACCEPTED";
    rec.simulated = true;
    rec.updatedAt = new Date();
    return rec;
  }

  async listDispatches(incidentId: string): Promise<DispatchRecord[]> {
    return [...this.dispatches.values()].filter((d) => d.incidentId === incidentId);
  }

  /**
   * Human dispatch decision (real incidents only). Creates a SENT request and
   * immediately records the authorized outcome — ACCEPTED or DECLINED — with
   * simulated:false, because a person decided, not a mock. Idempotent.
   */
  async recordDispatchDecision(
    incidentId: string,
    input: { targetName: string; idempotencyKey: string; confirmed: boolean },
  ): Promise<DispatchRecord> {
    const seen = this.dispatchKeys.get(`${incidentId}:${input.idempotencyKey}`);
    if (seen) {
      const existing = this.dispatches.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const rec: DispatchRecord = {
      id: randomUUID(),
      incidentId,
      targetType: "ambulance-partner",
      targetName: input.targetName,
      state: input.confirmed ? "ACCEPTED" : "DECLINED",
      attempts: 1,
      simulated: false,
      createdAt: now,
      updatedAt: now,
    };
    this.dispatches.set(rec.id, rec);
    this.dispatchKeys.set(`${incidentId}:${input.idempotencyKey}`, rec.id);
    return rec;
  }

  async recordAmbulanceAvailability(
    incidentId: string,
    input: { targetName: string; idempotencyKey: string },
  ): Promise<DispatchRecord> {
    const key = `${incidentId}:${input.idempotencyKey}`;
    const seen = this.dispatchKeys.get(key);
    if (seen) {
      const existing = this.dispatches.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const rec: DispatchRecord = {
      id: randomUUID(),
      incidentId,
      targetType: "ambulance-partner",
      targetName: input.targetName,
      state: "ACKNOWLEDGED",
      attempts: 1,
      simulated: false,
      createdAt: now,
      updatedAt: now,
    };
    this.dispatches.set(rec.id, rec);
    this.dispatchKeys.set(key, rec.id);
    return rec;
  }

  async findDispatchByIdempotencyKey(
    incidentId: string,
    idempotencyKey: string,
  ): Promise<DispatchRecord | null> {
    const id = this.dispatchKeys.get(`${incidentId}:${idempotencyKey}`);
    return id ? this.dispatches.get(id) ?? null : null;
  }

  private mustDispatch(id: string): DispatchRecord {
    const rec = this.dispatches.get(id);
    if (!rec) throw new Error(`Dispatch request not found: ${id}`);
    return rec;
  }

  // ------------------------------------------------------------ med-pro ---
  async requestMedpro(incidentId: string, idempotencyKey: string): Promise<MedproRecord> {
    const seen = this.medproKeys.get(`${incidentId}:${idempotencyKey}`);
    if (seen) {
      const existing = this.medpros.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const rec: MedproRecord = {
      id: randomUUID(),
      incidentId,
      state: "PENDING",
      provider: "mock",
      simulated: false,
      createdAt: now,
      updatedAt: now,
    };
    this.medpros.set(rec.id, rec);
    this.medproKeys.set(`${incidentId}:${idempotencyKey}`, rec.id);
    return rec;
  }

  /** Scoped read for authorization: returns the record for incident binding. */
  async getMedpro(id: string): Promise<MedproRecord | null> {
    return this.medpros.get(id) ?? null;
  }

  /** Dev-only: pretend a professional accepted. Flagged simulated. */
  async simulateMedproAccept(id: string): Promise<MedproRecord> {
    const rec = this.mustMedpro(id);
    if (rec.state !== "PENDING") throw new Error(`Med-pro request ${id} is ${rec.state}`);
    rec.state = "ACCEPTED";
    rec.simulated = true;
    rec.updatedAt = new Date();
    return rec;
  }

  async expireStaleMedpro(timeoutMs: number, now = new Date()): Promise<number> {
    let expired = 0;
    for (const rec of this.medpros.values()) {
      if (rec.state === "PENDING" && now.getTime() - rec.createdAt.getTime() > timeoutMs) {
        rec.state = "EXPIRED";
        rec.updatedAt = now;
        expired += 1;
      }
    }
    return expired;
  }

  async listMedpro(incidentId: string): Promise<MedproRecord[]> {
    return [...this.medpros.values()].filter((m) => m.incidentId === incidentId);
  }

  private mustMedpro(id: string): MedproRecord {
    const rec = this.medpros.get(id);
    if (!rec) throw new Error(`Med-pro request not found: ${id}`);
    return rec;
  }

  // ---------------------------------------------------------- responders --
  async assignResponder(
    incidentId: string,
    input: AssignmentCreateInput,
  ): Promise<AssignmentRecord> {
    const roster = findResponder(input.responderEmail);
    if (!roster) throw new Error(`Unknown responder: ${input.responderEmail}`);
    if (!roster.verified) {
      throw new Error(`${roster.name} is not verified and cannot be assigned`);
    }
    const seen = this.assignmentKeys.get(`${incidentId}:${input.idempotencyKey}`);
    if (seen) {
      const existing = this.assignments.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const rec: AssignmentRecord = {
      id: randomUUID(),
      incidentId,
      responderEmail: roster.email,
      responderName: roster.name,
      verified: roster.verified,
      state: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    this.assignments.set(rec.id, rec);
    this.assignmentKeys.set(`${incidentId}:${input.idempotencyKey}`, rec.id);
    return rec;
  }

  /** Scoped read for authorization: returns the record for incident binding. */
  async getAssignment(id: string): Promise<AssignmentRecord | null> {
    return this.assignments.get(id) ?? null;
  }

  async acknowledgeAssignment(id: string): Promise<AssignmentRecord> {
    const rec = this.assignments.get(id);
    if (!rec) throw new Error(`Assignment not found: ${id}`);
    if (rec.state !== "PENDING") throw new Error(`Assignment ${id} is ${rec.state}`);
    rec.state = "ACKNOWLEDGED";
    rec.updatedAt = new Date();
    return rec;
  }

  async listAssignments(incidentId: string): Promise<AssignmentRecord[]> {
    return [...this.assignments.values()].filter((a) => a.incidentId === incidentId);
  }

  // ------------------------------------------------------------ contacts --
  async addContact(incidentId: string, input: ContactCreateInput): Promise<ContactRecord> {
    const list = this.contacts.get(incidentId) ?? [];
    const rec: ContactRecord = {
      id: randomUUID(),
      incidentId,
      name: input.name,
      channel: input.channel,
      address: input.address,
      consentAt: new Date(),
      lastDelivery: null,
    };
    list.push(rec);
    this.contacts.set(incidentId, list);
    return rec;
  }

  async listContacts(incidentId: string): Promise<ContactRecord[]> {
    return this.contacts.get(incidentId) ?? [];
  }

  /** Dev-only mock notify: records SENT, never claims real delivery. */
  async notifyContacts(incidentId: string): Promise<NotificationRecord[]> {
    const sent: NotificationRecord[] = [];
    for (const c of await this.listContacts(incidentId)) {
      sent.push(
        await this.recordNotification(incidentId, {
          channel: c.channel,
          recipient: c.address,
          template: "incident-update",
          provider: "mock",
          state: "SENT",
        }),
      );
      c.lastDelivery = "SENT";
    }
    return sent;
  }

  async recordNotification(
    incidentId: string,
    input: {
      channel: string;
      recipient: string;
      template: string;
      provider: string;
      state: "SENT" | "FAILED" | "DELIVERED";
      messageId?: string;
    },
  ): Promise<NotificationRecord> {
    const rec: NotificationRecord = {
      id: randomUUID(),
      incidentId,
      recipient: input.recipient,
      channel: input.channel,
      template: input.template,
      state: input.state,
      provider: input.provider,
      simulated: input.provider === "mock",
      createdAt: new Date(),
    };
    this.notifications.push(rec);
    return rec;
  }

  async findSentNotification(
    incidentId: string,
    recipient: string,
    template: string,
  ): Promise<NotificationRecord | null> {
    return (
      this.notifications.find(
        (n) =>
          n.incidentId === incidentId &&
          n.recipient === recipient &&
          n.template === template &&
          n.state === "SENT",
      ) ?? null
    );
  }
}
