import { describe, expect, it } from "vitest";
import {
  DISPATCH_ROLES,
  ForbiddenRoleError,
  OPS_ROLES,
  UnauthenticatedError,
  canAccessIncident,
  isStaff,
  requireRoles,
} from "./authz";

const staff = { id: "s", email: "s@x.com", role: "DISPATCHER", facilityId: null };
const owner = { id: "o", email: "o@x.com", role: "BYSTANDER", facilityId: null };
const other = { id: "x", email: "x@x.com", role: "BYSTANDER", facilityId: null };

describe("RBAC helpers (pure, no I/O)", () => {
  it("distinguishes staff from public roles", () => {
    expect(isStaff("DISPATCHER")).toBe(true);
    expect(isStaff("HOSPITAL_ADMIN")).toBe(true);
    expect(isStaff("BYSTANDER")).toBe(false);
    expect(isStaff("PATIENT")).toBe(false);
  });

  it("rejects signed-out callers with 401 semantics", () => {
    expect(() => requireRoles(null, OPS_ROLES)).toThrow(UnauthenticatedError);
  });

  it("rejects wrong roles with 403 semantics", () => {
    expect(() => requireRoles(owner, DISPATCH_ROLES)).toThrow(ForbiddenRoleError);
    expect(requireRoles(staff, DISPATCH_ROLES)).toBe(staff);
  });

  it("lets staff read anything, owners read their own", () => {
    expect(canAccessIncident(staff, { reporter: "someone" })).toBe(true);
    expect(canAccessIncident(owner, { reporter: "o" })).toBe(true);
    expect(canAccessIncident(other, { reporter: "o" })).toBe(false);
  });

  it("keeps the no-login urgent flow on anonymous reports only", () => {
    expect(canAccessIncident(null, { reporter: null })).toBe(true);
    expect(canAccessIncident(null, { reporter: "o" })).toBe(false);
  });
});
