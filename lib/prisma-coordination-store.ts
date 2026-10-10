import type { PrismaClient } from "@prisma/client";
import { findResponder } from "@/modules/responders/roster";
import { dispatchCreateSchema } from "@/modules/coordination/validation";
import type {
  AssignmentCreateInput,
  ContactCreateInput,
  DispatchCreateInput,
} from "@/modules/coordination/validation";
import type {
  AssignmentRecord,
  ContactRecord,
  CoordinationPort,
  CoordState,
  DispatchRecord,
  MedproRecord,
  NotificationRecord,
} from "@/modules/coordination/store";

type Db = PrismaClient;

/** Prisma-backed CoordinationPort. Same honest-state rules as memory. */
export class PrismaCoordinationStore implements CoordinationPort {
  constructor(private readonly db: Db) {}

  // ---------------------------------------------------------- dispatch ----
  async requestDispatch(incidentId: string, raw: unknown): Promise<DispatchRecord> {
    return this.createDispatch(incidentId, dispatchCreateSchema.parse(raw));
  }

  async createDispatch(incidentId: string, input: DispatchCreateInput): Promise<DispatchRecord> {
    const seen = await this.db.dispatchRequest.findUnique({
      where: { idempotencyKey: `${incidentId}:${input.idempotencyKey}` },
    }).catch(() => null);
    if (seen) return this.toDispatch(seen);
    try {
      const rec = await this.db.dispatchRequest.create({
        data: {
          incidentId,
          targetType: input.targetType,
          targetName: input.targetName,
          state: "SENT",
          attempts: 1,
          idempotencyKey: `${incidentId}:${input.idempotencyKey}`,
        },
      });
      return this.toDispatch(rec);
    } catch {
      const dup = await this.db.dispatchRequest.findUnique({
        where: { idempotencyKey: `${incidentId}:${input.idempotencyKey}` },
      });
      if (!dup) throw new Error("Could not record the dispatch request.");
      return this.toDispatch(dup);
    }
  }

  async simulateDispatchAck(id: string): Promise<DispatchRecord> {
    const rec = await this.mustDispatch(id);
    if (rec.state !== "SENT") {
      throw new Error(`Dispatch ${id} is ${rec.state}; only SENT can be acknowledged`);
    }
    return this.toDispatch(
      await this.db.dispatchRequest.update({ where: { id }, data: { state: "ACKNOWLEDGED", simulated: true } }),
    );
  }

  async simulateDispatchConfirm(id: string): Promise<DispatchRecord> {
    const rec = await this.mustDispatch(id);
    if (rec.state !== "ACKNOWLEDGED") {
      throw new Error(`Dispatch ${id} is ${rec.state}; acknowledgement is required before dispatch`);
    }
    return this.toDispatch(
      await this.db.dispatchRequest.update({ where: { id }, data: { state: "ACCEPTED", simulated: true } }),
    );
  }

