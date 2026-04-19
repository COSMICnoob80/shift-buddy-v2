# Feature Specification: Phase 0 — Foundation & Auth Floor

**Feature Branch**: `001-p0-foundation-auth`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Phase 0 locked scope per project plan; bounded by Constitution v0.1.0 (Principles I, III, IV, V, VIII, X, XI, XII).

---

## 1. Purpose & Non-Goals

### Purpose

Phase 0 establishes the **minimum safe foundation** on which every subsequent clinical phase will be built. It ships:

- A reachable API process with a liveness probe.
- House Officer (HO) account lifecycle (register, login) with hardened credential handling.
- A Next.js web shell authenticated users can reach, rendered in the official dark theme with self-hosted Inter.
- Privacy, safety, and config scaffolding (PHI redactor, clinical-config loader, `CLINICAL_SAFETY.md`) so P1 can activate clinical surfaces without retrofitting.

P0 is explicitly **not a product release**. It exists to make Phase 1 landable without compromising Principles I (Clinical Safety), IV (Privacy), VIII (Auth Hardening), or XI (Config Externalization).

### Non-Goals (explicit exclusions — citing Principle III, Scope Discipline)

P0 ships auth + `/health` + shell ONLY. The following are **BLOCKED until the P1 gate**:

- ❌ Patient CRUD, patient board data, patient cards
- ❌ Vital signs recording or trend retrieval
- ❌ Lab result ingestion or alerting
- ❌ Alert engine, alert banner logic, acknowledgements
- ❌ Clinical protocol evaluation or protocol content
- ❌ Any AI/LLM call path (MedGemma, Gemma, Whisper) — no new routers; obsolete candidates removed
- ❌ Scanner / OCR / ADMO / handover / WhatsApp / mobile / MCP / RAG
- ❌ Refresh tokens (ticketed for P1; P0 is access-token-only)
- ❌ `/ready` readiness probe (P1, once dependencies land)
- ❌ Light theme tokens (dark-only in P0; light deferred)
- ❌ Password reset, email verification, profile editing (P1+)

CI MUST enforce the scope floor: `api/app/routers/` contains only `health.py` and `auth.py` at end of P0.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HO registers for an account (Priority: P1)

A House Officer visits the web app, opens `/register`, enters their PMDC number, hospital code, department, name, email, and a strong password. On submission they receive a session and are routed to the empty `/board` shell.

**Why this priority**: Without registration, no other P0 surface is reachable. Registration is also where auth hardening must hold the line (bcrypt, breach check, PMDC format) — the first place a weak default would corrupt downstream phases.

**Independent Test**: POST `/api/v1/auth/register` with valid fields; confirm 201 + JWT and that the `User` row exists with a bcrypt hash (never plaintext) and a UUID `id`.

**Acceptance Scenarios**:

1. **Given** no existing user with the supplied email or PMDC, **When** the HO submits a valid registration, **Then** the system returns `201` with a JWT access token and the user record persists with a bcrypt-cost-12 `password_hash` — never plaintext.
2. **Given** a password of 11 characters, **When** the HO submits registration, **Then** the system returns `400 error="weak_password"` and no user is created.
3. **Given** a password appearing in the top-10k breached list, **When** the HO submits, **Then** the system returns `400 error="breached_password"` and no user is created.
4. **Given** PMDC `"12345"` (missing trailing `-X`), **When** the HO submits, **Then** the system returns `400 error="invalid_pmdc"`.
5. **Given** an email or PMDC already registered, **When** the HO submits, **Then** the system returns `409 error="already_registered"` with a generic message that does NOT disclose which field collided (Principle IV).

---

### User Story 2 - HO logs in (Priority: P1)

A registered HO visits `/login`, enters email + password, and on success is redirected to `/board`. On failure they see a generic error that does not reveal whether the email exists.

**Why this priority**: Login is the daily entry point and the primary target for credential attacks. Rate limiting and lockout enforcement here set the security floor for the whole product.

**Independent Test**: POST `/api/v1/auth/login` with valid credentials; confirm 200 + JWT whose `sub` claim equals the user UUID (never email or PMDC). Issue 6 invalid attempts from one IP in <15 min; confirm slowapi rate-limits and/or the account locks out for 15 minutes.

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** the HO submits login, **Then** the system returns `200 {token, user}` where `token` is a 15-min HS256 JWT and `token.sub` equals the user's UUID.
2. **Given** invalid credentials, **When** the HO submits login, **Then** the system returns `401 error="invalid_credentials"` — the same message whether email was unknown or password was wrong (Principle IV).
3. **Given** 5 failed attempts on the same account within 15 minutes, **When** a 6th attempt occurs (even with correct password), **Then** the system returns `401 error="account_locked"` until 15 minutes have elapsed since the 5th failure.
4. **Given** more than 5 login requests in 1 minute from the same IP, **When** the 6th request arrives, **Then** the system returns `429 error="rate_limited"`.
5. **Given** any login response (success or failure), **When** logs are inspected, **Then** they contain only the user UUID and request metadata — never email, password, PMDC, or the JWT value.

