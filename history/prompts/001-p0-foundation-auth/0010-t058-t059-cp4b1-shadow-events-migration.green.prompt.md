---
id: "0010"
title: T058 T059 CP4-B1 shadow events migration
stage: green
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: syedmuhammadabdullahshah@protonmail.com
command: implement T058, T059, CP4-B1
labels: ["migration", "alembic", "shadow_events", "ci", "integration-test"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - api/alembic/versions/0002_shadow_events.py
  - api/tests/integration/test_shadow_events_migration.py
  - .github/workflows/ci.yml
  - docs/backlog/cp4-blockers.md
tests:
  - api/tests/integration/test_shadow_events_migration.py::test_shadow_events_migration_roundtrip
  - api/tests/integration/test_shadow_events_migration.py::test_shadow_events_row_insert_and_fetch
  - api/tests/integration/test_shadow_events_migration.py::test_shadow_events_downgrade_drops_table
---

## Prompt

You are implementing T058, T059, and CP4-B1 for the Shift Buddy V2 project.
Working directory: /home/cosmicnoob/shift-buddy-v2
Branch: 001-p0-foundation-auth

CONSTRAINT: Write files only. Do NOT run any git commands (no git add, commit, push, status, etc.).

[Full task specification: T058 — Create api/alembic/versions/0002_shadow_events.py (hand-written migration for shadow_events table, INERT in P0, MEP hinge for Shadow-First deployment Principles XIII/XIV); T059 — Create api/tests/integration/test_shadow_events_migration.py (three test cases gated on TEST_DATABASE_URL: roundtrip, row insert/fetch, downgrade drops table); CP4-B1 — Wire TEST_DATABASE_URL into CI (add postgres:16 service to api-test job, mark cp4-blockers.md resolved).]

## Response snapshot

Created four files:

1. `api/alembic/versions/0002_shadow_events.py` — Hand-written Alembic migration chaining from 0001_users. Creates `shadow_events` table with UUID PK (gen_random_uuid()), nullable shift_id UUID, ho_user_id UUID FK → users.id ON DELETE CASCADE, event_type VARCHAR(50), payload JSONB (default '{}'), created_at TIMESTAMPTZ (default now()), divergence_score FLOAT nullable. Adds composite index on (ho_user_id, created_at DESC) via raw op.execute(). Downgrade drops index then table.

2. `api/tests/integration/test_shadow_events_migration.py` — Three integration tests using pytestmark skipif on TEST_DATABASE_URL: (a) roundtrip upgrade/downgrade-1/upgrade, (b) row insert and fetch via asyncpg asserting id not null, created_at not null, divergence_score null, event_type correct, (c) downgrade drops table confirmed via information_schema then restores to head.

3. `.github/workflows/ci.yml` — api-test job updated to include postgres:16 service with health check, TEST_DATABASE_URL env var set. All other jobs untouched.

4. `docs/backlog/cp4-blockers.md` — CP4-B1 marked RESOLVED with resolution details.

## Outcome

- Impact: shadow_events table migration added as MEP hinge (INERT in P0); CI now runs live Postgres integration tests on every PR; CP4-B1 blocker resolved.
- Tests: 3 new integration tests in test_shadow_events_migration.py, all gated on TEST_DATABASE_URL (now set in CI via postgres:16 service).
- Files: 4 files created/modified.
- Next prompts: P1 work can add writers to shadow_events; CP4 gate check can now proceed.
- Reflection: Used asyncpg directly with asyncio.run() for sync test context since psycopg2 is not in pyproject.toml. asyncpg connect string requires stripping the "+asyncpg" prefix.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): not run (no live DB in this session)
- Prompt variant (if applicable): none
- Next experiment: run full test suite with TEST_DATABASE_URL set locally to validate all three cases
