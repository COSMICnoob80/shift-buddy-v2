---
description: "Dependency-ordered, TDD-enforced tasks for P0 Foundation & Auth Floor"
---

# Tasks: Phase 0 — Foundation & Auth Floor

**Feature Branch**: `001-p0-foundation-auth`
**Input**: `specs/001-p0-foundation-auth/{plan,spec,data-model,research,quickstart}.md`, `contracts/openapi.yaml`
**Constitution**: v0.2.0 — TDD (II), Scope Discipline (III), Privacy (IV), Auth Hardening (VIII), Config Externalization (XI), Shadow-First (XIII), MEP over MVP (XIV) are binding.

**TDD is mandatory.** Every `(a)` task below writes a FAILING test. No `(b)` implementation task may be committed until its paired `(a)` is red on CI. Commits land in the order listed so the failing→passing arc is reproducible from `git log`.

Parallel marker `[P]` = different files, no shared state with prior incomplete tasks. Serialize when a task edits a file another open task also edits, or when it depends on wiring that isn't green yet.

> **Numbering reconciliation (CP3):** CP1 commits used compressed task IDs that don't match this file 1-to-1. Current mapping from `git log`:
> - T010–T012 → commit `da2916b`, `ab0b4b4`
> - T013–T015 (health + error envelope) → `6741f13` (labeled `T018-T020` in the commit message)
> - T016–T019 (pmdc/password/breach) → `48e2e67` (labeled `T021-T022`)
> - T020–T023 (user model + migration) → `c1b752d` (labeled `T013-T017`)
> - T024–T027 (JWT + alg guard + expiry) → `7ea2ff2` (labeled `T023-T024`)
> - T028–T030 (register endpoint) → `e9e4261` (labeled `T025`)
> - T032–T037 (login + lockout + rate-limit) → `6f00bd8` (labeled `T026-T028`)
> - T038–T040 (auth middleware + request log) → `0fe0244` (labeled `T029-T030`)
>
> Going forward, tasks.md IDs are the source of truth. T031 was missed in CP2 and ships as the CP3 prerequisite.

---

## Phase 1 — Setup (T001–T005)

