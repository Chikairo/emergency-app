# Emergency Care Platform — Implementation Plan

**Source:** `emergency_care_platform_prd.md` v0.1 (MVP planning)
**Codebase status at planning time:** PRD only, no app code yet. Git repo `Chikairo/emergency-app`, branch `main`, 1 commit.
**Purpose:** Turn the PRD into buildable phases, starting from design system → workflows → architecture → delivery.

---

## 0. Guiding constraints (from PRD, non-negotiable)

1. Not a replacement for emergency numbers, ambulances, clinicians, hospitals.
2. Never show false success: `Request sent ≠ Acknowledged ≠ Dispatched ≠ Arrived`. Every status needs a confirmed source.
3. Urgency first: urgent-help path always visible, never blocked by questionnaires.
4. Reviewed interim guidance only; plain language; human oversight for escalation, responder suitability, hospital destination.
5. Privacy by default: minimum necessary, role-based, audited sharing. No public broadcast of identity/location.
6. Connectivity-resilient: saved guidance + honest failure states + direct-call fallback.
7. Launch limited geography with real partners; do not promise dispatch/clinical coverage/hospital capacity until operationally tested.

---

## 1. User groups & access model (as defined in PRD §5)

| Group | Who | Auth / verification | What they can do |
|-------|-----|---------------------|------------------|
| **A — Public & community** | Patient, Bystander/helper, Family/trusted contact | No pre-verification; optional phone number for updates | Report incident, answer triage, view own guidance + status, correct location, pick trusted contacts |
| **B — Response network** | Trained nearby responder, Ambulance/response team | Identity + training/credential check, renewable/suspendable (FR-16) | Receive minimum-necessary alerts, accept/decline, update en-route/arrived/handover |
| **C — Care coordination** | Medical guidance professional, Dispatcher/emergency service | Professional credential + org affiliation | View assigned incidents, give live guidance, confirm dispatch/escalation |
| **D — Administration** | Platform ops/safety team, **Hospital admin**, Dispatch admin | Admin console + MFA, org-scoped | Ops: verify accounts/facilities, monitor failures, handle safety reports. Hospital admin: manage profile/capabilities/availability/contacts, ack/accept pre-alerts for own facility only. Dispatch admin: coverage areas, dispatcher accounts |

**Implementation implication:** four auth lanes, one shared incident state machine, strict row-level scoping (public sees own incident; responders see assigned alert subset; hospital admins see only incidents routed to their facility).

---

## 2. Architectural decisions

### 2.1 Recommended stack (default unless team vetoes)

| Layer | Choice | Why for this product |
|-------|--------|----------------------|
| Client | **Mobile-first PWA (React/Next.js or Flutter)** + installable offline shell | Fastest to pilot, works on low-end Android, supports saved guidance + service worker caching. Native shell later if push/SMS needs demand it |
| Backend | **API-first (Node/NestJS or Django) + Postgres + PostGIS** | Relational integrity for incidents/statuses/audit; PostGIS for distance + coverage areas; easier partner integrations |
| Realtime | WebSockets/SSE for status timeline + push notifications (FCM/APNs) + SMS fallback via local aggregator | PRD requires truthful live statuses; SMS covers weak-data scenarios |
| Maps/location | OS-agnostic geolocation API + map tiles (Mapbox/Google) + manual landmark input | Auto-locate with correction is P0; tiles must degrade to text description |
| File/content | Versioned guidance CMS (headless CMS or DB-backed with review workflow) | Clinical review/approval audit trail is mandatory before release |
| Infra | Managed Postgres, object storage, CI/CD, IaC, staging + prod, region close to pilot market | Audit logs, backups, low latency; data residency per launch-market law |
| Auth | Phone OTP for public (optional), email+password+MFA for staff/admins, role + facility scoping, short-lived tokens | Low friction for A, strong assurance for B/C/D |

**Alternatives to decide in Phase 0:** Flutter vs PWA (if team has native capacity or offline SMS needs dominate, pick Flutter); Firebase vs custom backend (Firebase speeds pilot but complicates audit/row-level rules — prefer custom API if hospital data is involved).

### 2.2 Key architecture patterns

- **Offline-first client:** service worker precaches Phase-1 guidance bundle + triage + emergency numbers per market. All network actions are explicit `pending → sent → confirmed` states; never optimistically mark dispatch/ack.
- **Incident as state machine:** single `incidents` aggregate with append-only `status_events` (see §4). All status transitions require an authenticated actor + source (user, responder, dispatcher, hospital admin, system).
- **Minimum-necessary projections:** one incident, multiple views. API returns role-filtered DTOs (public, responder-alert, dispatcher, hospital pre-alert, ops). No fat client filtering.
- **Audit everything:** `audit_log` for status changes, PII access, verification changes, guidance version shown.
- **Feature flags by coverage:** partner dispatch, live guidance, responder alerts, hospital recommend are all flagged per geography so untested promises stay off.
- **Graceful degradation:** each integration (location, network, live pro, ambulance partner, hospital accept) has a defined fallback UI + copy (per PRD §11).

