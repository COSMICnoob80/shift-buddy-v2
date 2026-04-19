# Implementation Plan: Phase 0 — Foundation & Auth Floor

**Branch**: `001-p0-foundation-auth` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-p0-foundation-auth/spec.md`
**Constitution**: `.specify/memory/constitution.md` v0.1.0

## Summary

Phase 0 ships the minimum safe foundation: a FastAPI process with liveness `/health`, hardened House Officer registration + login (bcrypt-12, HS256 15-min JWT, slowapi 5/min/IP, 5-fail/15-min lockout, top-10k breach rejection), a Next.js dark-theme shell at `/login`, `/register`, `/board` (Inter self-hosted), and scaffolding for clinical safety: `structlog` PHI redactor in commit #1, clinical-config loader (no protocols), `CLINICAL_SAFETY.md` placeholder. The stack is locked; planning structures the TDD build order and enforces router-allowlist CI so P1 can land on an unambiguously safe base (Principles I, III, IV, VIII, XI, XII).

## Technical Context

**Language/Version**: Python 3.12+ (api/), TypeScript 5.x strict (web/)
**Primary Dependencies**: FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, passlib[bcrypt], python-jose[cryptography], slowapi, structlog, pydantic-settings; Next.js 14 App Router, Tailwind, Playwright
**Storage**: PostgreSQL 16 (primary), Redis 7 (wired, unused in P0)
**Testing**: pytest + pytest-asyncio + httpx (api), Vitest + Playwright (web)
**Target Platform**: Linux server (Docker Compose dev; GH Actions CI)
**Project Type**: Monorepo (api/ + web/ + agents/ + mobile/ scaffolds) per AGENTS.md
**Performance Goals**: P0 is not perf-critical; SC-001 end-to-end register→/board ≤60s cold
**Constraints**: Offline-first (Principle XII); OSS-only runtime (Principle V — no inference in P0); UTC server time; no PHI in logs or JWT claims
**Scale/Scope**: Single ward pilot; single-digit concurrent HOs; ≤3 web pages; 3 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clinical Safety Supremacy** — P0 ships zero clinical paths; no LLM call exists. `CLINICAL_SAFETY.md` scaffold ships with Phase-1-activation header.
- [x] **II. SDD Discipline** — spec.md + requirements checklist precede plan; every FR/NFR is mapped to a failing test first via the 10-step TDD sequence (see §TDD Order).
- [x] **III. Scope Discipline** — `api/app/routers/` contains only `health.py` + `auth.py`; CI grep gate (§CI Gates) fails the build on any extra router file.
- [x] **IV. Privacy by Default** — `RedactingProcessor` (structlog) lands in the first logging commit; JWT `sub` = UUID; error envelope hides account existence.
- [x] **V. OSS-Only Runtime** — no model/router code ships in P0; Ollama service is present in compose but profile-gated off.
- [x] **VI. Type Safety** — `mypy --strict` (api) and `tsc --noEmit` (web) are CI gates; Pydantic v2 everywhere; no `any` in TS.
- [x] **VII. Git Discipline** — work on `001-p0-foundation-auth` (feature branch); PR targets `dev`; CI required.
- [x] **VIII. Auth Hardening Floor** — locked values from NFR-002 encoded as tests (bcrypt cost 12, HS256 15-min, 5/15 lockout, slowapi 5/min/IP, top-10k breach, PMDC regex).
- [x] **IX. Agent Accountability** — N/A in P0 (no AI surfaces). Re-check at P1 gate.
- [x] **X. Token Hygiene** — plan authored in Plan Mode; `@file` refs only; PHR recorded on completion.
- [x] **XI. Clinical Config Externalization** — `api/app/core/clinical_config.py` loader + schema test ship in P0; no threshold literals; no protocol code.
- [x] **XII. Offline-First** — breach list bundled locally; no external identity provider; no network calls on critical path.

No violations. Complexity Tracking table empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-p0-foundation-auth/
├── plan.md              # This file
├── research.md          # Phase 0: locked-stack CVE/version audit
├── data-model.md        # Phase 1: User entity + migration
├── quickstart.md        # Phase 1: clone → compose up → migrate → test → run
├── contracts/
│   └── openapi.yaml     # /health, /auth/register, /auth/login
├── checklists/
│   └── requirements.md  # (pre-existing)
└── tasks.md             # (deferred to /sp.tasks)
```

