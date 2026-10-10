// Audit trail for security-sensitive actions. In-memory ring buffer is the
// test-visible record; entries are also persisted to the AuditLog table
// whenever a database connection is available. Never throws.

export interface AuditEntry {
  at: Date;
  actorId: string | null;
  action: string;
  object: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
export const auditBuffer: AuditEntry[] = [];

export async function audit(entry: Omit<AuditEntry, "at">): Promise<void> {
  const full: AuditEntry = { ...entry, at: new Date() };
  auditBuffer.push(full);
  if (auditBuffer.length > MAX_ENTRIES) auditBuffer.splice(0, auditBuffer.length - MAX_ENTRIES);
  if (process.env["DATABASE_URL"]) {
    try {
      const { db } = await import("@/lib/db");
      await db.auditLog.create({
        data: {
          actorId: full.actorId,
          action: full.action,
          object: full.object,
          objectId: full.objectId,
          metadata: (full.metadata ?? {}) as never,
        },
      });
    } catch {
      // Persistence is best-effort here; the buffer keeps the record.
    }
  }
}

export function clearAuditBuffer(): void {
  auditBuffer.length = 0;
}