### 2.3 Environments & branching

- `main` → staging auto-deploy; tagged release → prod with clinical sign-off gate.
- Seed data per pilot market: emergency numbers, guidance bundle version, demo hospital + coverage polygon, test responder accounts (clearly marked).

---

## 3. Design system (build first, reuse everywhere)

### 3.1 Principles (from PRD §6)

Urgency first, clarity over assumptions, plain language, minimal typing, large touch targets, readable under stress/low light/shaky hands.

### 3.2 Tokens (v1)

- **Color:** Dark-red/brown + white theme. Surfaces: deep maroon gradient `#2B0A0A → #5C1A1A` (header), `#2B1212` (footer), warm paper `#FAF6F2` (page), white cards. Actions: dark red `#7F1D1D` (hover `#651414`); bright `Danger #C81E1E` reserved for the emergency CTA and Do-not warnings only. `Safe #0E7C3E`, `Warning #B45309` stay semantic. Status colors never rely on color alone — always paired with label + icon.
- **Typography:** System stack or Inter; base 16px minimum, 20px+ for guidance steps; line-height 1.5; plain-language lint (≤8th-grade reading level for P0 flows).
- **Spacing/radius:** 8pt grid; 12px+ radius on cards; 56px+ primary buttons; 48px minimum touch target.
- **Motion:** None blocking; status changes announced via aria-live, no auto-play.

### 3.3 Core components (P0 library)

1. `EmergencyButton` — persistent, 56px+, always visible.
2. `TriageCard` — one question per screen, big options, Skip/Urgent-help link.
3. `StatusPill` — fixed vocabulary only: Request started / Request sent / Acknowledged / Dispatched-accepted / En route / Arrived / Completed-handed over / Unable to confirm. Each with icon + timestamp + source.
4. `GuidanceStep` — numbered, one action per step, Do/Don't split, version footer + Report-unsafe link.
5. `LocationReview` — map + address + landmark field + "Use this location" confirm; explicit unverified badge.
6. `ContactFallback` — emergency number big-call button + copy explaining what failed.
7. `FailureBanner` — what failed, what to do instead, retry. Never silent.
8. `TrustedContactPicker` — explicit consent + who-sees-what preview.

P1 additions: `ResponderAlertCard`, `HospitalCard` (capability + distance + confirmation state), `Timeline`, `PreAlertPanel` (hospital admin).

### 3.4 Accessibility & i18n

- WCAG 2.2 AA, keyboard + screen-reader paths for all P0 flows, dynamic type, 200% zoom.
- Content in launch-market language(s) + English; emergency numbers localised per market config, not hardcoded.
- Usability test under stress: 5-user hallway test with timed "report in <60s" task before Phase 1 exit.

---

## 4. Workflows & state model

### 4.1 Public core flow (FR-01/02/03/05/06/08/13)

```
Open → [Emergency] → Triage (skippable) → Location review → Guidance shown (<10s target)
  → Offer live pro → Help contact emergency service → Status timeline → Trusted contacts → Closure
```

- Triage ≤3 questions; Urgent-help bypass on every screen.
- Guidance appears before any network success; version-stamped.
- Location: auto (if permitted) → user confirms/corrects → landmark text fallback if uncertain.

### 4.2 Incident status state machine (PRD §9, FR-08)

Allowed transitions (actor in brackets):

```
Request started (user)
  → Request sent (system, per destination: emergency-service / ambulance-partner / responder / hospital)
  → Acknowledged (named service/responder)
  → Dispatched/accepted (authorised dispatcher / hospital admin)
  → En route (responder unit)
  → Arrived (responder unit)
  → Completed/handed over (responder or dispatcher + closure reason)
Any sent/pending → Unable to confirm (system timeout) + safe next action
Any → Cancelled (user or ops, with reason)
```

Rules: no skipping `sent → dispatched` without ack source; timestamps + actor IDs immutable; timeline renders only transitions the viewer is authorised to see.

### 4.3 B/C/D workflows

