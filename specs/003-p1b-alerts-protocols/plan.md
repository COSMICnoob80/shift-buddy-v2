# Implementation Plan: P1b — Alert Engine + Clinical Protocols

**Branch**: `003-p1b-alerts-protocols` | **Date**: 2026-04-28
**Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md)
**Constitution**: `.specify/memory/constitution.md` v0.2.0
**Stack**: Locked from P1a — no re-debate (see `specs/002-p1a-patient-data-layer/plan.md §Technical Context`)

---

## Summary

P1b ships the alert engine and three deterministic clinical protocol evaluators (Hyperkalemia, AKI, DKA). Alerts are created atomically with their triggering vitals/labs write in the same `AsyncSession` transaction. Protocol evaluation is a pure-function pipeline (except AKI, which reads a baseline Creatinine from DB), runs fully offline, and writes P1b's first rows to the `shadow_events` MEP hinge created in P0. `CLINICAL_SAFETY.md` graduates from INERT to BINDING.

---

## Constitution Check

*Gate: Principles I–XIV checked against P1b scope.*

- [x] **I. Clinical Safety Supremacy** — All protocol thresholds and dosing actions are deterministic code; no LLM is called. Every `Recommendation` includes a non-empty `source` citation (FR-015). `CLINICAL_SAFETY.md` updated to BINDING with P1b rules (FR-019).
- [x] **II. SDD Discipline** — spec.md exists and is complete; plan precedes code; every FR maps to a failing test in the TDD sequence. Red-Green-Refactor enforced for all clinical + security paths.
- [x] **III. Scope Discipline** — Router allowlist amended to add `alerts.py` and `protocols.py` (FR-018). Gate still fails on any other router file. GCS drop / urine-output / ACS / Sepsis explicitly out-of-scope (spec §1 Non-Goals).
- [x] **IV. Privacy by Default** — Alert `message` is de-identified: no patient name (FR-006). `shadow_events.payload` contains no PHI (FR-017). All new routes inherit the P0 `RedactingProcessor`.
- [x] **V. OSS-Only Runtime** — No model inference in P1b. All protocol computation is deterministic Python.
- [x] **VI. Type Safety** — Alert ORM uses `Mapped[]` annotations. All schemas are Pydantic v2. `mypy --strict` required on all new modules (NFR-005).
- [x] **VII. Git Discipline** — Work on `003-p1b-alerts-protocols`; PR targets `dev`; green CI required.
- [x] **VIII. Auth Hardening Floor** — All new endpoints protected by existing bearer middleware. Acknowledge endpoint records `acknowledged_by` from JWT `sub` (UUID). No auth weakening.
- [x] **IX. Agent Accountability** — Every protocol recommendation carries a non-empty `source` string (FR-015). No unsourced clinical claims. UI citation rendering is a P1c delivery concern.
- [x] **X. Token Hygiene** — Plan Mode used; `@file` refs for context; PHR filed on completion.
- [x] **XI. Clinical Config Externalization** — `ClinicalConfig` extended with 21 vital threshold fields; `get_vital_thresholds()` added. Zero threshold literals in `alert_service.py` or any router (FR-002).
- [x] **XII. Offline-First** — All protocol computation is offline. Alert evaluation uses env-loaded thresholds. No external calls.
- [x] **XIII. Shadow-First Deployment** — No clinical agent; protocol evaluation writes telemetry to `shadow_events` (FR-017). No autonomous action.
- [x] **XIV. MEP over MVP** — `shadow_events` table (P0 MEP hinge) receives first rows in P1b. `api/app/protocols/` directory shape anticipates P2+ agent slots without implementing them.

**No violations. Complexity Tracking table empty.**

---

## Technical Context

*(Locked from P1a — inherited verbatim)*

- **Language/Version**: Python 3.12+ (api/)
- **Primary Dependencies**: FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, structlog, pydantic-settings
- **Storage**: PostgreSQL 16 (primary)
- **Testing**: pytest + pytest-asyncio + httpx
- **Target Platform**: Linux server (Docker Compose dev; GH Actions CI)
- **Auth**: P0 bearer middleware — reused verbatim; all P1b endpoints require valid JWT
- **Logging**: P0 `RedactingProcessor` — reused verbatim; new routes inherit it

---

## Project Structure (P1b additions)