  async listDispatches(incidentId: string): Promise<DispatchRecord[]> {
    const rows = await this.db.dispatchRequest.findMany({
      where: { incidentId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.toDispatch(r));
  }

  // ------------------------------------------------------------ med-pro ---
  async requestMedpro(incidentId: string, idempotencyKey: string): Promise<MedproRecord> {
    const key = `${incidentId}:${idempotencyKey}`;
    const seen = await this.db.medProRequest.findUnique({ where: { idempotencyKey: key } }).catch(() => null);
    if (seen) return this.toMedpro(seen);
    try {
      const rec = await this.db.medProRequest.create({
        data: { incidentId, state: "PENDING", provider: "mock", idempotencyKey: key },
      });
      return this.toMedpro(rec);
    } catch {
      const dup = await this.db.medProRequest.findUnique({ where: { idempotencyKey: key } });
      if (!dup) throw new Error("Could not record the med-pro request.");
      return this.toMedpro(dup);
    }
  }

  async simulateMedproAccept(id: string): Promise<MedproRecord> {
    const rec = await this.db.medProRequest.findUnique({ where: { id } });
    if (!rec) throw new Error(`Med-pro request not found: ${id}`);
    if (rec.state !== "PENDING") throw new Error(`Med-pro request ${id} is ${rec.state}`);
    return this.toMedpro(
      await this.db.medProRequest.update({ where: { id }, data: { state: "ACCEPTED", simulated: true } }),
    );
  }

  async expireStaleMedpro(timeoutMs: number, now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - timeoutMs);
    const res = await this.db.medProRequest.updateMany({
      where: { state: "PENDING", createdAt: { lt: cutoff } },
      data: { state: "EXPIRED" },
    });
    return res.count;
  }

  async listMedpro(incidentId: string): Promise<MedproRecord[]> {
    const rows = await this.db.medProRequest.findMany({
      where: { incidentId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.toMedpro(r));
  }

  // ---------------------------------------------------------- responders --
  async assignResponder(incidentId: string, input: AssignmentCreateInput): Promise<AssignmentRecord> {
    const roster = findResponder(input.responderEmail);
    if (!roster) throw new Error(`Unknown responder: ${input.responderEmail}`);
    if (!roster.verified) throw new Error(`${roster.name} is not verified and cannot be assigned`);
    const key = `${incidentId}:${input.idempotencyKey}`;
    const seen = await this.db.responderAssignment.findFirst({ where: { incidentId, idempotencyKey: key } });
    if (seen) return this.toAssignment(seen, roster.name, roster.verified);
    const rec = await this.db.responderAssignment.create({
      data: { incidentId, userEmail: roster.email, state: "PENDING", idempotencyKey: key },
    });
    return this.toAssignment(rec, roster.name, roster.verified);
  }

  async acknowledgeAssignment(id: string): Promise<AssignmentRecord> {
    const rec = await this.db.responderAssignment.findUnique({ where: { id } });
    if (!rec) throw new Error(`Assignment not found: ${id}`);
    if (rec.state !== "PENDING") throw new Error(`Assignment ${id} is ${rec.state}`);
    const updated = await this.db.responderAssignment.update({
      where: { id },
      data: { state: "ACKNOWLEDGED" },
    });
    const roster = findResponder(updated.userEmail);
    return this.toAssignment(updated, roster?.name ?? updated.userEmail, roster?.verified ?? false);
  }

  async listAssignments(incidentId: string): Promise<AssignmentRecord[]> {
    const rows = await this.db.responderAssignment.findMany({
      where: { incidentId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => {
      const roster = findResponder(r.userEmail);
      return this.toAssignment(r, roster?.name ?? r.userEmail, roster?.verified ?? false);
    });
  }

  // ------------------------------------------------------------ contacts --
  async addContact(incidentId: string, input: ContactCreateInput): Promise<ContactRecord> {
    const incident = await this.db.incident.findUnique({ where: { id: incidentId } });
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);
    const rec = await this.db.trustedContact.create({
      data: {
        ownerId: incident.reporterId,
        incidentId,
        name: input.name,
        channel: input.channel,
        address: input.address,
        consentAt: new Date(),
      },
    });
    return this.toContact(rec, null);
  }

  async listContacts(incidentId: string): Promise<ContactRecord[]> {
    const contacts = await this.db.trustedContact.findMany({
      where: { incidentId },
      orderBy: { createdAt: "asc" },
    });
    const notes = await this.db.notification.findMany({ where: { incidentId } });
    const latest = new Map<string, string>();
    for (const n of notes) latest.set(`${n.recipient}`, n.state);
    return contacts.map((c) => this.toContact(c, (latest.get(c.address) ?? null) as CoordState | null));
  }

  async notifyContacts(incidentId: string): Promise<NotificationRecord[]> {
    const contacts = await this.db.trustedContact.findMany({ where: { incidentId } });
    const sent: NotificationRecord[] = [];
    for (const c of contacts) {
      const n = await this.db.notification.create({
        data: {
          incidentId,
          recipient: c.address,
          channel: c.channel,
          template: "incident-update",
          state: "SENT",
          provider: "mock",
        },
      });
      sent.push({
        id: n.id,
        incidentId,
        recipient: n.recipient,
        channel: n.channel,
        template: n.template,
        state: n.state as CoordState,
        provider: "mock",
        simulated: true,
        createdAt: n.createdAt,
      });
    }
    return sent;
  }

  // -------------------------------------------------------------- mappers -
  private async mustDispatch(id: string) {
    const rec = await this.db.dispatchRequest.findUnique({ where: { id } });
    if (!rec) throw new Error(`Dispatch request not found: ${id}`);
    return rec;
  }

  private toDispatch(r: {
    id: string; incidentId: string; targetType: string; targetName: string;
    state: string; attempts: number; simulated: boolean; createdAt: Date; updatedAt: Date;
  }): DispatchRecord {
    return {
      id: r.id, incidentId: r.incidentId, targetType: r.targetType, targetName: r.targetName,
      state: r.state as CoordState, attempts: r.attempts, simulated: r.simulated,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }

  private toMedpro(r: {
    id: string; incidentId: string; state: string; provider: string;
    simulated: boolean; createdAt: Date; updatedAt: Date;
  }): MedproRecord {
    return {
      id: r.id, incidentId: r.incidentId, state: r.state as CoordState,
      provider: "mock", simulated: r.simulated, createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }

  private toAssignment(
    r: { id: string; incidentId: string; userEmail: string; state: string; createdAt: Date; updatedAt: Date },
    name: string,
    verified: boolean,
  ): AssignmentRecord {
    return {
      id: r.id, incidentId: r.incidentId, responderEmail: r.userEmail, responderName: name,
      verified, state: r.state as CoordState, createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }

  private toContact(
    c: { id: string; incidentId: string | null; name: string; channel: string; address: string; consentAt: Date | null },
    lastDelivery: CoordState | null,
  ): ContactRecord {
    return {
      id: c.id, incidentId: c.incidentId ?? "", name: c.name, channel: c.channel,
      address: c.address, consentAt: c.consentAt ?? new Date(), lastDelivery,
    };
  }
}
