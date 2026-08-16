---
id: "0001"
title: "P1b Spec — Alerts Protocols"
stage: spec
date: 2026-04-28
surface: agent
model: claude-sonnet-4-6
feature: 003-p1b-alerts-protocols
branch: dev
user: syedmuhammadabdullahshah@protonmail.com
command: /sp.specify (inline)
labels: ["spec","p1b","alerts","protocols","shadow-events","clinical-safety"]
links:
  spec: specs/003-p1b-alerts-protocols/spec.md
  ticket: null
  adr: docs/adr/0001-shadow-first-deployment.md
  pr: null
files:
  - specs/003-p1b-alerts-protocols/spec.md
  - history/prompts/003-p1b-alerts-protocols/0001-p1b-spec-alerts-protocols.spec.prompt.md
tests:
  - null
---

## Prompt

ACTOR:   Spec author for P1b (Alert Engine + Clinical Protocols).
         Bound by @.specify/memory/constitution.md v0.2.0.
         Especially Principles I (Clinical Safety Supremacy),
         II (TDD), III (Scope), XI (Config Externalization),
         XIII (Shadow-First), XIV (MEP).
         Single agent. No subagents.

INPUT:   @SPEC.md §2.5 (protocols), §3 (alert thresholds), §6 (P1 acceptance)
         @.specify/memory/constitution.md
         @specs/002-p1a-patient-data-layer/spec.md (P1a — what exists)
         @api/app/core/clinical_config.py (threshold loader)
         @api/app/services/is_critical.py (or wherever compute_is_critical lives)
         @api/app/models/ (existing models)
         @docs/adr/0001-shadow-first-deployment.md
         @CLINICAL_SAFETY.md

         P1b SCOPE:
           1. Alert model + migration (SPEC §3):
              - id, patient_id FK, alert_type (critical/warning),
                trigger_source (vital/lab/protocol), trigger_value,
                message, acknowledged (bool), acknowledged_by FK,
                acknowledged_at, created_at.
           2. Alert generation side-effect:
              - When POST /vitals or POST /labs triggers is_critical=true,
                auto-create alert record.
              - Vitals: use SPEC §3.1 thresholds (already in clinical_config).
              - Labs: use the 7 absolute thresholds from P1a.
           3. Alert endpoints:
              - GET /patients/:id/alerts (list, filterable by type/ack status)
              - POST /alerts/:id/acknowledge (records user + timestamp)
           4. Three deterministic clinical protocols:
              - Hyperkalemia (SPEC §4.1 / §2.5 example)
              - AKI staging (SPEC §4.2 — Creatinine delta logic that
                P1a deferred. Now it's in scope.)
              - DKA (SPEC §4.3 if exists, or derive from Doctor On Duty)
           5. Protocol endpoint:
              - POST /protocols/evaluate (SPEC §2.5)
              - GET /protocols (list available)
           6. Shadow events first writer:
              - Every protocol evaluation writes to shadow_events table.
              - event_type = "protocol_evaluation"
              - payload = de-identified protocol input + output.
              - divergence_score = null (P2 fills this from HO feedback).
           7. CLINICAL_SAFETY.md activation:
              - Transition from placeholder to binding document.
              - Rules: no hallucinated doses, renal check mandatory
                for nephrotoxic drugs, MedGemma advisory only.

         P1b EXPLICIT EXCLUSIONS:
           - NO patient board UI (P1c)
           - NO LangGraph agents (P2+)
           - NO drug interaction checker beyond protocol-internal flags
           - NO WebSocket for real-time alert push (P1c)
           - NO model router / LLM calls — all protocols are
             deterministic rules from clinical_config.py
           - Protocols reference Doctor On Duty 2021 dosages for
             assertion validation ONLY (eval harness), not for
             runtime retrieval.

MISSION: Write specs/003-p1b-alerts-protocols/spec.md.
         Same structure as P0 + P1a specs.
         Save under specs/003-p1b-alerts-protocols/.
         <400 lines. Zero [NEEDS CLARIFICATION].
         Do NOT run /sp.clarify yet.

## Response snapshot

Wrote `specs/003-p1b-alerts-protocols/spec.md` (≈340 lines). Structure mirrors P1a spec:

1. **Purpose & Non-Goals** — P1b adds rules layer on top of P1a data layer. Scoped out: P1c UI, P2+ LLM, GCS drop-based, UO rate-based, ACS, Sepsis.
2. **User Stories** — 4 stories covering: vitals alert generation, lab alert generation, hyperkalemia protocol eval, shadow event write. Edge cases defined.
3. **Functional Requirements** — FR-001–019 covering: alert engine atomicity, vital threshold evaluation (7 parameters), lab alert (reuses P1a compute_is_critical without duplication), acknowledge endpoint, clinical_config.py extension (21 new fields), 3 protocols, shadow_events first writer, router allowlist, CLINICAL_SAFETY.md activation.
4. **API Contracts** — 4 endpoints defined with request/response shapes and error envelopes.
5. **Data Models** — Alert table (12 fields, migration 0006_alerts), shadow_events writer payload spec.
6. **Non-Functional Requirements** — NFR-001–008 covering PHI redaction, atomic writes, offline-first, strict types, parametrized test coverage.
7. **Review Checklist** — 14 checks including Constitution alignment I–XIV.

Key decisions captured in spec:
- AKI baseline lookup: service queries DB for earliest Creatinine result in preceding 48hrs by patient_id (keeps protocol API values-only, no baseline param needed from caller).
- Vital threshold extension: 21 new fields added to ClinicalConfig; `get_vital_thresholds()` method added.
- Lab alert reuses `is_critical` boolean from P1a — no duplicate threshold logic.
- shadow_events payload = `{protocol, severity, actions_count}` only — no patient_id, name, or clinical values.

## Outcome

- ✅ Impact: P1b spec written; unblocks /sp.plan for alert engine and protocol evaluator
- 🧪 Tests: none run (spec stage)
- 📁 Files: specs/003-p1b-alerts-protocols/spec.md created
- 🔁 Next prompts: /sp.plan 003-p1b-alerts-protocols, then /sp.tasks
- 🧠 Reflection: shadow_events table FK is ho_user_id (not patient_id) — payload de-identification constraint is structural, not just policy.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none (spec stage)
- Prompt variant (if applicable): inline spec authoring
- Next experiment: run /sp.clarify before /sp.plan to surface AKI baseline edge cases