---

### User Story 3 - HO sees the empty board shell (Priority: P2)

An authenticated HO is redirected to `/board` after login. The page renders the dark-theme chrome (header with app name and a logged-in-as indicator, bottom nav tabs) using self-hosted Inter. No patient data is fetched or shown — a placeholder communicates that clinical features arrive in Phase 1.

**Why this priority**: Proves the auth round-trip end-to-end (token issuance → protected route → UI shell) and locks in design tokens so P1 clinical surfaces inherit the same visual floor. No clinical data is required to validate it.

**Independent Test**: After login, visit `/board`; confirm header and nav render, Inter loads from a self-hosted `.woff2` (no Google Fonts request in the network panel), only dark-theme CSS custom properties are present, and the placeholder body is shown.

**Acceptance Scenarios**:

1. **Given** a valid session, **When** the HO loads `/board`, **Then** the page renders the app shell with a placeholder body (no patient data, no calls to clinical endpoints).
2. **Given** no valid session, **When** a visitor loads `/board`, **Then** they are redirected to `/login`.
3. **Given** any P0 page, **When** inspected in the browser, **Then** no request is made to `fonts.googleapis.com`; Inter loads from the app's own origin as `.woff2`.

---

### Edge Cases

- Registration with whitespace-only name → `400 error="invalid_name"` (inputs trimmed before validation).
- Login with an email that differs only by case from a stored email → MUST match (emails stored/compared lowercase).
- Clock skew on JWT validation → allow ≤60s leeway; beyond that → `401 error="token_expired"`.
- `/health` called while DB is unreachable → still returns 200 (P0 liveness is process-alive only; readiness is P1).
- Concurrent registrations with the same PMDC → exactly one succeeds; the other gets `409 error="already_registered"`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 — Liveness endpoint**: System MUST expose `GET /api/v1/health` returning `200 {"status":"alive","version":"<semver>"}` without authentication and without touching any dependency. *Acceptance*: an unauthenticated GET returns 200 with both fields even if the database is down.

- **FR-002 — Registration**: System MUST expose `POST /api/v1/auth/register` that validates name (trimmed, 1–100 chars), email (RFC 5322, lowercased), PMDC (regex `^\d{4,6}-[A-Z]$`), hospital code, department, and password (≥12 chars, 3-of-4 character classes: lower/upper/digit/symbol; rejected if in top-10k breached-password list). Passwords MUST be stored as bcrypt hashes at cost 12 — never plaintext, never reversible. *Acceptance*: the 5 scenarios in Story 1 pass; DB stores only the hash.

- **FR-003 — Login**: System MUST expose `POST /api/v1/auth/login` returning `{token, user}` on success and a generic `invalid_credentials` error on any failure mode (unknown email, wrong password, malformed body). *Acceptance*: no response body or observable timing discloses whether the email exists.

- **FR-004 — JWT issuance & protection**: Tokens MUST be HS256 with 15-minute expiry, `sub` = user UUID, `iat`/`exp` in UTC, and NO PHI or PII in claims. A middleware MUST reject every request outside the public allowlist (`/health`, `/auth/register`, `/auth/login`, OpenAPI docs) with `401 error="unauthenticated"` when the bearer is missing, malformed, expired, or wrongly signed. *Acceptance*: any GET/POST to a non-allowlisted path without a valid bearer returns 401.

- **FR-005 — User persistence**: System MUST persist a `User` entity matching §Data Model with a forward migration enforcing case-insensitive uniqueness on `email` and uniqueness on `pmdc_number`. *Acceptance*: duplicate email or PMDC returns 409; migration is idempotent and reversible.

- **FR-006 — Web shell routes**: The Next.js App Router MUST expose `/login`, `/register`, and `/board`; `/board` MUST redirect unauthenticated visitors to `/login`; Inter MUST be self-hosted as `.woff2`; only the dark-theme design tokens (§Design Tokens) MUST be emitted in CSS. *Acceptance*: Story 3 scenarios pass; no Google Fonts request is made.