### Source Code (repository root)

```text
shift-buddy-v2/
├── api/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory, middleware wiring
│   │   ├── routers/
│   │   │   ├── health.py            # FR-001
│   │   │   └── auth.py              # FR-002, FR-003
│   │   ├── models/
│   │   │   ├── db.py                # SQLAlchemy 2.0 async base, session
│   │   │   └── user.py              # User ORM model
│   │   ├── schemas/
│   │   │   ├── auth.py              # Pydantic v2: Register/Login/Token
│   │   │   └── errors.py            # Error envelope {error,message}
│   │   ├── services/
│   │   │   ├── auth_service.py      # register/login/lockout logic
│   │   │   ├── password.py          # bcrypt hash/verify + breach check
│   │   │   └── jwt_service.py       # HS256 15-min issue/verify
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings env loader
│   │   │   ├── clinical_config.py   # FR-009 loader (no protocols)
│   │   │   ├── logging.py           # structlog + RedactingProcessor
│   │   │   ├── middleware.py        # bearer auth, request-log
│   │   │   └── ratelimit.py         # slowapi limiter
│   │   └── data/
│   │       └── breached_passwords.txt  # NFR-005 bundled top-10k
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/0001_users.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── unit/
│   │   │   ├── test_redactor.py         # FR-008
│   │   │   ├── test_password_policy.py  # FR-002 policy, breach
│   │   │   ├── test_pmdc_regex.py       # NFR-002
│   │   │   ├── test_jwt_claims.py       # FR-004
│   │   │   └── test_clinical_config.py  # FR-009 schema test
│   │   ├── contract/
│   │   │   ├── test_health.py           # FR-001, SC-009-adjacent
│   │   │   ├── test_register.py         # Story 1 ACs
│   │   │   └── test_login.py            # Story 2 ACs, lockout, rate-limit
│   │   └── integration/
│   │       ├── test_auth_middleware.py  # FR-004 protected-route guard
│   │       └── test_router_allowlist.py # NFR-009 / SC-008 CI gate mirror
│   ├── pyproject.toml
│   └── alembic.ini
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── board/page.tsx           # Story 3 shell (redirect if no token)
│   │   │   └── layout.tsx               # Inter + dark-theme tokens
│   │   ├── components/
│   │   │   └── AppShell.tsx
│   │   └── lib/
│   │       ├── api.ts                   # FR-007 typed client
│   │       └── session.ts               # token storage + bearer attach
│   ├── public/fonts/                     # Inter .woff2 (self-hosted)
│   ├── tests/
│   │   └── smoke.spec.ts                # Playwright: login→board, no Google Fonts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── agents/                               # empty in P0 (scaffold only)
├── mobile/                               # empty in P0 (scaffold only)
├── docs/
├── scripts/
│   └── ci/check_router_allowlist.sh      # NFR-009 grep gate
├── .github/workflows/ci.yml
├── docker-compose.yml                    # api, db, redis; ollama profile off
├── CLINICAL_SAFETY.md                    # INERT P0 → BINDING P1 banner
└── .env.example
```

**Structure Decision**: Monorepo split per AGENTS.md. Backend code only in `api/`; frontend only in `web/`; `agents/` and `mobile/` are empty scaffolds in P0 (Principle III).

## Phase 0: Research

**Output**: `research.md`. Stack is locked — research scope is limited to: (a) confirm pinned versions are current stable, (b) flag known CVEs / breaking changes in locked deps vs training cutoff, (c) confirm the passlib/bcrypt compatibility pin (passlib 1.7.4 + bcrypt 4.x has a known AttributeError unless bcrypt is pinned), (d) confirm python-jose maintenance status and note `pyjwt` as an acceptable in-repo fallback if CVE emerges (not swapped pre-emptively).

No NEEDS CLARIFICATION remain: spec is plan-ready per requirements checklist.

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete.

