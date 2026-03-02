# Codebase Review (Internal-Only)

This document consolidates the issues/risks found and a concrete implementation plan to fix them. Scope includes Next.js API routes, settings/credentials handling, file system access, external integrations, SSE, and runners.

## Issues Found

### Security / Access Control
- **Missing auth on API routes** allows unauthenticated access to create tests, manage scripts, read reports, and change settings.
  - Examples: `apps/web/src/app/api/tests/route.ts`, `apps/web/src/app/api/settings/route.ts`, `apps/web/src/app/api/reports/route.ts`, `apps/web/src/app/api/scripts/route.ts`.
- **Webhook auth is effectively disabled** (any non-empty token accepted), allowing unauthorized test creation.
  - `apps/web/src/app/api/webhooks/route.ts`.
- **Settings API leaks secrets** by returning stored values (tokens/passwords) in GET responses.
  - `apps/web/src/app/api/settings/route.ts`.
- **SSE metrics endpoint unauthenticated** can leak test data and hold long-lived connections.
  - `apps/web/src/app/api/tests/[id]/live/route.ts`.

### Input Validation / Data Handling
- **Missing/weak validation for query params** (limits/offsets/ids), enabling heavy queries or malformed requests.
  - `apps/web/src/app/api/tests/route.ts`, `apps/web/src/app/api/reports/route.ts`, `apps/web/src/app/api/settings/route.ts`.
- **Webhook body not validated**.
  - `apps/web/src/app/api/webhooks/route.ts`.
- **Settings PUT accepts arbitrary payloads** without schema validation, risking inconsistent data types.
  - `apps/web/src/app/api/settings/route.ts`.

### File System Safety
- **Path traversal risk in script uploads** using uploaded file name directly for storage.
  - `apps/web/src/app/api/scripts/route.ts`, `packages/test-runner/src/jmeter/script-manager.ts`.
- **Report downloads read file paths from DB without root checks**, enabling local file read if DB entry is compromised.
  - `apps/web/src/app/api/reports/[id]/download/html/route.ts`, `apps/web/src/app/api/reports/[id]/download/excel/route.ts`.
- **HTML report rendering risks XSS** if any unescaped fields reach HTML output.
  - `packages/report-generator/src/generator.ts`, `apps/web/src/app/api/reports/[id]/html/route.ts`.

### External Calls / SSRF
- **Grafana/Confluence/Jenkins URLs are taken from settings** and used in server-side fetches without allowlist checks.
  - `apps/web/src/app/api/grafana/test-connection/route.ts`, `apps/web/src/app/api/grafana/capture/route.ts`,
    `apps/web/src/app/api/confluence/spaces/route.ts`, `apps/web/src/app/api/confluence/publish/[reportId]/route.ts`,
    `packages/test-runner/src/runners/jenkins.runner.ts`.

### Runner Safety
- **SSH runner constructs command strings** without safe escaping, enabling command injection if inputs are compromised.
  - `packages/test-runner/src/runners/ssh.runner.ts`.
- **Runner logs can leak secrets** by logging full command lines with properties.
  - `packages/test-runner/src/runners/local.runner.ts`.

## Concrete Patch Plan

### 1) Add Auth + Role Checks for API Routes (Internal SSO)
**Goal:** Ensure all API endpoints require an authenticated SSO session; restrict admin-only endpoints.

**Implementation**
- Add auth guard helper in `apps/web/src/lib/auth.ts`:
  - `requireSession(request)` validates SSO identity (header or middleware).
  - `requireAdmin(request)` for admin-only routes.
- Apply guard to all API routes in `apps/web/src/app/api/**/route.ts`.
- Admin-only routes: settings, scripts, webhooks, report generation/download, grafana/confluence endpoints, schedule management.

**Files**
- Add: `apps/web/src/lib/auth.ts`
- Update: all `apps/web/src/app/api/**/route.ts`

### 2) Harden Webhook Authentication
**Goal:** Replace placeholder token check with real validation.

