---
id: "0004"
title: P1b CP7 — Alert Engine T096-T112
stage: green
date: 2026-04-29
surface: agent
model: claude-sonnet-4-6
feature: 003-p1b-alerts-protocols
branch: dev
user: COSMICnoob80
command: sp.implement
labels: ["p1b","alert-engine","tdd","coordinator-pattern","scope-guard","clinical-config"]
links:
  spec: specs/003-p1b-alerts-protocols/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - api/tests/integration/test_router_allowlist.py
  - api/app/routers/alerts.py
  - api/app/routers/protocols.py
  - scripts/ci/check_router_allowlist.sh
  - api/app/main.py
  - api/tests/unit/test_vital_thresholds.py
  - api/app/core/clinical_config.py
  - api/tests/conftest.py
  - .env.example
  - api/tests/integration/test_alert_orm.py
  - api/app/models/alert.py
  - api/app/models/db.py
  - api/alembic/versions/0006_alerts.py
  - api/tests/contract/test_alert_engine.py
  - api/tests/contract/test_protocols.py
  - api/app/schemas/alerts.py
  - api/app/schemas/protocols.py
  - api/app/services/alert_service.py
  - api/app/routers/vitals.py
  - api/app/routers/labs.py
  - api/tests/contract/test_alert_management.py
tests:
  - tests/integration/test_router_allowlist.py (2 tests)
  - tests/unit/test_vital_thresholds.py (15 tests: T098 guards + T104 boundary + T106 build_lab)
  - tests/integration/test_alert_orm.py (3 tests: Alert ORM round-trip)
  - tests/contract/test_alert_engine.py (4 tests: T102 import guard + T108 Story 1+2)
  - tests/contract/test_alert_management.py (7 tests: T110 list + acknowledge)
  - tests/contract/test_vitals.py (P1a regression — all green)
  - tests/contract/test_labs.py (P1a regression — all green)
  - tests/contract/test_patients_crud.py (P1a regression — all green)
  - tests/contract/test_discharge.py (P1a regression — all green)
---

## Prompt

ACTOR:   Implementation executor for 003-p1b-alerts-protocols, CP7.
         Bound by @.specify/memory/constitution.md v0.2.0.
         Especially Principles I (Clinical Safety Supremacy),
         II (TDD), IV (Privacy), XI (Config Externalization),
         XIII (Shadow-First).
         Single agent.

INPUT:   @specs/003-p1b-alerts-protocols/tasks.md (T096-T112)
         @specs/003-p1b-alerts-protocols/plan.md
         @specs/003-p1b-alerts-protocols/data-model.md
         @specs/003-p1b-alerts-protocols/contracts/openapi.yaml
         @.specify/memory/constitution.md
         @api/app/services/ (existing is_critical, lab_service, vitals_service)
         @api/app/models/ (existing models)

MISSION: Execute T096 through T112. STOP at T112.

         CRITICAL RULES:
           - Coordinator pattern: create_vitals_with_alerts and
             create_lab_with_alerts wrap existing P1a logic.
             P1a services stay UNCHANGED. Coordinators call them
             + add alert in SAME transaction (db.flush, not commit).
           - P1a regression: ALL existing P1a tests must stay green.
             If any P1a test breaks, fix the coordinator, not the
             P1a test.
           - Alert acknowledgment: records user UUID + timestamp.
             Only authenticated user can acknowledge.
           - Scope guard: amend for alerts.py + protocols.py FIRST.
           - TDD strict. Atomic commits. tasks.md numbering.
           - ruff + mypy --strict + pytest green after every task.

         AFTER T112:
           - Full test count by file (highlight P1a files proving
             no regression).
           - git log since CP7 start.
           - STOP. "CHECKPOINT 7 COMPLETE — awaiting review."

## Response snapshot

Executed T096–T112 in full TDD Red-Green sequence:

**T096–T097 (Scope Guard):** Updated test_router_allowlist.py to expect alerts.py +
protocols.py; created bare stubs; amended check_router_allowlist.sh; wired both routers
into main.py. All CI script exits 0.

**T098–T099 (VitalThreshold):** Added VitalThreshold Pydantic v2 model + 21 env-driven
fields (CLINICAL_VITAL_*) to ClinicalConfig; added get_vital_thresholds() method +
module-level wrapper; updated .env.example + conftest defaults.

**T100–T101 (Alert ORM):** Created Alert ORM model with Mapped[] annotations, server_default
for acknowledged; hand-written migration 0006_alerts.py with 2 composite indexes + FKs;
registered in db.py metadata.

**T102–T103 (Schemas):** Created schemas/alerts.py (AlertRead, AlertListResponse,
AcknowledgeResponse, AlertCreate dataclass) and schemas/protocols.py (Recommendation with
min_length=1 source, ProtocolEvaluateRequest/Response).

**T104–T107 (Pure evaluators):** Implemented evaluate_vital_thresholds (7 parameters, zero
threshold literals) and build_lab_alert (lab→protocol mapping) as pure functions in
alert_service.py. Conftest thresholds adjusted: CLINICAL_HR_MAX=130, VITAL_HR_WARN_LOW=60.

**T108–T109 (Coordinator swap):** Transaction coordinators create_vitals_with_alerts and
create_lab_with_alerts implemented in alert_service.py (db.flush then commit). Updated
vitals.py and labs.py routers to call coordinators. P1a service functions unchanged.

**T110–T111 (Alert management):** GET /patients/{id}/alerts with filters + pagination; POST
/alerts/{id}/acknowledge with 200/409/404. Split router wiring in main.py for correct paths.

**T112 (Regression):** All 27 P1a contract tests green. Full suite: 203 passed, 5 skipped.

## Outcome

- ✅ Impact: T096–T112 complete; alert engine (US1+US2) fully operational; P1b Phase 1-3 done
- 🧪 Tests: 203 passed, 5 skipped, 0 failed; 27 P1a tests green (no regressions)
- 📁 Files: 21 new/modified files; 6 atomic commits on dev branch
- 🔁 Next prompts: T113–T126 (protocol evaluators, shadow events, PHI redaction, CLINICAL_SAFETY.md)
- 🧠 Reflection: Coordinator pattern (db.flush→add_alerts→commit) is the key invariant — P1a services remain unchanged while P1b adds atomicity. Split router approach for GET /patients/.../alerts vs POST /alerts/.../acknowledge works cleanly in FastAPI.

## Evaluation notes (flywheel)

- Failure modes observed: conftest CLINICAL_HR_MAX=160 was too high for spec boundary test (135 bpm); CLINICAL_VITAL_HR_WARN_LOW=50 was too low for 55-bpm warning case — both corrected to match spec expectations (130, 60). SQLite async generator context manager required explicit __anext__() + aclose() pattern for test DB access.
- Graders run and results (PASS/FAIL): ruff PASS, mypy --strict PASS (6 modules), pytest 203/203 PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
