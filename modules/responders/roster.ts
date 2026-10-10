// Fictional responder roster for Docker-free development.
// Clearly fake people; never real identities. Verification states included
// so the UI can distinguish verified responders from unverified volunteers.

export interface RosterResponder {
  email: string;
  name: string;
  capabilities: string[];
  verified: boolean;
  availability: "available" | "busy" | "off-duty";
}

export const RESPONDER_ROSTER: RosterResponder[] = [
  {
    email: "responder@example.com",
    name: "Rosa Responder (fictional)",
    capabilities: ["first-aid"],
    verified: true,
    availability: "available",
  },
  {
    email: "kofi.medic@example.com",
    name: "Kofi Medic (fictional)",
    capabilities: ["first-aid", "oxygen"],
    verified: true,
    availability: "busy",
  },
  {
    email: "unverified.vol@example.com",
    name: "Una Verified (fictional)",
    capabilities: [],
    verified: false,
    availability: "available",
  },
];

export function findResponder(email: string): RosterResponder | null {
  return RESPONDER_ROSTER.find((r) => r.email === email) ?? null;
}