- **FR-007 — Typed API client stub**: The web app MUST use a single typed client exposing `register()`, `login()`, and `health()` wrappers whose request/response types match §API Contract. The client MUST attach the stored bearer to protected requests and surface structured `{error, message}` failures to callers. *Acceptance*: the three UI pages call only these wrappers; no raw `fetch` in page code.

- **FR-008 — PHI redactor ships in commit #1 (Principle IV)**: A `structlog` `RedactingProcessor` MUST strip the following fields from every log event, at every level, across all loggers, before emission: `name`, `email`, `pmdc`, `pmdc_number`, `mrn`, `dob`, `phone`, `password`, `token`, `authorization`. Replacement token: `"[REDACTED]"`. Installed in the first application commit that adds logging. *Acceptance*: a unit test logs a dict containing each listed field and asserts `[REDACTED]` appears in the serialized output for every one.

- **FR-009 — Clinical-config loader (loader only, no protocols)**: `api/app/core/clinical_config.py` MUST load clinical thresholds from environment variables, validate with a Pydantic v2 schema, fail fast on invalid/missing values at startup, and expose a typed accessor. NO threshold values MAY be hardcoded in application code (Principle XI). P0 ships the loader and a schema validation test — **no protocol code, no alert code**. *Acceptance*: starting the app with an invalid threshold envvar aborts boot with a clear error; a schema test asserts rejection of known-bad values.

- **FR-010 — `CLINICAL_SAFETY.md` scaffold**: A `CLINICAL_SAFETY.md` file MUST exist at the repository root at end of P0, with a header stating it is INERT during P0 and BINDING from P1 onward, plus placeholders for the sections P1 will fill (LLM-advisory-only policy, citation requirements, escalation rules). *Acceptance*: file exists with the activation-header banner; referenced by the P0 plan.

### Non-Functional Requirements

- **NFR-001 — Privacy by Default (Principle IV)**:
  - JWT `sub` is the user UUID only; no email, name, PMDC, or other identifiers in claims.
  - All server logs flow through the `RedactingProcessor` (FR-008).
  - Error messages never disclose whether an email or PMDC is registered.
  - No request or response body is logged; only structured metadata (route, status, latency, user UUID).

- **NFR-002 — Auth Hardening Floor (Principle VIII — locked values, not suggestions)**:
  - JWT: HS256, 15-min access tokens. Refresh tokens DEFERRED to P1 (tracked as an issue).
  - PMDC regex: `^\d{4,6}-[A-Z]$`.
  - Password policy: ≥12 chars, 3-of-4 classes, bcrypt cost 12, top-10k breach-list rejection.
  - Account lockout: 5 failed logins → 15-minute lockout.
  - Rate limit: slowapi `5/min/IP` on `POST /auth/login`.
  - Any weakening requires a constitution amendment.

- **NFR-003 — Error envelope**:
  - Every error response is exactly `{"error": "<code>", "message": "<human readable>"}`.
  - FastAPI's default `{"detail": ...}` shape MUST be overridden globally; it never reaches a client.
  - Codes are stable, machine-readable snake_case strings: `invalid_credentials`, `weak_password`, `breached_password`, `invalid_pmdc`, `invalid_email`, `invalid_name`, `invalid_hospital_code`, `invalid_department`, `already_registered`, `unauthenticated`, `token_expired`, `account_locked`, `rate_limited`.

- **NFR-004 — Time discipline**: Server operates in UTC exclusively (timestamps, JWT `iat`/`exp`, log fields). PKT conversion is strictly a frontend display concern.

- **NFR-005 — Offline-first posture (Principle XII)**:
  - P0 ships no cloud-only path. `/health`, `/auth/*`, and the web shell run entirely against local services.
  - Auth does not depend on any external identity provider.
  - The breach-list check uses a bundled local dataset (no network call).

- **NFR-006 — OSS-only runtime (Principle V)**: No P0 code path may reach proprietary or cloud-hosted inference. Any legacy router config referencing obsolete model candidates MUST be removed by end of P0.

- **NFR-007 — Type safety (Principle VI)**: All API request/response bodies are Pydantic v2 models; the web client uses TypeScript strict with no `any`. CI MUST run `mypy --strict` and `tsc --noEmit`.

- **NFR-008 — Observability (metadata only)**: Every request emits one structured log line with route, method, status, latency, and authenticated user UUID (when present). No payloads. No headers beyond route-scoped metadata.

- **NFR-009 — CI scope gate (Principle III)**: CI MUST fail the build if `api/app/routers/` contains any file other than `health.py` and `auth.py` while the branch targets P0.

