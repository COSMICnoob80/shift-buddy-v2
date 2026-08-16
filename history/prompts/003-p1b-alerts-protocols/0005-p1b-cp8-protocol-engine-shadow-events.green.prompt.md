---
id: "0005"
title: CP8 T113-T126 — Protocol Engine + Shadow Events
stage: green
date: 2026-05-01
surface: agent
model: claude-sonnet-4-6
feature: 003-p1b-alerts-protocols
branch: dev
user: COSMICnoob80
command: sp.implement CP8 T113-T126
labels: ["protocols","hyperkalemia","dka","aki-staging","shadow-events","phi-redaction","clinical-safety","mypy"]
links:
  spec: specs/003-p1b-alerts-protocols/spec.md
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - api/app/protocols/__init__.py
  - api/app/protocols/hyperkalemia.py
  - api/app/protocols/dka.py
  - api/app/protocols/aki_staging.py
  - api/app/models/shadow_event.py
  - api/app/models/db.py
  - api/app/routers/protocols.py
  - api/app/schemas/protocols.py
  - api/app/services/shadow_event_service.py
  - CLINICAL_SAFETY.md
  - api/tests/unit/test_hyperkalemia.py
  - api/tests/unit/test_dka.py
  - api/tests/unit/test_aki_staging.py
  - api/tests/contract/test_protocols.py
  - api/tests/integration/test_shadow_events.py
  - api/tests/integration/test_phi_redaction_p1b.py
tests:
  - tests/unit/test_hyperkalemia.py (10 cases — 6 @parametrize + boundary checks)
  - tests/unit/test_dka.py (8 cases — 5 @parametrize + boundary checks)
  - tests/unit/test_aki_staging.py (5 cases — KDIGO criteria with SQLite session)
  - tests/contract/test_protocols.py (6 cases — GET /protocols, evaluate, 400 errors, 401)
  - tests/integration/test_shadow_events.py (4 cases — row written, payload PHI-free, count guards)
  - tests/integration/test_phi_redaction_p1b.py (3 cases — logs, alert msg, shadow_events payload)
---

## Prompt

ACTOR:   Implementation executor for 003-p1b-alerts-protocols, CP8.
         Bound by @.specify/memory/constitution.md v0.2.0.

INPUT:   @specs/003-p1b-alerts-protocols/tasks.md (T113-T126)

MISSION: Execute T113 through T126. STOP at T126.

         CP8 SCOPE:
           T113-T114: Hyperkalemia protocol (pure function, tier constants in module)
           T115-T116: DKA protocol (pure function)
           T117-T118: AKI staging (DB read for baseline Cr within 48hrs)
           T119-T120: Protocol router (POST /protocols/evaluate, GET /protocols)
           T121-T122: Shadow event writer. Every protocol evaluation → shadow_events row
           T123-T124: PHI redaction for new endpoints
           T125: mypy --strict sweep on all new files
           T126: CLINICAL_SAFETY.md activation — transition to BINDING

## Response snapshot

Implemented all 14 tasks (T113-T126) in strict TDD order. Key decisions:

1. **ProtocolResult dataclass** lives in `hyperkalemia.py` and is imported by DKA and AKI staging — avoids circular imports and keeps the shared type near the first module that defines it.

2. **AKI staging** uses Python-level `timedelta` arithmetic for the 48h cutoff rather than SQL `interval` expressions — makes the query dialect-agnostic (PostgreSQL + SQLite test fixture).

3. **ShadowEvent ORM model** created as new `models/shadow_event.py` using `_PortableJSON` (from patient.py) for cross-dialect JSONB/JSON support; registered in `db.py` so `Base.metadata.create_all` includes it in SQLite test fixtures.

4. **Shadow events integration test** uses a local `app_with_session` fixture that shares a single SQLite engine between the HTTP client and DB assertion queries — prevents the test from accidentally connecting to PostgreSQL.

5. **`ProtocolEvaluateRequest.protocol` changed from `Literal[...]` to `str`** — Pydantic's Literal validation would return `validation_error` for unknown protocols, but the spec requires `400 {"error": "protocol_not_found"}`. Validation moved to router layer.

## Outcome

- ✅ Impact: P1b Phase 4+5+6 complete. 3 clinical protocols live (Hyperkalemia/DKA/AKI). shadow_events MEP hinge activated. CLINICAL_SAFETY.md is BINDING.
- 🧪 Tests: 238 passed, 5 skipped, 0 failed. 36 new tests added in CP8.
- 📁 Files: 16 files changed (1827 insertions). 11 new source files, 5 test files.
- 🔁 Next prompts: P1b tagging + PR to dev. Then P1c (patient board UI, WebSocket alerts).
- 🧠 Reflection: The shadow events integration test pattern (shared SQLite engine between client and DB assertions) is the key reusable pattern for all future integration tests that need to check DB state without a live PostgreSQL connection.

## Evaluation notes (flywheel)

- Constitution alignment: I–XIV verified. Protocol constants are in modules (not clinical_config.py per plan §Protocol Architecture). Zero threshold literals in alert_service.py. Every Recommendation has non-empty source. Shadow events payload is PHI-free. CLINICAL_SAFETY.md is BINDING.
- ruff: 0 errors. mypy --strict: 0 errors on 11 files. pytest: 238/238 green.
