# Emergency Care — While Help Is on the Way

Local-first emergency-response web app. Helps people report an emergency, follow
clinically reviewed interim guidance, share/correct location, and track honest
incident status while professional help is arranged. **Not a replacement for
emergency numbers, ambulances, clinicians, or hospitals.**

> Safety notice: this repository is development scaffolding. It is **not
> clinically validated, not production-ready, and not suitable for real
> emergency operations**.

Requirements: `PRD` in `project file/emergency_care_platform_prd.md`, build
phases in `project file/implementation_plan.md`.

## Stack (free / open-source, local-first)

Next.js App Router + TypeScript strict, Tailwind + shadcn/ui, PostgreSQL +
PostGIS via Docker Compose, Prisma, Better Auth, Zod + React Hook Form,
Vitest + Playwright, Next.js Route Handlers, PWA offline guidance for approved
content only. Mock adapters for SMS/calls/maps/dispatch/hospitals/medical-pro
in development. No paid SaaS required to run locally.

## Repo layout (target)

- `project file/` — PRD + implementation plan (preserved).
- `app/` — Next.js routes, role layouts (to be scaffolded).
- `modules/` — emergency, guidance, location, incidents, dispatch, med-pro,
  responders, contacts, hospitals, notifications, audit, integrations.
- `prisma/` — schema, migrations, seed (fictional data only).
- `compose.yaml` — local Postgres/PostGIS (to be added).
- `tests/` — Vitest + Playwright.

## Local setup (Windows)

1. Install Node.js LTS, Git, and Docker Desktop. Start Docker Desktop and
   wait for the engine (green status) before database steps. Docker CLI lives
   at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` for per-user
   installs — add it to PATH or use the full path.
2. `copy .env.example .env` (PowerShell). Defaults point at the Compose DB:
   `postgresql://emergency:emergency@localhost:5432/emergency`.
   Use `npm.cmd`/`npx.cmd` if `npm.ps1` is blocked by execution policy.
3. `npm.cmd install`
4. `npm.cmd run db:up` — starts Postgres/PostGIS (`postgis/postgis:16-3.4`).
5. Enable PostGIS once per fresh volume:
   `docker exec emergency-app-db psql -U emergency -d emergency -c "CREATE EXTENSION IF NOT EXISTS postgis;"`
6. `npm.cmd run db:migrate` then `npm.cmd run db:seed` (fictional data only).
7. `npm.cmd run dev` → http://localhost:3000, health at `/api/health`.
8. Sign-in with fictional dev accounts lands with the auth increment (users
   are seeded; no passwords/sessions yet).

Database reset: `npm.cmd run db:reset` (drops + re-migrates + reseeds), or
`docker compose down -v` for a full wipe including the extension.

Prisma is pinned to v6 (`@prisma/client@6`, `prisma@6`): v7.10.0's CLI was
uninstallable at scaffold time (upstream `effect@^4.0.3` missing from the
registry). Re-evaluate before upgrading.

## What works now vs later

- Now: docs + repo hygiene only. No app code yet.
- Later (Phase 1): reporting, reviewed guidance, location review, mock contact
  outcomes, status timeline, offline guidance bundle.
- Mock only: SMS, calls, maps tiles, dispatch, hospital, medical-pro. Real
  provider connections require written approval + contracts (per PRD).

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck` — use `npm.cmd` on Windows if
`npm.ps1` is blocked. `test` / `test:e2e`, `db:migrate`, `db:seed`,
`db:reset` land with the database + test setup (next increments).

## Decisions needed from you (Phase 0 blockers)

1. Pilot market + emergency number(s) + languages (else app ships with
   `UNSPECIFIED-USE-MOCK` only).
2. Install Docker Desktop, or approve a no-Docker Postgres fallback.
3. Scaffold location: Next.js at repo root (alongside `project file/`) vs
   `app/` subfolder — default proposal: repo root.
4. Clinical guidance source + reviewers (no real guidance ships without
   sign-off; placeholders will be labelled SAMPLE-NOT-REVIEWED).
5. Confirm role mapping: PRD groups A–D map to `PATIENT, BYSTANDER, RESPONDER,
   MEDICAL_PROFESSIONAL, DISPATCHER, HOSPITAL_ADMIN, SYSTEM_ADMIN`; trusted
   contacts are contacts with consent, not login accounts.
