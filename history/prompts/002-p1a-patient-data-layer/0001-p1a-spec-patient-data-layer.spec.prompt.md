---
id: "0001"
title: P1a Spec Patient Data Layer
stage: spec
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: 002-p1a-patient-data-layer
branch: 002-p1a-patient-data-layer
user: COSMICnoob80
command: /sp.specify
labels: ["spec","p1a","patient","vitals","labs","data-layer","crud"]
links:
  spec: specs/002-p1a-patient-data-layer/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-p1a-patient-data-layer/spec.md
  - specs/002-p1a-patient-data-layer/checklists/requirements.md
  - history/prompts/002-p1a-patient-data-layer/0001-p1a-spec-patient-data-layer.spec.prompt.md
tests:
  - (none — spec phase; tests defined in FR acceptance criteria)
---

## Prompt

ACTOR:   Spec author for P1a (Patient data layer).
         Bound by @.specify/memory/constitution.md v0.2.0.
         Especially Principles I, II, III, IV, VI, VIII, XI, XIV.

INPUT:   @SPEC.md §1.1-1.4 (Patient, Medication, Vitals, Labs models)
         @SPEC.md §2.2-2.4 (Patient CRUD, Vitals, Labs endpoints)
         @SPEC.md §8 (technical constraints: UTC, trim, UUID, pagination)
         @.specify/memory/constitution.md
         @specs/001-p0-foundation-auth/plan.md (for stack reference)
         @api/app/core/clinical_config.py (P0 loader — do NOT add
           protocol consumers yet, just note it exists)
         @api/app/models/ (existing User model for FK reference)

         P1a SCOPE — data layer ONLY:
           1. Patient model + migration (SPEC §1.1 exactly)
           2. Medication embedded schema (SPEC §1.2)
           3. Vitals model + migration (SPEC §1.3)
           4. Labs model + migration (SPEC §1.4, is_critical
              auto-computed server-side using clinical_config.py
              thresholds)
           5. Patient CRUD endpoints (SPEC §2.2):
              POST /patients, GET /patients, GET /patients/:id,
              PATCH /patients/:id, POST /patients/:id/discharge
           6. Vitals endpoints (SPEC §2.3):
              POST /patients/:id/vitals, GET /patients/:id/vitals
           7. Labs endpoints (SPEC §2.4):
              POST /patients/:id/labs, GET /patients/:id/labs
           8. Pagination on all list endpoints (default 20, max 100)

         P1a EXPLICIT EXCLUSIONS:
           - NO alert engine (P1b)
           - NO protocol evaluation (P1b)
           - NO patient board UI (P1c)
           - NO LangGraph agents (P2+)
           - NO model router / Ollama (P2+)
           - is_critical is computed but does NOT trigger alerts
             yet — it just sets the boolean. Alert side-effects
             land in P1b.
           - NO drug interaction checking (P1b)

MISSION: Write the P1a spec. Same structure as P0 spec:
         1. Purpose + non-goals
         2. User stories (3 max: HO admits patient, HO records
            vitals, HO checks labs)
         3. Functional requirements with acceptance criteria
         4. API contracts (request/response per endpoint, error codes)
         5. Data models (Patient, Medication, Vitals, Labs —
            verbatim from SPEC.md, with FK relationships explicit)
         6. Non-functional requirements
         7. Review checklist

         CONSTRAINTS:
         - PHI redaction rules from P0 apply to all new endpoints.
         - New routers: patients.py, vitals.py, labs.py added to
           api/app/routers/. Update scope guard accordingly
           (NFR-009 must be amended to allow these 3 new files).
         - All clinical thresholds for is_critical come from
           clinical_config.py (Principle XI). No hardcoded values.
         - Spec <500 lines. Zero [NEEDS CLARIFICATION].

         Save under specs/002-p1a-patient-data-layer/.
         Do NOT run /sp.clarify yet — just the spec.

         "On a side-note, create an agent team (TOKEN SAVVY one) to evaluate business
         opportunities (LOCAL & GLOBALLY) for this project from three angles:
         - Market researcher: size the opportunity and identify trends
         - Competitive analyst: map existing players and their weaknesses
         - Financial analyst: estimate costs, revenue potential, and breakeven
         Have them share findings with each other before producing a unified brief."

## Response snapshot

Created branch `002-p1a-patient-data-layer` and wrote the P1a spec at
`specs/002-p1a-patient-data-layer/spec.md` (~400 lines, under 500-line limit).

Spec covers:
- Purpose + 7 explicit non-goals
- 3 user stories (admit patient, record vitals, check labs) with acceptance scenarios
- 7 edge cases
- FR-001–FR-020 (patient CRUD, vitals, labs, router allowlist amendment)
- API contracts for all 9 endpoints (§4.1–4.9)
- Data models verbatim from SPEC.md §1.1–1.4 with FK relationships explicit
- NFR-001–NFR-009
- 11-item review checklist

Key decisions encoded:
- `is_critical` server-computed, client rejection → 400, no threshold literals
- FR-020: CI router allowlist gate extended for patients.py, vitals.py, labs.py
- `current_medications` stored as JSONB (PostgreSQL)
- Discharge is a soft state change (no DELETE)
- P0 RedactingProcessor applies to all new endpoints

Requirements checklist created at `checklists/requirements.md` — all items pass.

Also launched background deep-research agent for the business opportunity brief
(market sizing, competitive analysis, financial model for Pakistan + global CDSS market).

## Outcome

- ✅ Impact: P1a spec is complete, zero [NEEDS CLARIFICATION], ready for /sp.plan
- 🧪 Tests: Acceptance scenarios defined per story; boundary test cases for is_critical noted in FR-017
- 📁 Files: specs/002-p1a-patient-data-layer/spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.plan for P1a; /sp.clarify if any ambiguity surfaces during planning
- 🧠 Reflection: FR-020 (router allowlist amendment) is a critical CI gate detail that could easily be missed — explicit inclusion prevents a P1a PR breaking the P0 CI check

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): requirements checklist — all items PASS
- Prompt variant (if applicable): null
- Next experiment: see if /sp.plan can be run directly from this spec without /sp.clarify