```text
api/
├── app/
│   ├── routers/
│   │   ├── alerts.py           # GET /patients/{id}/alerts, POST /alerts/{id}/acknowledge
│   │   └── protocols.py        # GET /protocols, POST /protocols/evaluate
│   ├── models/
│   │   └── alert.py            # Alert ORM (Mapped[] annotations)
│   ├── schemas/
│   │   ├── alerts.py           # AlertRead, AlertListResponse, AcknowledgeResponse
│   │   └── protocols.py        # ProtocolEvaluateRequest, ProtocolEvaluateResponse, Recommendation
│   ├── services/
│   │   ├── alert_service.py    # Transaction coordinator + acknowledge logic
│   │   └── shadow_event_service.py  # shadow_events writer (first P1b consumer)
│   ├── protocols/
│   │   ├── __init__.py
│   │   ├── hyperkalemia.py     # Pure fn — evaluate(potassium, ecg_changes) → ProtocolResult
│   │   ├── aki_staging.py      # Async fn — evaluate(creatinine_current, patient_id, ..., db)
│   │   └── dka.py              # Pure fn — evaluate(blood_sugar, ph, hco3, mental_status)
│   └── core/
│       └── clinical_config.py  # Extended: VitalThreshold model + 21 fields + get_vital_thresholds()
├── alembic/versions/
│   └── 0006_alerts.py          # Hand-written; reversible downgrade()
└── tests/
    ├── unit/
    │   ├── test_hyperkalemia.py       # 6 @parametrize cases (SPEC §4.1)
    │   ├── test_aki_staging.py        # 5 @parametrize cases (SPEC §4.2)
    │   ├── test_dka.py                # ≥3 @parametrize cases (SPEC §4.4: mild/moderate/severe)
    │   └── test_vital_thresholds.py   # Boundary values per alert parameter
    ├── contract/
    │   ├── test_alert_engine.py       # Stories 1+2 ACs — vitals+labs fire alerts in DB
    │   ├── test_alert_management.py   # GET /alerts filters; acknowledge 200/409/404
    │   └── test_protocols.py          # Story 3 ACs + GET /protocols static list
    └── integration/
        ├── test_shadow_events.py      # Story 4 ACs — row written; payload de-identified
        └── test_phi_redaction_p1b.py  # NFR-001 — alert messages + shadow_events PHI-free
```

---

## Scope Guard Amendment (Principle III / FR-018)

```bash
# Before (P1a):
! -name 'health.py' ! -name 'auth.py' \
! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py'

# After (P1b amendment):
! -name 'health.py' ! -name 'auth.py' \
! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py' \
! -name 'alerts.py' ! -name 'protocols.py'
```

This change ships in the same commit as the alert/protocol router skeletons (TDD Step 7).

---

## Transaction Pattern (FR-001 / NFR-002)

Current P1a services (`create_vitals`, `create_lab`) call `db.commit()` internally. P1b adds a **transaction coordinator** in `alert_service.py`. The P1a functions remain **unchanged** — backward compatibility for existing tests.

```
create_vitals_with_alerts(patient_id, payload, db):
  1. Build VitalSigns ORM → db.add(vitals) → await db.flush()   # PK assigned, no commit yet
  2. alert_creates = evaluate_vital_thresholds(vitals, config)   # pure fn, list[AlertCreate]
  3. for ac in alert_creates: db.add(Alert(**ac))
  4. await db.commit()
  5. await db.refresh(vitals)
  6. return VitalsRead.model_validate(vitals)

create_lab_with_alerts(patient_id, payload, db):
  1. is_critical = compute_is_critical(...)                      # existing pure fn, no change
  2. Build LabResult ORM → db.add(lab) → await db.flush()
  3. if is_critical: alert_create = build_lab_alert(lab, config) → db.add(Alert(**alert_create))
  4. await db.commit()
  5. await db.refresh(lab)
  6. return LabRead.model_validate(lab)
```

The **vitals and labs routers** are updated to import from `alert_service` instead of their respective service modules. `evaluate_vital_thresholds` and `build_lab_alert` are pure functions — no DB calls, no side effects.

---

## clinical_config.py Extension

`VitalThreshold` model added alongside existing `LabThreshold`. Existing `hr_min` / `hr_max` / `sbp_min` aliases serve as critical-tier values; new fields add warning-tier and the remaining parameters (see `data-model.md §clinical_config.py Extensions` for full field table).

