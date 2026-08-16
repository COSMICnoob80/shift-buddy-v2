---
id: 0005
title: Append MEP Hinges Tasks T056-T060
stage: tasks
date: 2026-04-19
surface: agent
model: claude-opus-4-7
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.tasks (append)
labels: ["tasks", "mep", "shadow-first", "constitution-v0.2.0"]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: docs/adr/0001-shadow-first-deployment.md
  pr: null
files:
  - specs/001-p0-foundation-auth/tasks.md
tests:
  - (planned) api/tests/unit/test_feature_flags.py
  - (planned) api/tests/integration/test_shadow_events_migration.py
---

## Prompt

ACTOR:   Task appender for 001-p0-foundation-auth.
         Bound by @.specify/memory/constitution.md v0.2.0,
         especially new Principles XIII (Shadow-First) and
         XIV (MEP over MVP).

INPUT:   @specs/001-p0-foundation-auth/tasks.md (existing, 55 tasks)
         @specs/001-p0-foundation-auth/plan.md
         @specs/001-p0-foundation-auth/data-model.md

MISSION: APPEND (do not rewrite) 5 new tasks covering MEP plumbing.
         These are P0 scaffolding with zero P1+ logic — pure hinges
         for future features.

   T056  Create api/app/core/feature_flags.py — env-driven flag
         loader. Register 3 flags, all default OFF:
           shadow_mode_enabled
           agent_autonomy_level  (int, default 0)
           divergence_logging_enabled
         Pydantic-settings based. Type-safe.

   T057  [P] Test: feature_flags loader parses env correctly,
         rejects unknown flag names, enforces types.

   T058  Create shadow_events table migration (Alembic).
         Schema:
           id UUID PK
           shift_id UUID (nullable for P0 — no shifts yet)
           ho_user_id UUID FK users.id
           event_type VARCHAR (e.g., "agent_suggestion", "ho_action")
           payload JSONB (de-identified — no PHI)
           created_at TIMESTAMPTZ
           divergence_score FLOAT NULL
         NO endpoints. NO writers. Table sits empty in P0.

   T059  [P] Test: migration runs clean forward + backward.
         Round-trip insert + fetch via raw SQL fixture. No model
         layer yet — just schema proof.

   T060  Create docs/adr/0001-shadow-first-deployment.md — ADR
         documenting WHY shadow mode, WHAT divergence threshold
         will look like (placeholder — TBD P1), and the graduation
         process. Reference Principles XIII + XIV.

   Update tasks.md task count to 60. Update MVP cutline to "MEP
   cutline". Commit ready.

## Response snapshot

Appended Phase 14 (T056–T060) to `specs/001-p0-foundation-auth/tasks.md` with feature_flags loader, shadow_events migration, paired TDD tests, and ADR task. Updated constitution reference in header from v0.1.0 → v0.2.0. Renamed "Suggested MVP" → "MEP Cutline" reframing the section to state there is NO cut option — MEP hinges are load-bearing per Principle XIV. Task count 55 → 60, phase count 13 → 14.

## Outcome

- ✅ Impact: P0 now carries constitution v0.2.0 MEP scaffolding (flags, shadow_events, ADR) as explicit tasks — preventing retrofitting violation.
- 🧪 Tests: Two new test tasks (T057 unit, T059 integration) paired with code tasks; schema round-trip proves hinge is real.
- 📁 Files: specs/001-p0-foundation-auth/tasks.md (edited, no rewrite).
- 🔁 Next prompts: run `/sp.analyze` to re-check Constitution Check against I–XIV; then `/sp.implement` T056–T060 after current TDD arc lands.
- 🧠 Reflection: MEP cutline framing matters — "MVP cut" language invites future scope removal of exactly the hinges Principle XIV forbids cutting.

## Evaluation notes (flywheel)

- Failure modes observed: none — pure doc append, no code.
- Graders run and results (PASS/FAIL): N/A (docs task)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): add a CI grep asserting `grep -r "get_feature_flags" api/app/routers` returns empty in P0 (enforces T056 acceptance at CI, not just review).