---

## API Contract (P0 only)

**Base URL**: `/api/v1`
**Auth**: Bearer JWT on all endpoints **except** `GET /health`, `POST /auth/register`, `POST /auth/login`, and OpenAPI docs.
**Error envelope (every non-2xx)**: `{"error": "<code>", "message": "<human>"}` — never `{"detail": ...}`.

### `GET /api/v1/health`

- **Auth**: none.
- **Request**: no body, no params.
- **Success** `200`: `{"status": "alive", "version": "<semver>"}`
- **Errors**: none expected in P0 (liveness is process-alive only).

### `POST /api/v1/auth/register`

- **Auth**: none.
- **Request body**:

  ```json
  {
    "name": "Dr. Abdullah Shah",
    "email": "abdullah@example.com",
    "password": "StrongPass#2026",
    "pmdc_number": "12345-S",
    "hospital_code": "FSL",
    "department": "General Surgery"
  }
  ```

- **Success** `201`: `{"id": "<uuid>", "token": "<jwt>"}`
- **Errors**:
  - `400 invalid_name` | `invalid_email` | `invalid_pmdc` | `invalid_hospital_code` | `invalid_department`
  - `400 weak_password` (length / class policy)
  - `400 breached_password` (top-10k match)
  - `409 already_registered` (email OR PMDC collision — message MUST NOT disclose which)

### `POST /api/v1/auth/login`

- **Auth**: none.
- **Rate limit**: slowapi `5/min/IP`.
- **Request body**: `{"email": "abdullah@example.com", "password": "StrongPass#2026"}`
- **Success** `200`:

  ```json
  {
    "token": "<jwt-15min-hs256>",
    "user": {
      "id": "<uuid>", "name": "...", "email": "...", "role": "ho",
      "hospital_code": "FSL", "department": "General Surgery"
    }
  }
  ```

- **Errors**:
  - `401 invalid_credentials` (unknown email OR wrong password — same message, same timing)
  - `401 account_locked` (after 5 failures within 15 min; for 6th+ attempt until lockout elapses)
  - `429 rate_limited`

### JWT Claims

- `sub`: user UUID (string). **Never** email or PMDC.
- `iat`, `exp`: UTC epoch seconds. `exp = iat + 900` (15 min).
- `iss`: `"shift-buddy"`.
- **Disallowed**: any claim containing PHI/PII (`name`, `email`, `pmdc_number`, `phone`, etc.).

### Protected Routes (middleware behavior)

Every other route (none exist in P0, but future routes inherit this) returns `401 unauthenticated` if the bearer is missing/malformed/expired/invalid. WWW-Authenticate leaks no scheme details beyond `Bearer`.

---

## Data Model

### Key Entities

- **User** (only entity introduced in P0; matches SPEC.md §1.5):

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | UUID v4 | Auto | Primary key, immutable | Used as JWT `sub`. |
| `name` | String | Yes | 1–100 chars, trimmed | PHI — redacted from logs. |
| `email` | String | Yes | RFC 5322, lowercased, unique (CI) | PHI — redacted from logs. |
| `password_hash` | String | Yes | bcrypt cost 12 | Never exposed by any API. |
| `pmdc_number` | String | Yes | `^\d{4,6}-[A-Z]$`, unique | PHI — redacted from logs. |
| `hospital_code` | String | Yes | 1–20 chars | e.g., `"FSL"`. |
| `department` | String | Yes | 1–100 chars | e.g., `"General Surgery"`. |
| `role` | Enum | Yes | `ho` \| `senior_resident` \| `consultant` | Default `ho` in P0. |
| `failed_login_count` | Integer | Auto | ≥0, default 0 | Reset on successful login. |
| `locked_until` | ISO 8601 DateTime (UTC) | Auto | Nullable | Set when `failed_login_count` hits 5. |
| `created_at` | ISO 8601 DateTime (UTC) | Auto | Immutable | |
| `updated_at` | ISO 8601 DateTime (UTC) | Auto | Refreshed on mutation | |

**Relationships**: none in P0 (patient/vital/lab entities blocked until P1).

**Migration**: single forward migration creates the `users` table with a case-insensitive unique index on `email` and a unique index on `pmdc_number`. Migration MUST be reversible.

---

## Design Tokens (Dark-Theme Only; Light Deferred)

Only these CSS custom properties are emitted in P0 (source: SPEC.md §5.1):