- **Responder (B):** push/SMS alert with distance + required capability + no PII beyond pickup point → Accept/Decline → en-route → arrived → handover. Decline/timeout triggers escalation, never auto-accept.
- **Live guidance (C, P1):** request → queue → connect (voice/chat) → fallback to saved guidance + retry if unavailable. All sessions logged with consent.
- **Dispatch (C):** queue of `request sent` incidents, confirm ack/dispatch, reassign on timeout.
- **Hospital admin (D, P1-P2):** manage facility profile → receive pre-alert → Acknowledge → Accept/Decline with reason → capacity note. Acceptance is per-incident, never implied by proximity.

---

## 5. Data model (v1 sketch)

- `users(id, group, roles[], phone, email, verification_status, org_id, facility_id)`
- `facilities(id, type[hospital/dispatch/ambulance], name, capabilities[], coverage_area GEOGRAPHY, availability, contacts)`
- `verifications(user_id, credential_type, issuer, expiry, status, reviewer)`
- `incidents(id, reporter_id, emergency_type, severity, location GEOGRAPHY + address_text + landmark, status, guidance_version, created_at)`
- `triage_answers(incident_id, question, answer)`
- `status_events(id, incident_id, from, to, actor_id, source, at, note)` — append-only
- `guidance_bundles(id, version, locale, emergency_type, steps JSON, reviewers[], approved_at)`
- `dispatch_requests(id, incident_id, target_type, target_id, state, attempts)`
- `pre_alerts(id, incident_id, facility_id, state[sent/acked/accepted/declined], payload_minimal)`
- `trusted_contacts(incident_id, contact, channel, consent_at, delivery_status)`
- `notifications(id, incident_id, recipient, channel, template, state)`
- `audit_log(id, at, actor_id, action, object, metadata)`
- `safety_reports(id, incident_id, reporter, category, detail, state)`

PII: encrypt at rest, minimise in alerts, retain per launch-market rules (TBD in Phase 0 legal review).

---

## 6. API sketch (role-scoped)

- `POST /incidents` (public, rate-limited, captcha-safe) → creates `request started`
- `PATCH /incidents/:id/location`, `POST /incidents/:id/triage`
- `GET /incidents/:id/guidance` (returns versioned bundle for type)
- `POST /incidents/:id/emergency-contact-attempt` (logs call/deep-link, never fakes success)
- `GET /incidents/:id/status` + `GET /incidents/:id/timeline` (filtered by role)
- `POST /dispatch-requests`, `PATCH /dispatch-requests/:id/ack|dispatch` (C/ops only)
- `POST /responder-alerts`, `PATCH /responder-alerts/:id/accept|decline|enroute|arrived` (B only)
- `GET /hospitals/recommend?incident_id=` (C/ops, capability + distance + availability)
- `POST /pre-alerts`, `PATCH /pre-alerts/:id/ack|accept|decline` (hospital admin, own facility only)
- `POST /incidents/:id/trusted-contacts`, `POST /incidents/:id/close`, `POST /safety-reports`
- `GET/PUT /admin/facilities/:id`, `POST /admin/verifications/:id/suspend|reinstate`

All mutating status endpoints require idempotency keys (mobile retries on flaky networks).

---

## 7. Phased delivery plan

### Phase 0 — Foundations (1–2 sprints) — must precede code

**Goal:** remove ambiguity so Phase 1 is safe to build.
- Confirm pilot market: emergency numbers, consent/health-data/retention rules, languages.
- Guidance content sourcing + clinical reviewers contracted; define review/approval SOP.
- Map data + emergency-service contact path (tel link vs integration) per market.
- Design tokens + P0 component library + prototype of report→guidance in <60s.
- Infra skeleton: repo, CI, staging/prod, migrations, audit logging, feature flags, error tracking.
- **Exit:** market config doc, approved guidance outline, clickable P0 prototype passes 5-user stress test, threat/privacy review signed.

### Phase 1 — Safe core emergency experience (P0)

**Scope:** FR-01,02,03,05,06,08(partial: started/sent/unable),13,17,18 + safety/privacy baseline.
- Report + skippable triage + urgent path; location review + landmark; versioned saved guidance; big-call emergency contact with honest outcome copy; status timeline (started/sent/unable); offline bundle + failure banners; ops monitor for failed handoffs; safety-report form.
- **Acceptance:** report-to-guidance <10s on 3G; usable location in ≥90% pilot tests; zero false-success in fault-injection (airplane-mode) tests; clinical + privacy + ops sign-off.
- **Risks:** wrong location → mitigated by mandatory review step; false confidence → mitigated by fixed status copy + QA fault tests.

### Phase 2 — Coordinated response partners (P1 core)

