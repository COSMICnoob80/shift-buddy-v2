---
id: "0003"
title: P1b tasks alert protocol engine
stage: tasks
date: 2026-04-29
surface: agent
model: claude-sonnet-4-6
feature: 003-p1b-alerts-protocols
branch: dev
user: syedmuhammadabdullahshah@protonmail.com
command: /sp.tasks
labels: ["tasks","p1b","alert-engine","protocols","tdd","clinical-safety"]
links:
  spec: specs/003-p1b-alerts-protocols/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-p1b-alerts-protocols/tasks.md
tests:
  - null
---

## Prompt

Generate specs/003-p1b-alerts-protocols/tasks.md. Numbering continues from P1a: first task = T096. ~30 atomic tasks. TDD strict.

REQUIRED TASKS:
  - Scope guard amendment: allow alerts.py + protocols.py
  - Alert model + migration 0006_alerts
  - Alert service: create_vitals_with_alerts coordinator
  - Alert service: create_lab_with_alerts coordinator
  - Alert endpoints: GET /patients/:id/alerts, POST /alerts/:id/acknowledge
  - Protocol: hyperkalemia (pure function, threshold tiers from plan)
  - Protocol: AKI staging (DB read for baseline Cr within 48hrs)
  - Protocol: DKA (pure function)
  - Protocol endpoint: POST /protocols/evaluate, GET /protocols
  - Shadow event writer: first consumer, non-blocking
  - CLINICAL_SAFETY.md activation (placeholder → binding)
  - P1a router regression: existing vitals/labs tests still pass after swapping to coordinator functions
  - Boundary tests per protocol using SPEC §4 test cases

ACCEPTANCE:
  - ~30 tasks, T096+, [P] markers where safe
  - Do NOT run /sp.implement

## Response snapshot

Generated `specs/003-p1b-alerts-protocols/tasks.md` with 31 tasks (T096–T126) organized across 6 phases:

- Phase 1 (T096–T097): Scope guard — extend router allowlist for alerts.py + protocols.py
- Phase 2 (T098–T103): Foundational — VitalThreshold config extension, Alert ORM + migration 0006, alert/protocol schemas
- Phase 3 (T104–T112): US1+US2 alert engine — evaluate_vital_thresholds, build_lab_alert, transaction coordinators, alert management endpoints, P1a regression
- Phase 4 (T113–T120): US3 protocol evaluators — hyperkalemia (T113–T114), DKA (T115–T116), AKI staging (T117–T118), protocol router (T119–T120)
- Phase 5 (T121–T122): US4 shadow events — first writer to shadow_events MEP hinge
- Phase 6 (T123–T126): Polish — PHI redaction verification, mypy sweep, CLINICAL_SAFETY.md graduation to BINDING

All 14 SPEC §4 parametrized test cases covered (6 hyperkalemia + 5 AKI + ≥3 DKA). [P] markers on independent tracks.

## Outcome

- ✅ Impact: 31-task TDD sequence for P1b fully specified; immediately executable by /sp.implement
- 🧪 Tests: 14 parametrized SPEC §4 cases + contract + integration + regression + PHI redaction
- 📁 Files: specs/003-p1b-alerts-protocols/tasks.md (created)
- 🔁 Next prompts: /sp.implement to begin T096 RED; or /sp.checklist for pre-implementation review
- 🧠 Reflection: Three independent protocol tracks (hyperkalemia/DKA/AKI) can be parallelized after Phase 2 lands; coordinator pattern preserves P1a backward compatibility

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