- [X] T001 Scaffold repo layout per `plan.md` §Project Structure — create empty dirs `api/app/{routers,models,schemas,services,core,data}`, `api/tests/{unit,contract,integration}`, `api/alembic/versions`, `web/src/app/{login,register,board}`, `web/src/{components,lib}`, `web/public/fonts`, `web/tests`, `agents/`, `mobile/`, `scripts/ci/`, `.github/workflows/`. Add `.gitkeep` in empty dirs. **Acceptance**: `tree -L 3` matches plan layout.
- [X] T002 [P] Create `api/pyproject.toml` pinning `fastapi>=0.115`, `pydantic>=2.7`, `pydantic-settings`, `sqlalchemy[asyncio]>=2.0`, `asyncpg`, `alembic`, `passlib==1.7.4`, `bcrypt==4.1.3`, `python-jose[cryptography]`, `slowapi`, `structlog`, `httpx`, `pytest`, `pytest-asyncio`, `mypy`, `ruff`; configure `[tool.ruff]`, `[tool.mypy] strict=true`. **Acceptance**: `uv sync` (or `pip install -e .`) resolves cleanly.
- [X] T003 [P] Create `web/package.json` pinning `next>=14.2.21` (CVE-2025-29927), `react@18`, `typescript@5`, `tailwindcss@3`, `@playwright/test`, `vitest`; `web/tsconfig.json` with `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`; `web/tailwind.config.ts` with dark-theme tokens from spec §Design Tokens. **Acceptance**: `pnpm install` + `pnpm tsc --noEmit` on empty app succeed.
- [X] T004 [P] Create `.env.example` at repo root documenting every env var the API reads: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRES_MIN=15`, `APP_ENV`, `LOG_LEVEL`, plus clinical-config placeholders (`CLINICAL_HR_MIN`, `CLINICAL_HR_MAX`, `CLINICAL_SBP_MIN` — loader-only, no semantics yet). **Acceptance**: file lints via `grep -c '='` matches documented count; no real secrets.
- [X] T005 [P] Create `.github/workflows/ci.yml` skeleton with jobs: `api-lint` (ruff), `api-type` (mypy --strict), `api-test` (pytest -q), `web-lint`, `web-type` (tsc --noEmit), `web-build`, `web-test` (playwright), `router-allowlist`, `secret-scan` (gitleaks). Jobs are wired but may be no-op until their code lands. **Acceptance**: empty `pytest` run exits 0 (no tests collected = green); workflow YAML parses.

---

## Phase 2 — Commit #1: PHI Redactor (Principle IV — Privacy) (T006–T009)

**Gate**: Nothing else writes a log line until T007 is green.

- [X] T006 **RED** — Unit test `api/tests/unit/test_redactor.py`: build a `structlog` logger wired with `RedactingProcessor`; assert every one of `name`, `email`, `pmdc`, `pmdc_number`, `mrn`, `dob`, `phone`, `password`, `token`, `authorization` is replaced with literal `[REDACTED]` in the serialized event dict. Include a nested-dict case and a list-of-dicts case. **Acceptance**: `pytest api/tests/unit/test_redactor.py` fails (module missing).
- [X] T007 **GREEN** — Implement `api/app/core/logging.py` with `RedactingProcessor` (field list above) + `configure_logging()` factory wiring `structlog` JSON renderer. **Acceptance**: T006 passes; no other module imports logging yet.
- [X] T008 [P] **RED** — CVE-guard test `api/tests/unit/test_dependency_pins.py`: parse `api/pyproject.toml` and assert `passlib==1.7.4` and `bcrypt==4.1.3`; additionally import `bcrypt` and call `bcrypt.hashpw(b"x"*12, bcrypt.gensalt(rounds=4))` — must NOT raise `AttributeError` (passlib/bcrypt 4.x smoke). **Acceptance**: test fails only if pins drift or env is broken.
- [X] T009 [P] **RED** — CVE-guard test `web/tests/deps.spec.ts` (Vitest): read `web/package.json` and assert `next` version satisfies `>=14.2.21` (CVE-2025-29927 middleware bypass). **Acceptance**: test fails if someone pins an older `next`.

---

## Phase 3 — Settings + Clinical-Config Loader (FR-009, NFR-007, Principle XI) (T010–T012)

- [X] T010 **RED** — `api/tests/unit/test_clinical_config.py`: assert `ClinicalConfig` Pydantic v2 schema rejects missing envvars with a clear error; assert loader aborts on non-numeric threshold values; assert typed accessor returns `Decimal`/`int` (not `str`). Include a "no protocol code" sentinel: assert `api/app/core/clinical_config.py` contains zero threshold-comparison operators (`>`, `<`, `>=`, `<=`) via a source-scan. **Acceptance**: fails until T011 ships.
- [X] T011 **GREEN** — `api/app/core/config.py` (pydantic-settings for app config) + `api/app/core/clinical_config.py` (loader + schema only, NO comparisons, NO protocol logic). **Acceptance**: T010 passes.
- [X] T012 [P] Create `CLINICAL_SAFETY.md` at repo root with banner `> **STATUS: INERT (Phase 0). This file becomes BINDING from Phase 1 onward.**` and placeholder sections: LLM advisory-only policy, citation requirement (Principle IX), escalation rules, dose-decision boundary (Principle I). **Acceptance**: file exists; `grep -q "STATUS: INERT" CLINICAL_SAFETY.md` passes.

---

## Phase 4 — Liveness Endpoint (FR-001) (T013–T015)

- [X] T013 **RED** — `api/tests/contract/test_health.py`: `httpx.AsyncClient` GET `/api/v1/health` → `200`, body matches `HealthResponse` schema (`status=="alive"`, `version` is semver string), no DB connection attempted (monkeypatch engine to raise). **Acceptance**: fails until T014.
- [X] T014 **GREEN** — `api/app/routers/health.py` + `api/app/main.py` app factory mounting `/api/v1` prefix, wiring `configure_logging()` from T007, installing error-envelope exception handler override (NFR-003) that converts FastAPI's `{detail: ...}` into `{error, message}`. **Acceptance**: T013 passes.
- [X] T015 [P] `api/tests/unit/test_error_envelope.py`: raise `HTTPException(status_code=418, detail="x")` in a test route; assert response JSON has keys exactly `{"error","message"}`, no `detail` key anywhere. **Acceptance**: passes once T014 handler is wired.

---

## Phase 5 — Password Policy + PMDC Regex (FR-002, NFR-002) (T016–T019)

- [X] T016 **RED** — `api/tests/unit/test_pmdc_regex.py`: parametrize accepted (`"12345-S"`, `"1234-A"`, `"123456-Z"`) and rejected (`"12345"`, `"123-AA"`, `"12345-s"`, `"1234567-A"`) values against `validate_pmdc()`. **Acceptance**: fails until T018.
- [X] T017 **RED** — `api/tests/unit/test_password_policy.py`: ≥12 chars enforced; 3-of-4 classes enforced (table-driven); breach-list hit returns `breached_password`; policy miss returns `weak_password`; bcrypt hash round-trips via `verify()`. **Acceptance**: fails until T018.
- [X] T018 **GREEN** — `api/app/services/password.py`: `validate_pmdc`, `validate_password_policy`, `hash_password` (bcrypt cost 12 via passlib), `verify_password`, `is_breached` (reads `api/app/data/breached_passwords.txt`). **Acceptance**: T016 + T017 pass.
- [X] T019 [P] Add `api/app/data/breached_passwords.txt` — bundled top-10k (line-per-password, lowercased, newline-terminated). Loader in `password.py` caches as a set on first call. **Acceptance**: `wc -l` ≈ 10000; `test_password_policy.py::test_breach_known_password` green.

---

## Phase 6 — User Model + Migration (FR-005) (T020–T023)

- [X] T020 **RED** — `api/tests/integration/test_user_model.py`: create a `User` via SQLAlchemy async session; assert UUID `id`, `password_hash` length 60, `locked_until` nullable, enum `role` defaults to `ho`. Second insert with same email differing only in case raises `IntegrityError` (CI unique). Same PMDC collision raises. **Acceptance**: fails until T022.
- [X] T021 **RED** — `api/tests/integration/test_migration_roundtrip.py`: run `alembic upgrade head && alembic downgrade base && alembic upgrade head` in a throwaway DB; assert success and that `users` table + both indexes (`ix_users_email_lower`, `ux_users_pmdc_number`) exist after upgrade, absent after downgrade. **Acceptance**: fails until T022.
- [X] T022 **GREEN** — `api/app/models/db.py` (async engine/session factory), `api/app/models/user.py` (User ORM matching `data-model.md`), `api/alembic/env.py` + `api/alembic/versions/0001_users.py` hand-written migration (creates enum, table, functional unique index on `LOWER(email)`, unique index on `pmdc_number`). **Acceptance**: T020 + T021 pass.
- [X] T023 [P] `api/tests/integration/test_no_autogenerate.py`: assert `alembic/versions/` contains only hand-authored revisions — no `--autogenerate` header comment. **Acceptance**: passes trivially now; guards P1 drift.

---

## Phase 7 — JWT Service + CVE Guards (FR-004, NFR-002) (T024–T027)

- [X] T024 **RED** — `api/tests/unit/test_jwt_claims.py`: `issue_token(user_id=UUID)` returns a string whose decoded claims contain `sub==str(user_id)`, `iss=="shift-buddy"`, `exp-iat==900`, no `email`/`name`/`pmdc` keys. `iat`/`exp` are integer UTC epoch. **Acceptance**: fails until T026.
- [X] T025 **RED — CVE-2024-33663/33664 guard** — `api/tests/unit/test_jwt_alg_guard.py`: craft a token with header `{"alg":"none"}` and another with `{"alg":"HS512"}`; assert `verify_token()` raises `InvalidTokenError` for both. Also assert `verify_token()` rejects a valid-looking token signed with a different secret. **Acceptance**: fails until T026.
- [X] T026 **GREEN** — `api/app/services/jwt_service.py`: `issue_token(user_id)`, `verify_token(raw)` — explicit `algorithms=["HS256"]` passed to `jose.jwt.decode`, 60s leeway (edge case in spec), claims whitelist enforced. **Acceptance**: T024 + T025 pass.
- [X] T027 [P] `api/tests/unit/test_jwt_expiry.py`: freeze time; token issued at T, assert `verify_token` accepts at T+899s, rejects at T+961s with `token_expired`. **Acceptance**: passes with T026.

---

## Phase 8 — Register Endpoint (Story 1, FR-002/FR-005) (T028–T031)

- [X] T028 **RED** — `api/tests/contract/test_register.py`: all 5 Story-1 acceptance scenarios — happy 201 with JWT + bcrypt-hashed row; weak password 400; breached password 400; invalid PMDC 400; duplicate email OR PMDC 409 with generic `already_registered` message (assert message does NOT contain `"email"` or `"pmdc"`). **Acceptance**: fails until T030.
- [X] T029 [P] **RED** — `api/tests/unit/test_register_schema.py`: Pydantic `RegisterRequest` trims whitespace in `name`, lowercases `email`, rejects `additionalProperties` (matches openapi.yaml). **Acceptance**: fails until T030.
- [X] T030 **GREEN** — `api/app/schemas/{auth,errors}.py`, `api/app/services/auth_service.py::register`, `api/app/routers/auth.py::register`. Duplicate-collision path returns `409 already_registered` via a single catch on `IntegrityError` (no pre-check that would leak existence via timing). **Acceptance**: T028 + T029 pass.
- [X] T031 [P] `api/tests/integration/test_register_logs_redacted.py`: register a user, capture structlog output, assert no `name/email/pmdc/password` values appear — only `[REDACTED]` and the user UUID. **Acceptance**: passes — closes FR-008 loop for the register path.

---

## Phase 9 — Login Endpoint + Lockout + Rate Limit (Story 2, FR-003) (T032–T037)

- [X] T032 **RED** — `api/tests/contract/test_login.py`: Story-2 ACs 1+2 — valid credentials → 200 `{token,user}` with `token.sub == user.id`; unknown email AND wrong password both return identical 401 body `{"error":"invalid_credentials","message":"Invalid email or password."}`. **Acceptance**: fails until T034.
- [X] T033 [P] **RED** — `api/tests/unit/test_login_timing.py`: measure `login()` wall time for (unknown email) vs (known email, wrong password); assert delta < 50ms median over 20 runs (hashes a dummy password on unknown-email path to equalize timing). **Acceptance**: fails until T034 adds timing-equalizer.
- [X] T034 **GREEN** — `api/app/services/auth_service.py::login` + `api/app/routers/auth.py::login`. Unknown-email path MUST still run a bcrypt verify against a dummy hash to equalize timing. **Acceptance**: T032 + T033 pass.
- [X] T035 **RED** — `api/tests/integration/test_login_lockout.py`: 5 failed logins on same account → `failed_login_count=5`, `locked_until=now+15m`; 6th attempt with CORRECT password returns `401 account_locked`; advance clock 15m → correct password succeeds, counters reset. **Acceptance**: fails until T036.
- [X] T036 **GREEN** — Extend `auth_service.login` with lockout state machine per `data-model.md` §State transitions. **Acceptance**: T035 passes.
- [X] T037 **RED→GREEN** — `api/tests/integration/test_login_rate_limit.py`: 6th `/auth/login` from same IP within 60s returns `429 rate_limited`. Implement `api/app/core/ratelimit.py` (slowapi `5/minute` keyed by IP) and wire into `main.py`. **Acceptance**: test passes; 429 body uses error envelope.

---

## Phase 10 — Auth Middleware (FR-004 protection) (T038–T040)

- [X] T038 **RED** — `api/tests/integration/test_auth_middleware.py`: define a throwaway protected route in a test-only subapp; GET without bearer → `401 unauthenticated`; malformed bearer → 401; expired token → `401 token_expired`; valid token → 200. `WWW-Authenticate` header equals `Bearer` (no scheme leakage). **Acceptance**: fails until T039.
- [X] T039 **GREEN** — `api/app/core/middleware.py`: bearer extraction, `verify_token` call, request-state user UUID, public allowlist (`/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/docs`, `/openapi.json`). **Acceptance**: T038 passes.
- [X] T040 [P] `api/tests/integration/test_request_log_metadata.py`: hit any endpoint, assert emitted log line contains `route`, `method`, `status`, `latency_ms`, `user_id` (UUID or null) — and nothing else route-scoped (NFR-008). **Acceptance**: passes.

---

## Phase 11 — Scope Guard CI (NFR-009 / SC-008, Principle III) (T041–T043)

- [ ] T041 **RED** — `api/tests/integration/test_router_allowlist.py`: mirror the CI grep in-process — walks `api/app/routers/` and asserts file set equals `{__init__.py, health.py, auth.py}`. **Acceptance**: passes now; serves as second gate.
- [ ] T042 **GREEN** — `scripts/ci/check_router_allowlist.sh` per plan.md §CI Gates (find + fail on unknown file). `chmod +x`. Wire into `.github/workflows/ci.yml` `router-allowlist` job. **Acceptance**: CI job green on current branch.
- [ ] T043 **Negative CI test** — `api/tests/integration/test_router_allowlist_negative.py`: fixture creates `api/app/routers/_dummy.py` (cleanup on teardown), shells out to `scripts/ci/check_router_allowlist.sh`, asserts non-zero exit AND cleanup restores tree. **Acceptance**: proves the gate fails loud on scope creep.

---

## Phase 12 — Web Shell (Story 3, FR-006/FR-007) (T044–T050)

- [ ] T044 [P] Self-host Inter: download `Inter-Regular.woff2` (400), `Inter-Medium.woff2` (500), `Inter-SemiBold.woff2` (600) latin subsets; commit under `web/public/fonts/`. Add `@font-face` rules in `web/src/app/layout.tsx` with `font-display: swap`, `src: url('/fonts/Inter-*.woff2')`. No `next/font/google` import. **Acceptance**: files exist; `grep -r "fonts.googleapis" web/` returns nothing.
- [ ] T045 [P] `web/src/app/globals.css`: emit ONLY the dark-theme CSS custom properties from spec §Design Tokens. No light tokens. **Acceptance**: file contains `--color-bg:#0a0a0f;` etc.; no `--color-*-light` tokens present.
- [ ] T046 [P] `web/src/lib/api.ts`: typed client with `register()`, `login()`, `health()` whose types mirror `contracts/openapi.yaml`. `web/src/lib/session.ts`: bearer storage (httpOnly-preferred; localStorage as P0 fallback, flagged TODO for P1). **Acceptance**: `tsc --noEmit` green; `grep -r "fetch(" web/src/app` returns nothing (pages use client only).
- [ ] T047 [P] `web/src/app/{register,login,board}/page.tsx` + `web/src/components/AppShell.tsx`. `/board` reads token via `session.ts`; if absent, `redirect('/login')`. No clinical calls. **Acceptance**: `pnpm build` green.
- [ ] T048 **RED** — `web/tests/smoke.spec.ts` (Playwright): register → lands on `/board`; clear token → visiting `/board` redirects to `/login`; network panel shows zero requests to `fonts.googleapis.com` and at least one request to `/fonts/Inter-Regular.woff2`. **Acceptance**: fails until T044 + T047 land together.
- [ ] T049 [P] `web/tests/error_envelope.spec.ts`: submit invalid login; assert UI surfaces `{error,message}` shape (not `{detail}`), generic message only. **Acceptance**: passes once T046 client + T034 backend are green.
- [ ] T050 [P] `web/tests/a11y.spec.ts`: axe-core smoke on `/login`, `/register`, `/board` — no critical violations. **Acceptance**: passes; P0 minimum-viable a11y floor.