1. **Data model** → `data-model.md`: single `User` entity (§Data Model in spec). Fields, indexes (CI-unique email, unique pmdc_number), Alembic migration strategy (hand-written, reversible, idempotent). No patient/vital/lab entities (Principle III).
2. **Contracts** → `contracts/openapi.yaml`: OpenAPI 3.1 for `/health`, `/auth/register`, `/auth/login` with the locked `{error,message}` envelope and the full error-code enum from NFR-003. Bearer scheme declared for future protected routes.
3. **Quickstart** → `quickstart.md`: clone → `cp .env.example .env` → `docker compose up -d db redis` → `uvx alembic upgrade head` → `pytest` → `uvicorn app.main:app --reload` → `pnpm install && pnpm dev`.
4. **Agent context**: `.specify/scripts/bash/update-agent-context.sh claude` to refresh CLAUDE.md marker block with locked P0 stack (OSS-only note, no model router yet).

Post-design Constitution re-check: all principles still PASS; no new deviations introduced.

## TDD Order (Principle II — 10-step Red→Green sequence)

Every step is Red (failing test) → Green (minimal impl) → Refactor. Tests land before the code under test; commits are ordered so CI reproduces the failing→passing arc.

1. **Redactor unit test** (`test_redactor.py`) → `core/logging.py` RedactingProcessor (FR-008, NFR-001). *Commit #1 — redactor ships before any other logging.*
2. **Settings + clinical-config schema test** (`test_clinical_config.py`) → `core/config.py`, `core/clinical_config.py` (FR-009, NFR-007).
3. **Health contract test** (`test_health.py`) → `routers/health.py` (FR-001).
4. **PMDC regex + password-policy unit tests** → `services/password.py` (FR-002 validators, NFR-002).
5. **Register contract test** (`test_register.py`) — ACs 1–5 → `routers/auth.py::register`, `services/auth_service.py`, User model, Alembic migration (FR-002, FR-005).
6. **JWT claim-shape unit test** (`test_jwt_claims.py`) → `services/jwt_service.py` (FR-004 — `sub`=UUID, HS256, 15-min).
7. **Login contract test** (`test_login.py`) — ACs 1,2 → login path wiring (FR-003).
8. **Lockout integration test** (5-fail→15-min) → `services/auth_service.py` lockout fields (Story 2 AC3, NFR-002).
9. **Rate-limit integration test** (slowapi 5/min/IP → 429) → `core/ratelimit.py` (Story 2 AC4, NFR-002).
10. **Protected-route middleware test** (`test_auth_middleware.py`) → `core/middleware.py` bearer guard, 401 envelope (FR-004, NFR-003).

Frontend follows with Playwright smoke: register→board round-trip, redirect-when-unauth, no Google Fonts request (Story 3 ACs, SC-007).

## CI Gates (maps to NFR-009 / SC-008 and Principle III)

`.github/workflows/ci.yml` on PR to `dev` runs, in order:

1. `ruff check .` + `ruff format --check .` (api)
2. `mypy --strict app/` (api)
3. `pytest -q` (api)
4. `pnpm --filter web lint`
5. `pnpm --filter web typecheck` (`tsc --noEmit`)
6. `pnpm --filter web build` + `pnpm --filter web test` (Playwright smoke)
7. **Router allowlist gate** — `scripts/ci/check_router_allowlist.sh`:

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   extra=$(find api/app/routers -maxdepth 1 -type f -name '*.py' \
     ! -name '__init__.py' ! -name 'health.py' ! -name 'auth.py')
   if [ -n "$extra" ]; then
     echo "P0 router allowlist violation (Principle III):"; echo "$extra"; exit 1
   fi
   ```

8. Secret scan (`gitleaks` or equivalent) — pre-commit parity.

## Deliverables (end of P0)

- All source per §Project Structure.
- `CLINICAL_SAFETY.md` at repo root with banner:
  `> **STATUS: INERT (Phase 0). This file becomes BINDING from Phase 1 onward.**`
  and placeholder sections (LLM advisory-only policy, citation requirements, escalation rules) to be filled at the P1 gate.
- OpenAPI contract committed under `specs/001-p0-foundation-auth/contracts/`.
- Green CI on the branch covering all 10 TDD steps + router gate.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_  | _(none)_   | _(none)_ |
