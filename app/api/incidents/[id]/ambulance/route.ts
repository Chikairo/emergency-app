import { audit } from "@/lib/audit";
import { DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { ambulanceDecisionSchema } from "@/modules/coordination/validation";
import { getStore, getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Human ambulance availability decision on a real incident. Authorized
// dispatchers only. A confirmation records a non-simulated dispatch and
// advances the incident along the legal status path (SENT -> ACKNOWLEDGED
// -> DISPATCHED_ACCEPTED); a decline records the decision without changing
// status, so availability can be reconsidered later.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    const { incident } = await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = ambulanceDecisionSchema.parse(body);
    const vehicle = input.vehicle ?? "Ambulance service";
    const previousDecision = await coordinationStore.findDispatchByIdempotencyKey(
      id,
      input.idempotencyKey,
    );
    if (previousDecision) return Response.json({ dispatch: previousDecision, incident });

    if (input.decision === "available") {
      let record = incident;
      if (record.status === "REQUEST_STARTED" || record.status === "UNABLE_TO_CONFIRM") {
        record = await getStore().appendStatus(id, "REQUEST_SENT", {
          actor: user.id,
          source: "dispatcher",
          note: "Dispatcher began ambulance availability verification.",
          idempotencyKey: `${input.idempotencyKey}:sent`,
        });
      }
      if (record.status === "REQUEST_SENT") {
        record = await getStore().appendStatus(id, "ACKNOWLEDGED", {
          actor: user.id,
          source: "dispatcher",
          note: "Dispatcher confirmed ambulance availability; dispatch is not yet confirmed.",
          idempotencyKey: `${input.idempotencyKey}:available`,
        });
      }
      if (record.status !== "ACKNOWLEDGED") {
        return Response.json(
          { error: "Ambulance availability can only be recorded before dispatch." },
          { status: 409 },
        );
      }
      const dispatch = await coordinationStore.recordAmbulanceAvailability(id, {
        targetName: vehicle,
        idempotencyKey: input.idempotencyKey,
      });
      await audit({
        actorId: user.id,
        action: "ambulance.available",
        object: "dispatch",
        objectId: dispatch.id,
        metadata: { incidentId: id, vehicle },
      });
      return Response.json({ dispatch, incident: record });
    }

    if (input.decision === "dispatch") {
      if (incident.status !== "ACKNOWLEDGED") {
        return Response.json(
          { error: "Confirm ambulance availability before recording dispatch." },
          { status: 409 },
        );
      }
      const availability = await coordinationStore.listDispatches(id);
      if (!availability.some((item) => item.state === "ACKNOWLEDGED" && !item.simulated)) {
        return Response.json(
          { error: "No server-recorded ambulance availability is awaiting dispatch." },
          { status: 409 },
        );
      }
    }

    const dispatch = await coordinationStore.recordDispatchDecision(id, {
      targetName: vehicle,
      idempotencyKey: input.idempotencyKey,
      confirmed: input.decision === "confirm" || input.decision === "dispatch",
    });
    await audit({
      actorId: user.id,
      action:
        input.decision === "confirm" || input.decision === "dispatch"
          ? "ambulance.confirmed"
          : "ambulance.declined",
      object: "dispatch",
      objectId: dispatch.id,
      metadata: { incidentId: id, vehicle, note: input.note ?? null },
    });

    let record = incident;
    if (input.decision === "confirm" || input.decision === "dispatch") {
      const store = getStore();
      // A fresh report starts at REQUEST_STARTED. The client waiting screen
      // marks REQUEST_SENT, but if the dispatcher confirms first, advance
      // through the legal chain here so confirm always works.
      if (record.status === "REQUEST_STARTED") {
        record = await store.appendStatus(id, "REQUEST_SENT", {
          actor: user.id,
          source: "dispatcher",
          note: "Dispatcher confirmed ambulance — request marked sent.",
          idempotencyKey: `${input.idempotencyKey}:sent`,
        });
      }
      if (record.status === "REQUEST_SENT") {
        record = await store.appendStatus(id, "ACKNOWLEDGED", {
          actor: user.id,
          source: "dispatcher",
          note: `Dispatcher acknowledged${input.note ? `: ${input.note}` : ""}`,
          idempotencyKey: `${input.idempotencyKey}:ack`,
        });
      }
      if (record.status === "ACKNOWLEDGED") {
        record = await store.appendStatus(id, "DISPATCHED_ACCEPTED", {
          actor: user.id,
          source: "dispatcher",
          note: `${vehicle} confirmed by ${user.email}${input.note ? `: ${input.note}` : ""}`,
          idempotencyKey: `${input.idempotencyKey}:dispatch`,
        });
      }
      await audit({
        actorId: user.id,
        action: "incident.status",
        object: "incident",
        objectId: id,
        metadata: { to: record.status },
      });
    }
    return Response.json({ dispatch, incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
