---
id: "0003"
title: "P1a Tasks — Patient Data Layer"
stage: tasks
date: 2026-04-26
surface: agent
model: claude-sonnet-4-6
feature: 002-p1a-patient-data-layer
branch: 002-p1a-patient-data-layer
user: COSMICnoob80
command: /sp.tasks
labels: ["tasks","tdd","p1a","patient","vitals","labs","migrations","clinical-config"]
links:
  spec: specs/002-p1a-patient-data-layer/spec.md
  ticket: null
  adr: docs/adr/0001-shadow-first-deployment.md
  pr: null
files:
  - specs/002-p1a-patient-data-layer/tasks.md
tests:
  - api/tests/unit/test_is_critical.py
  - api/tests/unit/test_patient_schemas.py
  - api/tests/unit/test_vitals_schemas.py
  - api/tests/unit/test_labs_schemas.py
  - api/tests/integration/test_migration_roundtrip_p1a.py
  - api/tests/integration/test_orm_models_p1a.py
  - api/tests/integration/test_router_allowlist.py
  - api/tests/integration/test_router_allowlist_negative_p1a.py
  - api/tests/contract/test_patients_crud.py
  - api/tests/contract/test_discharge.py
  - api/tests/integration/test_pagination.py
  - api/tests/contract/test_vitals.py
  - api/tests/contract/test_labs.py
  - api/tests/integration/test_phi_redaction_p1a.py
  - api/tests/integration/test_patient_detail.py
---

## Prompt

ACTOR:   Task generator for 002-p1a-patient-data-layer.
         Bound by @.specify/memory/constitution.md v0.2.0.
         Single agent. No subagents.

INPUT:   @specs/002-p1a-patient-data-layer/plan.md
         @specs/002-p1a-patient-data-layer/data-model.md
         @specs/002-p1a-patient-data-layer/contracts/openapi.yaml
         @specs/002-p1a-patient-data-layer/spec.md
         @.specify/memory/constitution.md

MISSION: Produce specs/002-p1a-patient-data-layer/tasks.md.

         NUMBERING: Continue from P0. First task = T061.

         STRUCTURE:
           - Follow the 14-step TDD sequence from plan.md.
           - Each step: failing test → implement → green.
           - Mark [P] for parallel-safe tasks.
           - ~35 atomic tasks.

         REQUIRED TASKS:
           - Scope guard amendment: update check_router_allowlist.sh
             to allow patients.py, vitals.py, labs.py. Test the
             amended guard (positive + negative cases).
           - clinical_config.py extension: add the 14 lab threshold
             env vars. Schema test for each.
           - is_critical computation: unit tests for all 7 threshold
             tests at boundary values (exactly at threshold, one
             above, one below). Creatinine + Troponin → always false.
           - Pagination: test default=20, max=100, page>total→empty.
           - PHI redaction: verify patient name/MRN don't leak into
             logs for new endpoints (extend existing redactor tests).
           - date_of_admission future validation: 400 test.
           - Discharge soft-state: verify patient remains in DB,
             status changes, no hard delete path.

         ACCEPTANCE:
           - ~35 tasks, each with ID, [P] marker, file paths,
             one-line description, acceptance criterion.
           - Do NOT run /sp.implement.

## Response snapshot

Generated `specs/002-p1a-patient-data-layer/tasks.md` with 35 tasks (T061–T095) across 11 phases, following the 14-step TDD sequence from plan.md. Key structural decisions:

- T061–T064 (Phases 1): clinical_config lab threshold extension (14 env vars, LabThreshold model, get_lab_thresholds()) + compute_is_critical pure function with all 7 boundary-value test cases including Creatinine/Troponin always-false and the outside_ref_range guard.
- T065–T068 (Phase 2): Pydantic v2 schemas for Patient (with date_of_admission FR-001a validator), VitalSigns (all-null rejection), and LabResult (is_critical field_not_allowed on write).
- T069–T072 (Phase 3): One shared migration round-trip RED test (T069) + three sequential hand-written migrations [T070 → T071 [P] → T072 [P]] with both upgrade() and downgrade() paths.
- T073–T074 (Phase 4): ORM models with Mapped[] annotations, shared _utcnow() helper.
- T075–T077 (Phase 5): Router allowlist amendment — RED test first (T075), GREEN stub routers + updated shell script (T076), negative gate test (T077 [P]).
- T078–T080 (Phase 6): Patient CRUD + discharge soft-state (T079 verifies no DB DELETE, 409 idempotency).
- T081–T082 (Phase 7): Pagination tests (limit>100→400, page=0→400, empty ward→200+zeros) + shared PaginationParams dependency.
- T083–T087 (Phases 8–9): Vitals and Labs contract tests + literal-threshold guard CI script (T087).
- T088–T090 (Phase 10): PHI redaction tests for new endpoints + patient detail endpoint with embedded vitals[]/labs[].
- T091–T095 (Phase 11): .env.example update (14 vars), mypy clean sweep, Constitution Check walk, deliverables verification, PHR.

## Outcome

- ✅ Impact: 35-task TDD arc covering all 14 plan.md steps; T061–T095 continue P0 numbering; all required tasks from mission present.
- 🧪 Tests: 15 new test files specified across unit, contract, and integration layers; all paired RED→GREEN.
- 📁 Files: specs/002-p1a-patient-data-layer/tasks.md created; history/prompts/002-p1a-patient-data-layer/0003-*.tasks.prompt.md (this file).
- 🔁 Next prompts: /sp.implement to begin TDD execution from T061.
- 🧠 Reflection: Separating the migration round-trip into one shared RED test (T069) that covers all three revisions avoids redundant per-migration test files while still enforcing downgrade paths per NFR-007. The literal-threshold grep (T087) is a constitution compliance check (Principle XI) that runs as a CI gate — prevents drift if thresholds are ever refactored out of clinical_config.

## Evaluation notes (flywheel)

- Failure modes observed: none — plan.md provided explicit boundary values, step order, and file paths; schema was unambiguous.
- Graders run and results (PASS/FAIL): n/a (task generation, not implementation)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