| Token | Value |
|---|---|
| `--color-bg` | `#0a0a0f` |
| `--color-surface` | `#1a1a2e` |
| `--color-text-primary` | `#f0f0f0` |
| `--color-text-secondary` | `#8888aa` |
| `--color-critical` | `#ef4444` |
| `--color-warning` | `#f59e0b` |
| `--color-stable` | `#22c55e` |
| `--color-discharge` | `#3b82f6` |
| `--color-accent` | `#6366f1` |
| `--radius-card` / `--radius-button` / `--radius-input` | `8px` / `6px` / `4px` |
| Spacing scale | 4px base: `4, 8, 12, 16, 24, 32, 48` |
| Font | Inter (self-hosted `.woff2`): 400 body, 500 label, 600 heading |

Critical / warning / stable / discharge tokens are defined in P0 so P1 inherits them without adding new ones.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new HO can complete registration and reach the `/board` shell in under 60 seconds from a cold page load.
- **SC-002**: 100% of non-allowlisted requests without a valid bearer token receive `401 unauthenticated` (zero unauthenticated leaks).
- **SC-003**: 100% of stored passwords are bcrypt hashes; automated audit of the user table finds zero plaintext or non-bcrypt values.
- **SC-004**: Logs sampled over any 24h window contain zero occurrences of the literal strings of test-seeded PHI fields (name, email, PMDC, password, token).
- **SC-005**: After 5 failed logins on the same account, the 6th attempt (even with correct password) is rejected for 15 minutes — verified by an automated test.
- **SC-006**: slowapi rejects the 6th `/auth/login` request from the same IP within 60 seconds with HTTP 429 — verified by an automated test.
- **SC-007**: No request to `fonts.googleapis.com` or any third-party font CDN originates from the P0 web app — verified by a network-trace test.
- **SC-008**: `api/app/routers/` at the P0 merge point contains exactly two files: `health.py` and `auth.py` — enforced by CI.
- **SC-009**: Starting the API with an invalid clinical-config env var aborts boot with a schema-validation error — verified by an integration test.

---

## Assumptions

- Partner hospitals pre-authorize HOs out-of-band; no invite/approval workflow is required in P0.
- The top-10k breached-password list ships as a bundled local dataset (e.g., a pre-downloaded Pwned Passwords subset). No runtime call to an external breach API.
- Account lockout state is stored on the `User` row (`failed_login_count`, `locked_until`); a Redis-backed counter is not required at P0 scale.
- The web shell is served from the same origin as the API (or via a trusted reverse proxy); CORS is not a P0 concern.
- OpenAPI docs (`/docs`, `/openapi.json`) are allowlisted only in dev; production exposure is handled by infra config and is out of scope here.

---

## Review & Acceptance Checklist

### Content Quality

- [ ] Spec describes WHAT and WHY only; technology choices are limited to those pinned by the constitution.
- [ ] Every non-goal in §1 cites Principle III (Scope Discipline), directly or via the blocked list.
- [ ] Every functional requirement has at least one acceptance scenario or measurable criterion.

### Requirement Completeness

- [ ] Zero `[NEEDS CLARIFICATION]` markers remain.
- [ ] Every FR is testable and unambiguous.
- [ ] Success criteria are measurable and technology-agnostic.
- [ ] Edge cases cover auth failure modes, casing, clock skew, DB-down liveness, and concurrent uniqueness collisions.
- [ ] Scope is clearly bounded by §1 non-goals AND the FR-009/SC-008 CI gate.
- [ ] Assumptions document every reasonable default taken in place of a clarifier.

### Constitutional Alignment

- [ ] **I. Clinical Safety Supremacy**: no clinical decision, dose, or protocol path ships in P0.
- [ ] **III. Scope Discipline**: router allowlist gate is present as NFR-009 / SC-008.
- [ ] **IV. Privacy by Default**: redactor (FR-008) ships in commit #1; JWT `sub` is UUID (FR-004); error messages don't disclose account existence (Story 1 AC5, Story 2 AC2).
- [ ] **V. OSS-Only Runtime**: NFR-006 removes legacy router candidates; no proprietary inference path is introduced.
- [ ] **VIII. Auth Hardening Floor**: all locked values from NFR-002 match the constitution verbatim.
- [ ] **XI. Clinical Config Externalization**: loader ships (FR-009); no hardcoded threshold values.
- [ ] **XII. Offline-First**: breach check uses local dataset (NFR-005); no cloud-only path.

### Feature Readiness

- [ ] All three user stories are independently testable.
- [ ] Spec is ≤400 lines.
- [ ] Ready for `/sp.clarify` sanity pass, then `/sp.plan`.
