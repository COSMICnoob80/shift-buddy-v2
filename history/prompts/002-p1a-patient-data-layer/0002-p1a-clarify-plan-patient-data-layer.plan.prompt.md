---
id: "0002"
title: "P1a Clarify and Plan Patient Data Layer"
stage: plan
date: 2026-04-26
surface: agent
model: claude-sonnet-4-6
feature: 002-p1a-patient-data-layer
branch: 002-p1a-patient-data-layer
user: COSMICnoob80
command: "/sp.clarify + /sp.plan (two-phase)"
labels: ["clarify", "plan", "patient", "vitals", "labs", "is_critical", "clinical_config", "migrations"]
links:
  spec: specs/002-p1a-patient-data-layer/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-p1a-patient-data-layer/spec.md
  - specs/002-p1a-patient-data-layer/plan.md
  - specs/002-p1a-patient-data-layer/data-model.md
  - specs/002-p1a-patient-data-layer/contracts/openapi.yaml
tests:
  - specs/002-p1a-patient-data-layer/checklists/requirements.md (reviewed, no changes)
---

## Prompt

Two-phase execution in one pass.

PHASE A — /sp.clarify:
  Scan spec for unresolved gaps. Do NOT re-open P0 decisions.
  If clean: output "NO NEW CLARIFICATIONS".
  If gaps found: list max 5, each with proposed default.
  Do NOT edit spec unless I approve.

PHASE B — /sp.plan (execute only if Phase A is clean):
  Produce plan artifacts under specs/002-p1a-patient-data-layer/:
  [plan.md, data-model.md, contracts/openapi.yaml]
  NO research.md needed — stack is locked from P0.
  Do NOT run /sp.tasks.

[User approved both Phase A gaps and said "Both approved. Proceed to Phase B."]

## Response snapshot

**Phase A** found 2 genuine spec-level gaps:
1. `date_of_admission` future validation — data model said "Cannot be future" but no FR enforced it. Proposed default: server-side 400, consistent with vitals `recorded_at` (FR-012). → Added as FR-001a.
2. `is_critical` test scope — SPEC.md §3.2 includes Creatinine (delta-based) and Troponin (reference-relative) which FR-017's absolute-threshold logic cannot handle. Proposed default: P1a covers 7 absolute-threshold tests (K+, Na+, Hb, Plt, INR, Blood Sugar, Lactate); Creatinine/Troponin → false. → Added as FR-017a. Clarifications section appended to spec.

**Phase B** produced:
- `plan.md` (378 lines): Constitution check I–XIV, 14-step TDD sequence (~35 tasks), scope guard amendment for router allowlist (patients.py, vitals.py, labs.py), is_critical computation pseudocode with boundary value table, deliverables
- `data-model.md`: 4 entities with PG types, all indexes, FK cascade rules (RESTRICT for users FKs, CASCADE for patient→vitals/labs), JSONB schemas for Medication/active_problems/allergies, migration sequence 0003–0005, clinical_config.py extension with 14 env vars for 7 lab tests
- `contracts/openapi.yaml`: OpenAPI 3.1, all 9 endpoints (5 patient + 2 vitals + 2 labs), all error codes, pagination schema, shared parameters/responses

## Outcome

- ✅ Impact: Spec clarified (2 gaps closed), 3 plan artifacts produced, spec + plan ready for /sp.tasks
- 🧪 Tests: No tests written (plan phase); test file paths defined in plan.md TDD sequence
- 📁 Files: spec.md (updated), plan.md (new), data-model.md (new), contracts/openapi.yaml (new)
- 🔁 Next prompts: /sp.tasks to generate task list; then /sp.implement
- 🧠 Reflection: Creatinine delta-threshold gap was a non-obvious spec issue — discovered via cross-referencing SPEC.md §3.2 against FR-017 logic. clinical_config.py env var naming convention (CLINICAL_LAB_K_CRITICAL_HIGH) established here and must be consistent in implementation.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none yet
- Prompt variant (if applicable): two-phase clarify+plan in single prompt
- Next experiment: /sp.tasks with 35-task target count