**Implementation**
- Store webhook secret in settings or environment.
- Validate `Authorization: Bearer <secret>` or HMAC signature.
- Add replay protection (timestamp + nonce) if using HMAC.

**Files**
- Update: `apps/web/src/app/api/webhooks/route.ts`

### 3) Validate Inputs with Zod (Query + Body)
**Goal:** Prevent excessive queries and malformed writes.

**Implementation**
- Add Zod schemas for query params (limit/offset, ids).
- Enforce bounds (e.g., `limit` max 100, `offset` max 10k).
- Use `validateBody` for all POST/PUT routes and add `validateQuery` helper.

**Files**
- Update: `apps/web/src/lib/api-utils.ts` (add `validateQuery` helper)
- Update: `apps/web/src/lib/validation.ts` (add schemas)
- Update: API route handlers to use these schemas.

### 4) Protect Settings Secrets
**Goal:** Prevent secret leakage and reduce blast radius.

**Implementation**
- Mask or omit sensitive keys in GET responses (`token`, `password`, `apiKey`).
- Store secrets encrypted at rest (server-side encryption key).
- Restrict settings access to admin role.

**Files**
- Update: `apps/web/src/app/api/settings/route.ts`
- Add: `apps/web/src/lib/secrets.ts` (encrypt/decrypt utilities)

### 5) File System Safety for Uploads and Downloads
**Goal:** Prevent path traversal and arbitrary file reads.

**Implementation**
- Sanitize file names on upload: strip path separators or generate a server-side filename (UUID).
- Ensure resolved file paths stay within allowed root directories (scripts/reports) before read/write.

**Files**
- Update: `apps/web/src/app/api/scripts/route.ts`
- Update: `packages/test-runner/src/jmeter/script-manager.ts`
- Update: `apps/web/src/app/api/reports/[id]/download/html/route.ts`
- Update: `apps/web/src/app/api/reports/[id]/download/excel/route.ts`

### 6) Runner Safety Improvements
**Goal:** Avoid command injection and secret leakage.

**Implementation**
- SSH runner: escape/quote all args or send a prepared script with safe parameter passing.
- Local runner: scrub sensitive values in logs.

**Files**
- Update: `packages/test-runner/src/runners/ssh.runner.ts`
- Update: `packages/test-runner/src/runners/local.runner.ts`

### 7) SSRF Hygiene (Internal)
**Goal:** Restrict outbound calls to approved hostnames.

**Implementation**
- Maintain an allowlist in settings or env.
- Validate URL hostnames before server-side fetches.

**Files**
- Update: `apps/web/src/app/api/grafana/test-connection/route.ts`
- Update: `apps/web/src/app/api/grafana/capture/route.ts`
- Update: `apps/web/src/app/api/confluence/spaces/route.ts`
- Update: `apps/web/src/app/api/confluence/publish/[reportId]/route.ts`
- Update: `packages/test-runner/src/runners/jenkins.runner.ts`

### 8) SSE Resource Controls
**Goal:** Limit long-lived connections and reduce resource usage.

**Implementation**
- Require auth on SSE route.
- Add connection caps or per-user rate limit.
- Add a max stream duration and send heartbeat events.

**Files**
- Update: `apps/web/src/app/api/tests/[id]/live/route.ts`

### 9) Database Indexing (Performance)
**Goal:** Improve frequently queried paths.

**Implementation**
- Add indexes for `test_runs.status`, `test_runs.created_at`, `test_runs.scenario_id`.

**Files**
- Update: `packages/db/src/schema/test-runs.ts`
- Add migration in `packages/db/src/migrations/`.

## Suggested Implementation Order
1) Auth/RBAC + Webhook hardening
2) Input validation + settings masking
3) File system safety + report download safeguards
4) Runner safety
5) SSRF hygiene
6) SSE resource controls
7) DB indexes

## Notes
- App is internal-only behind VPN/SSO; still protect admin-only actions and secrets.
- After changes, run: `bun run lint`, `bun run test`, `bun run db:migrate`.
