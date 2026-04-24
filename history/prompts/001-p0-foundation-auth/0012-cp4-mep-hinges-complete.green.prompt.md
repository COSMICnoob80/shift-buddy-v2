---
id: "0012"
title: CP4 MEP Hinges Complete — T056-T060 + CP4-B1
stage: green
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.implement (CP4 — Phase 14, MEP hinges)
labels: ["mep","feature-flags","shadow-events","alembic","adr","ci","cp4"]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: docs/adr/0001-shadow-first-deployment.md
  pr: null
files:
  - api/app/core/feature_flags.py
  - api/tests/unit/test_feature_flags.py
  - api/alembic/versions/0002_shadow_events.py
  - api/tests/integration/test_shadow_events_migration.py
  - docs/adr/0001-shadow-first-deployment.md
  - .github/workflows/ci.yml
  - docs/backlog/cp4-blockers.md
  - specs/001-p0-foundation-auth/tasks.md
tests:
  - api/tests/unit/test_feature_flags.py (4 cases — 4 passed)
  - api/tests/integration/test_shadow_events_migration.py (3 cases — 3 skipped, gate on TEST_DATABASE_URL, will pass in CI)
  - api/tests/integration/test_migration_roundtrip.py (1 case unblocked in CI via CP4-B1)
  - Full suite: 83 passed, 4 skipped, 0 failed
---

## Prompt

ACTOR: Implementation executor, CP4 (final). Bound by constitution v0.2.0.

MISSION: Execute T056–T060 + resolve CP4-B1 blocker.

T056 api/app/core/feature_flags.py — 3 flags all OFF, extra="forbid", no consumers.
T057 [P] Tests: defaults, env flip, type coercion, unknown key rejection.
T058 Alembic migration 0002_shadow_events — UUID PK, FK→users, JSONB payload, DESC index. Inert P0.
T059 [P] Tests: roundtrip, row insert/fetch, downgrade drops table.
T060 docs/adr/0001-shadow-first-deployment.md — Principles XIII+XIV, TBD (P1) threshold.
CP4-B1 Wire TEST_DATABASE_URL in CI api-test job. Mark blocker resolved.

## Response snapshot

Three parallel agents executed:
- Agent A (T056+T057): feature_flags.py loader + 4 unit tests. One fix applied post-run: extra="forbid" in pydantic-settings guards constructor kwargs, not env vars — test_unknown_env_key_rejected corrected to FeatureFlags(bogus="xyz").
- Agent B (T058+T059+CP4-B1): 0002_shadow_events migration + integration tests (asyncpg raw queries) + ci.yml postgres:16 service added + cp4-blockers.md resolved.
- Agent C (T060): ADR 0001 created. All acceptance greps pass.

4 atomic commits land in task order. Full suite: 83 passed, 4 skipped (TEST_DATABASE_URL gate — will un-skip in CI), 0 failed.

Router allowlist: {__init__.py, health.py, auth.py} only. phi3 grep: 0 hits. tasks.md: all 60 tasks [X].

## Outcome

- ✅ Impact: Phase 14 (MEP hinges) complete. All 60 P0 tasks done. Branch is merge-ready into dev pending CI green.
- 🧪 Tests: 83 passed, 4 skipped (live-Postgres gate, unblocked in CI by CP4-B1). 0 failed.
- 📁 Files: 8 files created or modified across 5 commits.
- 🔁 Next prompts: Tag v0.1.0. Open PR to dev. Begin P1 planning.
- 🧠 Reflection: Parallel 3-agent approach saved significant wall time. pydantic-settings extra="forbid" behavioral difference from pydantic models required a one-line fix — caught by the test run before commit.

## Evaluation notes (flywheel)

- Failure modes observed: PHR ID collision (agents A and C both assigned 0010 independently). Agent A's extra="forbid" test case used env var instead of constructor kwarg — behavioral nuance specific to pydantic-settings vs pydantic.
- Graders run and results (PASS/FAIL): pytest 83/83 PASS; router allowlist PASS; phi3 scan PASS; tasks.md 60/60 PASS.
- Prompt variant (if applicable): parallel 3-agent spawn with file-ownership isolation
- Next experiment: consider a post-agent ID-allocation step to prevent PHR collisions when multiple agents run in parallel.