---

## Phase 13 — Compose, Quickstart, Final Gates (T051–T055)

- [ ] T051 [P] `docker-compose.yml` at repo root: services `api`, `db` (postgres:16), `redis` (redis:7). `ollama` declared under profile `inference` (OFF by default — Principle V). **Acceptance**: `docker compose config` valid; `docker compose up -d db redis` works.
- [ ] T052 [P] Verify `quickstart.md` steps end-to-end on a fresh clone: `cp .env.example .env` → `docker compose up -d db redis` → `alembic upgrade head` → `pytest` green → `uvicorn app.main:app` serves `/api/v1/health` 200 → `pnpm install && pnpm dev` → Playwright smoke green. **Acceptance**: quickstart.md updated with any drift; register→`/board` round-trip ≤ 60s (SC-001).
- [ ] T053 [P] Secret-scan: `.pre-commit-config.yaml` with `gitleaks`; matching CI job in `ci.yml`. **Acceptance**: `pre-commit run --all-files` clean; a planted fake secret is blocked.
- [ ] T054 Run the full Constitution Check from `plan.md` §Constitution Check; update any row that drifted. **Acceptance**: all 12 principles checked in the PR description with evidence links (test IDs, file paths).
- [ ] T055 Confirm `plan.md` §Deliverables: all source present; `CLINICAL_SAFETY.md` banner correct; OpenAPI committed; 10-step TDD commit arc visible in `git log --oneline`; CI green including router gate (T042) and negative test (T043). **Acceptance**: branch is merge-ready into `dev`.

