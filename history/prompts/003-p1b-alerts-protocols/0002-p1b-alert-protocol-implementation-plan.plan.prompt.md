---
id: "0002"
title: P1b Alert Protocol Implementation Plan
stage: plan
date: 2026-04-28
surface: agent
model: claude-sonnet-4-6
feature: 003-p1b-alerts-protocols
branch: dev
user: syedmuhammadabdullahshah@protonmail.com
command: /sp.plan feature=003-p1b-alerts-protocols
labels: ["plan","alerts","protocols","p1b","clinical","shadow-events","transaction"]
links:
  spec: specs/003-p1b-alerts-protocols/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-p1b-alerts-protocols/plan.md
  - specs/003-p1b-alerts-protocols/data-model.md
  - specs/003-p1b-alerts-protocols/contracts/openapi.yaml
tests:
  - null
---

## Prompt

ACTOR:   Spec clarifier + technical planner for 003-p1b-alerts-protocols.
         Bound by @.specify/memory/constitution.md v0.2.0.
         Single agent. No subagents.

INPUT:   @specs/003-p1b-alerts-protocols/spec.md
         @.specify/memory/constitution.md
         @specs/002-p1a-patient-data-layer/plan.md (stack reference)
         @api/app/core/clinical_config.py
         @api/app/services/ (existing is_critical, lab_service)
         @api/app/models/ (existing Patient, Vitals, Labs)
         @CLINICAL_SAFETY.md
         @SPEC.md §3 §4 (thresholds + protocol test cases)

MISSION: Two-phase, one pass.

  PHASE A — /sp.clarify:
    If clean: "NO NEW CLARIFICATIONS". Proceed to B.
    If gaps: max 5, each with proposed default.
    Do NOT re-open P0/P1a decisions.

  PHASE B — /sp.plan (only if A is clean):
    Produce under specs/003-p1b-alerts-protocols/:

    plan.md:
      - Constitution check I–XIV
      - Alert model + migration 0006_alerts
      - Alert generation as transactional side-effect
        (same AsyncSession as vitals/labs insert)
      - 3 protocol services (hyperkalemia, AKI, DKA):
        each as pure function in api/app/protocols/
        except AKI which needs DB read for baseline Cr
      - Shadow events writer: first consumer of
        shadow_events table from P0
      - CLINICAL_SAFETY.md activation plan
      - Scope guard: amend router allowlist for
        alerts.py + protocols.py
      - TDD ordering (~30 tasks)

    data-model.md:
      - Alert entity (fields, indexes, FK cascade)

    contracts/:
      - OpenAPI for alert + protocol endpoints

    NO research.md. Stack locked.

  ACCEPTANCE:
    - plan.md <400 lines
    - Zero [NEEDS CLARIFICATION]
    - No code written
    - Do NOT run /sp.tasks

## Response snapshot

PHASE A — NO NEW CLARIFICATIONS. Spec is complete. Proceeding to Phase B.

PHASE B — Produced three artifacts:

1. **specs/003-p1b-alerts-protocols/plan.md** (273 lines)
   - Constitution check I–XIV: all passed, zero violations
   - Transaction pattern: `create_vitals_with_alerts` / `create_lab_with_alerts` in `alert_service.py` use `db.flush()` + atomic commit; P1a service functions unchanged for backward compatibility
   - Protocol architecture: `api/app/protocols/` directory with hyperkalemia/dka as pure functions and aki_staging as async (DB baseline lookup); tier tables are fixed KDIGO/AHA constants, not clinical_config fields
   - clinical_config.py extended: `VitalThreshold` model + 21 env-driven vital threshold fields + `get_vital_thresholds()` method
   - Shadow events writer: `shadow_event_service.py` as first P1b consumer of P0 `shadow_events` MEP hinge; payload de-identified
   - CLINICAL_SAFETY.md graduates INERT → BINDING in Step 15
   - Router allowlist amended: adds `alerts.py`, `protocols.py`
   - 15 TDD steps (~30 atomic tasks)

2. **specs/003-p1b-alerts-protocols/data-model.md**
   - Alert entity: full column table, indexes, FK constraints, ORM sketch
   - shadow_events payload spec (P1b values, PHI guarantee)
   - clinical_config.py 21-field extension table
   - Migration sequence 0001–0006

3. **specs/003-p1b-alerts-protocols/contracts/openapi.yaml**
   - 4 endpoints: GET /patients/{id}/alerts, POST /alerts/{id}/acknowledge, GET /protocols, POST /protocols/evaluate
   - Full schema definitions: Alert, AlertListResponse, AcknowledgeResponse, ProtocolInfo, Recommendation, ProtocolEvaluateRequest, ProtocolEvaluateResponse
   - All error codes per spec: 401, 404 patient_not_found, 404 alert_not_found, 409 already_acknowledged, 400 protocol_not_found, 400 missing_required_value

## Outcome

- ✅ Impact: Implementation plan complete — 3 artifacts written, ready for /sp.tasks
- 🧪 Tests: No tests written (planning phase); 15 TDD steps defined with Red→Green→Refactor structure
- 📁 Files: plan.md (273 lines, under 400 limit), data-model.md, contracts/openapi.yaml
- 🔁 Next prompts: /sp.tasks for 003-p1b-alerts-protocols to generate atomic task list
- 🧠 Reflection: Key design insight — alert atomicity requires transaction coordinator wrappers rather than modifying P1a services; protocol tier tables belong in module constants (not clinical_config) because they are fixed guidelines, not hospital-tunable thresholds

## Evaluation notes (flywheel)

- Failure modes observed: setup-plan.sh branch check fails on dev branch (not a feature branch); script skipped — paths derived manually
- Graders run and results (PASS/FAIL): plan.md line count 273 < 400 PASS; zero [NEEDS CLARIFICATION] tokens PASS; no code written PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Consider whether setup-plan.sh should accept a --feature flag to bypass branch check for planning sessions on dev
