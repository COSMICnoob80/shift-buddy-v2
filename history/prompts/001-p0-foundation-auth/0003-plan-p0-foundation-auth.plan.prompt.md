---
id: "0003"
title: Plan P0 Foundation Auth
stage: plan
date: 2026-04-19
surface: agent
model: claude-opus-4-7
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.plan
labels: ["p0", "auth", "foundation", "tdd", "constitution-v0.1.0"]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-p0-foundation-auth/plan.md
  - specs/001-p0-foundation-auth/research.md
  - specs/001-p0-foundation-auth/data-model.md
  - specs/001-p0-foundation-auth/contracts/openapi.yaml
  - specs/001-p0-foundation-auth/quickstart.md
  - CLAUDE.md
tests:
  - none (planning stage; tests defined for /sp.tasks to generate)
---

## Prompt

ACTOR:   Technical planner for 001-p0-foundation-auth.
         Bound by @.specify/memory/constitution.md — especially
         Principles II (TDD), V (OSS-Only), VI (Type Safety),
         XII (Offline-First).
         Tech stack decisions are LOCKED below. Do not propose
         alternatives. Your job is to structure the implementation
         plan, not re-debate the stack.

INPUT:   @specs/001-p0-foundation-auth/spec.md (plan-ready)
         @specs/001-p0-foundation-auth/checklists/requirements.md
         @.specify/memory/constitution.md
         @AGENTS.md (project layout — canonical)

         LOCKED STACK (P0):
           Backend:
             - Python 3.12+
             - FastAPI 0.115+ (async everywhere)
             - Pydantic v2 (all data models, no raw dicts)
             - SQLAlchemy 2.0 async + asyncpg
             - Alembic (migrations from day 1, never auto-create)
             - PostgreSQL 16
             - Redis 7 (Docker-composed, unused in P0 but wired)
             - bcrypt (passlib[bcrypt]) — cost 12
             - python-jose[cryptography] — JWT HS256
             - slowapi — /auth/login rate limit
             - structlog — JSON stdout, RedactingProcessor
             - pydantic-settings — env config
             - pytest + pytest-asyncio + httpx — test stack
             - ruff (lint + format), mypy --strict
           Frontend:
             - Next.js 14 App Router
             - TypeScript strict, no `any`
             - Inter self-hosted (.woff2 in /public/fonts)
             - Tailwind CSS (design tokens as CSS vars per spec §5)
             - Playwright for smoke tests
           Infra:
             - Docker Compose (api, db, redis; Ollama profile-gated
               off in P0)
             - GitHub Actions CI on PR to dev: ruff, mypy, pytest,
               pnpm lint, pnpm typecheck, Playwright smoke.
           Repo:
             - Monorepo per AGENTS.md layout.
             - api/, web/, agents/ (empty), mobile/ (empty), docs/.

MISSION: Produce the standard /sp.plan artifact set:
           plan.md          (phased implementation plan)
           research.md      (confirm stack versions, flag any CVEs
                             or breaking changes in locked deps)
           data-model.md    (User entity — fields, indexes,
                             migration strategy)
           contracts/       (OpenAPI spec for /health, /auth/register,
                             /auth/login with locked error envelope)
           quickstart.md    (dev setup: clone → compose up → migrate
                             → test → run)

         CONSTRAINTS:
           - TDD-ordered: every FR/NFR maps to a test before code.
             Reference the 10-step TDD sequence from the Phase 0
             audit verbatim.
           - CI gate (NFR-009): document the grep check that fails
             if api/app/routers/ gains files beyond health.py +
             auth.py in P0.
           - Clinical config loader (FR item 9): specify the file
             (api/app/core/clinical_config.py) and schema test
             without specifying any protocol logic.
           - CLINICAL_SAFETY.md: include as a plan deliverable with
             the Phase-1-activation header.
           - Directory boundaries per AGENTS.md — no cross-contamination.

         Acceptance:
           - plan.md <500 lines, references constitution principles
             by numeral inline where relevant.
           - research.md flags anything in locked stack that has a
             known security advisory or major breaking change vs.
             training-era knowledge (search web if uncertain).
           - All artifacts saved under specs/001-p0-foundation-auth/.
           - No code written. Plan only.
           - Do NOT run /sp.tasks — that's the next command.

## Response snapshot

Generated the full /sp.plan artifact set under specs/001-p0-foundation-auth/:

- **plan.md** — Phased plan with Technical Context, Constitution Check (all 12 principles PASS, no deviations), monorepo Project Structure, 10-step TDD order mapping each FR/NFR to a failing test first, and CI gates including the router-allowlist `find ... ! -name health.py ! -name auth.py` check per NFR-009.
- **research.md** — Confirmed locked-stack versions. Flagged: python-jose CVE-2024-33663/33664 (do not affect HS256 path but algorithm allowlist mandated), Next.js CVE-2025-29927 middleware bypass → pin `next>=14.2.21`, passlib 1.7.4 + bcrypt 4.x AttributeError → pin both. Rejected alternative swaps explicitly to honor the lock.
- **data-model.md** — Single `User` entity with UUID PK, case-insensitive unique email via functional index, unique PMDC, lockout state machine, hand-written Alembic migration `0001_users` (round-trip asserted in CI).
- **contracts/openapi.yaml** — OpenAPI 3.1 for `/health`, `/auth/register`, `/auth/login` with locked `{error,message}` envelope enumerating all 13 error codes from NFR-003; JWT claim shape documented.
- **quickstart.md** — Offline-first dev flow: clone → compose up db+redis (Ollama OFF) → alembic upgrade → pytest → uvicorn → pnpm dev → SC-007 network-trace manual check.
- **CLAUDE.md** — Updated via `update-agent-context.sh claude` with the locked P0 stack.

Explicitly did NOT run /sp.tasks; that is the next command.

## Outcome

- ✅ Impact: Plan artifacts ready for /sp.tasks; Constitution Check green across I–XII with no deviations logged.
- 🧪 Tests: 10 test files named and sequenced (redactor → config → health → password → register → jwt → login → lockout → rate-limit → middleware); Playwright smoke for web.
- 📁 Files: plan.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md, CLAUDE.md refreshed.
- 🔁 Next prompts: run `/sp.tasks` to generate dependency-ordered tasks.md matching the 10-step TDD sequence; then `/sp.analyze` before implementation.
- 🧠 Reflection: The locked-stack instruction eliminated option-debate churn; research.md focused purely on CVE/compat risk, which is where planning effort actually belongs.

## Evaluation notes (flywheel)

- Failure modes observed: initial OpenAPI had a dangling `$ref` to a non-existent example and a bogus `components_examples_placeholder` key; caught and fixed before write-complete.
- Graders run and results (PASS/FAIL): Constitution Check self-grader — PASS (all 12 principles).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): have /sp.tasks assert each task's test file exists in the plan's §TDD Order list to prevent drift.