---

## Phase 14 — MEP Hinges: Shadow-First + Feature Flags (Principles XIII, XIV) (T056–T060)

**Intent**: P0 ships evolution-ready scaffolding — loader, table, ADR — with ZERO P1+ logic. Flags default OFF, `shadow_events` sits empty, no writers, no endpoints. Retrofitting these hinges in P1 would be a constitution violation (Principle XIV).

- [ ] T056 Create `api/app/core/feature_flags.py` — pydantic-settings env-driven loader exposing a typed `FeatureFlags` model with three flags, all default OFF / 0: `shadow_mode_enabled: bool = False`, `agent_autonomy_level: int = 0`, `divergence_logging_enabled: bool = False`. Env prefix `FEATURE_` (e.g., `FEATURE_SHADOW_MODE_ENABLED=true`). Provide a `get_feature_flags()` cached accessor. NO call-sites in P0 code — loader + model only. **Acceptance**: module imports cleanly; `get_feature_flags()` returns all-OFF defaults with no env set; `grep -r "get_feature_flags\|FeatureFlags" api/app/routers api/app/services` returns nothing (Principle III: no check-sites wired yet).
- [ ] T057 [P] **RED→GREEN** — `api/tests/unit/test_feature_flags.py`: (a) defaults all OFF with empty env; (b) `FEATURE_SHADOW_MODE_ENABLED=true` flips the bool; (c) `FEATURE_AGENT_AUTONOMY_LEVEL=2` parses as `int`, `FEATURE_AGENT_AUTONOMY_LEVEL=notanint` raises `ValidationError`; (d) unknown env keys like `FEATURE_BOGUS` are rejected via `model_config = SettingsConfigDict(extra="forbid")`. **Acceptance**: all four cases pass; test lands after T056.
- [ ] T058 Create `api/alembic/versions/0002_shadow_events.py` — hand-written Alembic migration creating `shadow_events` table. Columns: `id UUID PK DEFAULT uuid4()` (app-side or `gen_random_uuid()`), `shift_id UUID NULL` (no FK in P0 — shifts entity lands P1+), `ho_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `event_type VARCHAR(50) NOT NULL`, `payload JSONB NOT NULL DEFAULT '{}'::jsonb` (de-identified — PHI redactor must run before any future writer; FR-008 contract extends here), `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `divergence_score FLOAT NULL`. Index: `ix_shadow_events_ho_user_id_created_at` on `(ho_user_id, created_at DESC)`. Downgrade drops the index then the table. NO ORM model. NO router. NO service. Table is inert P0. **Acceptance**: `alembic upgrade head` creates the table; `psql -c '\d shadow_events'` matches schema; `grep -r "shadow_events" api/app/` returns only the migration file.
- [ ] T059 [P] **RED→GREEN** — `api/tests/integration/test_shadow_events_migration.py`: (a) round-trip `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` is clean; (b) using a raw SQLAlchemy `text()` INSERT against a fixture user, write one row with `event_type='agent_suggestion'`, `payload='{"note":"synthetic"}'::jsonb`, fetch it back, assert `id` is UUID, `created_at` is TIMESTAMPTZ in UTC, `divergence_score IS NULL`; (c) downgrade drops the table (`information_schema.tables` lookup returns zero rows). No ORM layer used — this test exercises schema only. **Acceptance**: all three cases pass; guarantees the MEP hinge is real, not cosmetic.
- [ ] T060 Create `docs/adr/0001-shadow-first-deployment.md` recording the Shadow-First + MEP doctrine. Sections: **Context** (Principle XIII rationale — clinical agents cannot ship autonomous; Principle XIV — scaffolding must land in P0 or it never lands); **Decision** (every clinical agent feature runs in shadow mode; graduation requires a per-feature constitution amendment recording threshold, sample size, measured divergence); **Divergence Threshold** (PLACEHOLDER — TBD at P1 planning; expected form: "divergence_rate < X% over N real shifts"); **Graduation Process** (1. collect shadow telemetry in `shadow_events`; 2. analyze divergence per agent; 3. draft amendment PR citing data; 4. project-owner approval; 5. flip feature flag `agent_autonomy_level`); **P0 Artifacts** (this ADR, `feature_flags.py`, `shadow_events` migration); **References** (constitution Principles XIII + XIV; plan.md Constitution Check rows). **Acceptance**: file exists; `grep -q "Principle XIII" docs/adr/0001-shadow-first-deployment.md` and `grep -q "Principle XIV" docs/adr/0001-shadow-first-deployment.md` both succeed; TBD markers are explicitly labeled `TBD (P1)` not silently missing.