**Scope:** FR-04,07,08(full),09,12,14,15,16.
- Partner dispatch queue + ack/dispatch confirmations; live-pro request/queue/fallback; verified responder onboarding (upload → review → approve/suspend), suitability-filtered alerts, decline/escalation; trusted-contact notifications; full timeline; closure + follow-up + misuse reporting.
- **Dependencies:** signed partner coverage, staffing for live-pro queue, verification reviewers.
- **Exit:** ack rate, live-pro connect rate, responder accept/decline latency baselined; no unverified alert in audit sample.

### Phase 3 — Hospital coordination & broader coverage (P1 remainder)

**Scope:** FR-10,11 + coverage expansion.
- Hospital admin console (profile/capabilities/availability/contacts), recommendation logic (type + capability + distance + availability, never distance alone), pre-alert send/ack/accept flow, decline → alternative coordination; stale-capacity labelling (source + timestamp).
- **Dependencies:** participating hospitals, destination-decision SOP with dispatchers/clinicians.
- **Exit:** pre-alert ack/accept states accurate in pilot; destination decisions audited; expansion checklist (new market config) proven.

### Post-pilot — Hardening & scale

- Load/chaos tests, backup/restore drills, retention enforcement, local-language expansion, native shell if push needs demand it, operational reporting dashboards (per PRD §13 measures).

---

## 8. Non-functional requirements

- **Performance:** P0 bundle <500KB, first guidance <10s on 3G, API p95 <400ms for status reads.
- **Reliability:** 99.5% pilot target for report+guidance; idempotent retries; no data loss on offline submit (outbox pattern).
- **Security:** OWASP ASVS L2, MFA for B/C/D, row-level authorisation tests per role, secrets in vault, encrypted PII, rate limits + abuse detection for false reports.
- **Privacy:** data-flow map, consent receipts, facility-scoped reads, retention job, DSAR path (per market law).
- **Observability:** structured logs, trace IDs per incident, dashboards for FR success measures (§13): time-to-guidance, ack latency, location usability %, status accuracy %, dispatch outcome %, live-pro connect %, notification delivery %, verification + safety-report rates, false-status count (must be zero).

---

## 9. Testing & safety gates

- Unit + contract tests for state machine (illegal transitions fail).
- E2E fault injection: airplane mode, location denied, no live-pro, partner timeout, hospital decline — each must show correct fallback, never success.
- Clinical review gate before any guidance ships; content version pinned in app + audit.
- Privacy gate: role-projection tests (hospital A cannot read hospital B incidents; public cannot enumerate incidents).
- Pilot gate (per PRD §17): usable location, honest statuses, partners understand responsibilities, fallbacks exercised, reviewers approve measured outcomes.

---

## 10. Build order (concrete backlog)

1. Tokens + `EmergencyButton/StatusPill/GuidanceStep/LocationReview/FailureBanner` + report→guidance prototype.
2. API: incidents + triage + location + guidance + status_events + timeline (public-filtered).
3. Offline bundle + outbox + emergency-contact logging + ops failed-handoff view.
4. Auth lanes A→D + verification workflow + admin facility CRUD.
5. Dispatch + responder alerts + live-pro queue + trusted contacts + closure.
6. Hospital admin console + recommend + pre-alert states.
7. Dashboards, retention, load tests, market-config pack for expansion.

---

## 11. Open decisions to close in Phase 0 (from PRD §15)

- [ ] Launch country/city/coverage + emergency numbers + languages.
- [ ] Partner list (ambulance, dispatch, clinical guidance, hospitals) + SLAs.
- [ ] Guidance authors/reviewers + escalation rules.
- [ ] Ops ownership (who watches unacked requests nights/weekends).
- [ ] Consent/retention/safeguarding rules per market + hospital data-sharing agreements.
- [ ] Public-only vs full dispatcher/responder/hospital apps in first release.
- [ ] Pilot numeric targets after baselines.

---

## 12. Risks (top 5) + mitigations

1. False confidence help is coming → fixed status vocabulary + fault tests + copy review.
2. Unsafe guidance → clinical approval workflow + version pin + report-unsafe + post-incident review.
3. Stale hospital capacity → source+timestamp labels + final decision stays with professionals.
4. Wrong location → mandatory visual review + landmark + unverified badge.
5. Unverified volunteers → pre-verification + suitability filter + no-go for hazardous scenes + suspend path.

---

## 13. Suggested repo layout (to create in Phase 0)

```
/apps/web (PWA)
/apps/admin (ops + hospital admin console)
/services/api (incidents, dispatch, pre-alerts, verification)
/packages/design-system (tokens + components)
/packages/guidance-content (versioned bundles + review metadata)
/infra (IaC, CI, market-config/)
```

---

*Closing principle (PRD): promise the next safest step, coordinated help where available, and honesty about what has and has not happened.*