`get_vital_thresholds(parameter: str) -> VitalThreshold | None` returns thresholds for:
`heart_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `spo2`, `respiratory_rate`, `blood_sugar`. Returns `None` for unsupported parameters (including GCS, urine_output — deferred to P1c).

---

## Protocol Architecture (spec §3.3)

All protocols live in `api/app/protocols/`. Return type is a shared `ProtocolResult` dataclass:

```python
@dataclass
class ProtocolResult:
    severity: str
    recommendations: list[Recommendation]
    escalation: str | None
    alert_generated: bool
```

`alert_generated` is **computed** (not creating a new DB record): `True` iff severity is not `"insufficient_data"` and the result warrants clinical action. Rationale: the Alert DB record was already created when the triggering lab was submitted (FR-001/FR-005); double-alert is incorrect.

Protocol tier tables (hyperkalemia, DKA) are **constants inside each module** — they are fixed KDIGO/AHA guidelines, not hospital-tunable thresholds. `clinical_config.py` is not consulted by protocol evaluation.

AKI baseline lookup: one `SELECT MIN(lab_results.id) WHERE test_name='Creatinine' AND patient_id=? AND recorded_at >= (values.recorded_at - 48h)`.

---

## TDD Order (Principle II — Red → Green → Refactor)

### Step 1 — clinical_config.py vital threshold extension
- **Red**: `test_vital_thresholds.py` — import `get_vital_thresholds`; assert `heart_rate` returns `VitalThreshold` with `warn_low=50`
- **Green**: Add `VitalThreshold` model + 21 env fields + `get_vital_thresholds()` to `ClinicalConfig`
- **Refactor**: Confirm `lru_cache` invalidated correctly in tests via `cache_clear()`

### Step 2 — Alert ORM + migration 0006
- **Red**: conftest factory — `Alert(patient_id=..., alert_type='critical', ...)` → DB round-trip fails
- **Green**: `models/alert.py` (Mapped[] annotations); `0006_alerts.py` with working `downgrade()`
- **Refactor**: Verify indexes + FK CASCADE; round-trip `downgrade base` → re-upgrade

### Step 3 — Alert + Protocol schemas
- **Red**: `test_alert_engine.py` imports `AlertRead`, `AlertListResponse`; `test_protocols.py` imports `ProtocolEvaluateRequest`, `Recommendation` — NameErrors on import
- **Green**: `schemas/alerts.py`, `schemas/protocols.py` — Pydantic v2 models with enum types
- **Refactor**: Enum types for `alert_type`, `trigger_source`; shared `ErrorResponse` re-used from P1a

### Step 4 — `evaluate_vital_thresholds` (unit — boundary suite)
- **Red**: `test_vital_thresholds.py` — HR=135 → `[AlertCreate(alert_type='critical')]`; HR=55 → warning; HR=80 → `[]`; all 7 parameters × crit+warn boundaries
- **Green**: `alert_service.py::evaluate_vital_thresholds(vitals, config)` pure function
- **Refactor**: One helper per parameter; delegate entirely to `get_vital_thresholds`; no threshold literals

### Step 5 — `build_lab_alert` (unit)
- **Red**: K+ `is_critical=True` → `AlertCreate` with `protocol_link` set; K+ `is_critical=False` → `None`; Creatinine → `None` always
- **Green**: `alert_service.py::build_lab_alert(lab, config) -> AlertCreate | None`
- **Refactor**: `grep -r "6\.0\|2\.5\|7\.0" api/app/services` — confirm zero threshold literals

### Step 6 — Transaction coordinators (integration)
- **Red**: `test_alert_engine.py` Story 1 AC 1 — POST /vitals HR=135 → 201 + Alert row in DB; AC 3 — HR=80 → 201 + no Alert; Story 2 AC 1 — POST /labs K+=6.2 → 201 + Alert with protocol_link
- **Green**: `alert_service.py::create_vitals_with_alerts`, `create_lab_with_alerts`; update vitals + labs routers
- **Refactor**: Rollback test — inject DB error during alert insert → assert vitals row also absent

### Step 7 — Router allowlist + skeletons
- **Red**: Updated `test_router_allowlist.py` — `alerts.py`, `protocols.py` pass; any other file fails
- **Green**: Create `routers/alerts.py`, `routers/protocols.py` (APIRouter() stubs only); amend `check_router_allowlist.sh`; wire into `main.py`
- **Refactor**: CI gate exits 0 on clean tree

### Step 8 — Alert management endpoints
- **Red**: `test_alert_management.py` — GET empty → `200 {"alerts":[]}` not 404; `?alert_type=critical` filter; `?acknowledged=false` filter; POST acknowledge → 200; 409 on repeat; 404 on unknown
- **Green**: `routers/alerts.py` + `alert_service.py::list_alerts`, `acknowledge_alert`
- **Refactor**: Extract `get_alert_or_404` dependency; confirm pagination params 1 ≤ limit ≤ 100

### Step 9 — Hyperkalemia protocol (unit parametrize)
- **Red**: `test_hyperkalemia.py` — 6 SPEC §4.1 cases as `@pytest.mark.parametrize`; all fail initially
- **Green**: `protocols/hyperkalemia.py::evaluate(potassium, ecg_changes)` — tier table verbatim
- **Refactor**: Every action has non-empty `source`; verify `severity="emergency"` + escalation at K+ ≥ 6.5

### Step 10 — DKA protocol (unit parametrize)
- **Red**: `test_dka.py` — mild (pH 7.27), moderate (pH 7.15), severe (pH 6.95)
- **Green**: `protocols/dka.py::evaluate(blood_sugar, ph, hco3, mental_status)`
- **Refactor**: Every action has non-empty `source`

### Step 11 — AKI protocol (unit + integration parametrize)
- **Red**: `test_aki_staging.py` — 5 SPEC §4.2 cases; fixture inserts baseline Creatinine row in test DB
- **Green**: `protocols/aki_staging.py::evaluate(creatinine_current, patient_id, recorded_at, db)`
- **Refactor**: `severity="insufficient_data"` when no baseline within 48h; source citations present

### Step 12 — Protocol router
- **Red**: `test_protocols.py` — GET /protocols → 200 static list; POST unknown protocol → 400 `protocol_not_found`; POST hyperkalemia K+=6.2 → severity=severe; AKI with no prior Cr → `insufficient_data`
- **Green**: `routers/protocols.py` — dispatch to protocol modules; `ValueError` → 400
- **Refactor**: Confirm async path: only AKI dispatcher awaits; hyperkalemia/DKA are synchronous

### Step 13 — Shadow events integration
- **Red**: `test_shadow_events.py` — POST /protocols/evaluate → `shadow_events` row in DB with `event_type="protocol_evaluation"`; payload keys are `{protocol, severity, actions_count}` only; no patient_id in payload
- **Green**: Wire `shadow_event_service.record_protocol_evaluation` in protocols router
- **Refactor**: Confirm PHI-free via structlog output capture

### Step 14 — PHI redaction integration
- **Red**: `test_phi_redaction_p1b.py` — POST vitals HR=135; capture structlog; assert patient name + bed_number absent; alert `message` asserted to not contain patient name
- **Green**: Verify `RedactingProcessor` covers alert message field; add to redaction list if missing
- **Refactor**: Confirm redaction field constant is in `core/logging.py` (single source of truth)

### Step 15 — CLINICAL_SAFETY.md + deliverables
- Update `CLINICAL_SAFETY.md` STATUS to `BINDING (Phase 1 onward)` with P1b rules per FR-019
- Update `.env.example` with 21 new `CLINICAL_VITAL_*` env vars
- Run `mypy --strict app/` — all new modules clean

---

## CI Gates (inherited from P1a + amendments)

1. `ruff check .` + `ruff format --check .`
2. `mypy --strict app/`
3. `pytest -q` (all unit + contract + integration)
4. `pnpm --filter web lint` + `pnpm --filter web typecheck` (unchanged)
5. **Router allowlist gate** — amended per FR-018 (Step 7 above)
6. Secret scan (`gitleaks`)

---

## Deliverables (end of P1b)

- All source per §Project Structure above
- `specs/003-p1b-alerts-protocols/data-model.md`
- `specs/003-p1b-alerts-protocols/contracts/openapi.yaml`
- `.env.example` updated with 21 new `CLINICAL_VITAL_*` env vars
- `CLINICAL_SAFETY.md` updated to BINDING status with P1b rules
- Green CI on `003-p1b-alerts-protocols` branch

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| _(none)_ | _(none)_ | _(none)_ |