---

## Dependency Graph (non-obvious callouts)

- T007 (redactor) MUST land before T014 (app factory wires logging) — Principle IV commit-#1 rule.
- T011 (clinical config loader) MUST land before T014 (app boot imports config).
- T018 (password service) blocks T030 (register) — consumes `hash_password`/`is_breached`.
- T022 (User model + migration) blocks T030 and T034 — DB must exist.
- T026 (JWT service) blocks T030, T034, T039 — all issue or verify tokens.
- T036 (lockout) extends T034's service — must follow.
- T039 (middleware) imports `verify_token` from T026.
- T042 (scope-guard shell) follows T041 (in-process mirror test) — prove intent before CI wiring.
- T048 (Playwright smoke) depends on BOTH T030 (register backend) AND T047 (web pages) — cross-stack gate.

## Parallel Batches (safe concurrent execution)

- **After T001**: {T002, T003, T004, T005} — different files, no cross-deps.
- **After T007**: {T008, T009} — dep-pin CVE guards.
- **After T014**: {T015, T023, T027, T040} — independent unit guards once app factory is up.
- **Web layer**: {T044, T045, T046} in parallel; then T047; then {T048, T049, T050}.
- **Finalization**: {T051, T052, T053} in parallel before T054.

## Story Coverage (spec.md)

- **Story 1 (HO registers)** → T016–T019 (policy) + T020–T023 (model) + T028–T031 (endpoint). Independently testable via `test_register.py`.
- **Story 2 (HO logs in)** → T024–T027 (JWT) + T032–T037 (login, lockout, rate-limit). Independently testable via `test_login*.py`.
- **Story 3 (empty board shell)** → T044–T050. Independently testable via `smoke.spec.ts`; depends on Story 2 for token issuance.

## MEP Cutline (Principle XIV — not an MVP cut)

There is no "scope cut" option in P0. Principle XIV makes the MEP hinges (T056–T060) as load-bearing as the auth floor: retrofitting `feature_flags.py` or `shadow_events` in P1 is a constitution violation. Tasks T001–T043 are the backend floor + scope guard; T044–T050 (web shell) protect design-token parity for P1; T056–T060 protect evolvability. All three bands ship together or P0 is not done.

## Task Count

**60 atomic tasks** across 14 phases. Each has a single concern, a file path, and an explicit acceptance criterion. The `(a) test → (b) code` TDD pairing holds for all 10 steps of `plan.md` §TDD Order; Phase 14 adds MEP scaffolding per Principles XIII + XIV.
