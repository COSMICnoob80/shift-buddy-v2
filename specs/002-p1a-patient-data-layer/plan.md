# Implementation Plan: P1a — Patient Data Layer

**Branch**: `002-p1a-patient-data-layer` | **Date**: 2026-04-26
**Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md)
**Constitution**: `.specify/memory/constitution.md` v0.2.0
**Stack**: Locked from P0 — no re-debate (see `specs/001-p0-foundation-auth/plan.md §Technical Context`)

---

## Summary

P1a ships the patient data layer: three Alembic migrations (0003–0005), three ORM models, three routers, Pydantic v2 schemas, and a `clinical_config.py` extension for 7 absolute-threshold lab tests. The `is_critical` flag is computed at write time, stored, and silent — no alerts fire until P1b. Router allowlist CI gate is amended to permit `patients.py`, `vitals.py`, `labs.py`. Stack, auth middleware, RedactingProcessor, and clinical_config loader all reuse P0 artifacts verbatim.

---

## Constitution Check

*Gate: Principles I–XIV checked against P1a scope.*

- [x] **I. Clinical Safety Supremacy** — `is_critical` is a stored boolean, advisory only; no protocol evaluation, no LLM call, no dose decision in P1a. Flag triggers zero side-effects. P1b is the gate for alert logic.
- [x] **II. SDD Discipline** — spec.md + clarifications precede plan; every FR maps to a failing test in the TDD sequence below. No code written before this plan.
- [x] **III. Scope Discipline** — Principle III prohibits extra routers in P0. P1a amends the router allowlist (FR-020) by adding `patients.py`, `vitals.py`, `labs.py`. All other Phase 1+ routes remain blocked. CI gate is updated, not removed.
- [x] **IV. Privacy by Default** — All new endpoints wire through the P0 `RedactingProcessor`. Patient name, bed number, and clinical values MUST NOT appear in logs. JWT sub remains UUID-only. No new PHI exposure paths.
- [x] **V. OSS-Only Runtime** — No model inference in P1a. clinical_config.py extension is pure env-driven config, no ML.
- [x] **VI. Type Safety** — New ORM models use `Mapped[]` annotations (SQLAlchemy 2.0). All schemas are Pydantic v2 with no `dict` passing. `mypy --strict` gate applies to all new modules. TypeScript unchanged in P1a.
- [x] **VII. Git Discipline** — Work on `002-p1a-patient-data-layer`; PR targets `dev`; green CI required.
- [x] **VIII. Auth Hardening Floor** — All new endpoints protected by the P0 bearer auth middleware (FR-004, §API Contracts). No weakening of auth parameters.
- [x] **IX. Agent Accountability** — N/A: no AI surface in P1a. Re-check at P1b gate.
- [x] **X. Token Hygiene** — Plan authored in Plan Mode; `@file` refs for context; PHRs filed on completion.
- [x] **XI. Clinical Config Externalization** — `is_critical` thresholds are env-var-driven via `ClinicalConfig` extension (see data-model.md §clinical_config extension). Zero threshold literals in routers, services, or migration files. Hospitals tune by changing env, not patching code.
- [x] **XII. Offline-First** — No external network call on any P1a endpoint. All threshold data loaded from env at startup via `clinical_config.py`. Degraded mode: if env vars absent, `is_critical` defaults to false (no false positives).
- [x] **XIII. Shadow-First Deployment** — No clinical agent in P1a. `is_critical` flag writes to DB; it is observable telemetry for future shadow analysis. No autonomous action taken.
- [x] **XIV. MEP over MVP** — Feature-flag hinges (from P0 `shadow_events` scaffold) are in place. Lab threshold env vars ship in `.env.example`. Router shapes (patients, vitals, labs) anticipate P1b sub-routes without implementing them.

**No violations. Complexity Tracking table empty.**

---

## Technical Context

*(Locked from P0 — inherited verbatim)*

- **Language/Version**: Python 3.12+ (api/)
- **Primary Dependencies**: FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, structlog, pydantic-settings
- **Storage**: PostgreSQL 16 (primary)
- **Testing**: pytest + pytest-asyncio + httpx
- **Target Platform**: Linux server (Docker Compose dev; GH Actions CI)
- **Auth**: P0 bearer middleware — reused verbatim; all P1a endpoints require valid JWT
- **Logging**: P0 `RedactingProcessor` — reused verbatim; new routes inherit it

---

## Project Structure (P1a additions)

```text
api/
├── app/
│   ├── routers/
│   │   ├── patients.py        # FR-001–FR-010, FR-020 (allowlist amendment)
│   │   ├── vitals.py          # FR-011–FR-014
│   │   └── labs.py            # FR-015–FR-019, FR-017a
│   ├── models/
│   │   ├── patient.py         # Patient ORM (Mapped[] annotations)
│   │   ├── vital_signs.py     # VitalSigns ORM
│   │   └── lab_result.py      # LabResult ORM
│   ├── schemas/
│   │   ├── patient.py         # Pydantic v2: PatientCreate, PatientRead, PatientPatch,
│   │   │                      #   PatientListResponse, DischargeRequest, DischargeResponse
│   │   ├── vitals.py          # VitalsCreate, VitalsRead, VitalsListResponse
│   │   └── labs.py            # LabCreate, LabRead, LabListResponse
│   ├── services/
│   │   ├── patient_service.py # CRUD + discharge logic
│   │   ├── vitals_service.py  # Vitals write/read
│   │   └── lab_service.py     # Lab write + is_critical computation
│   └── core/
│       └── clinical_config.py # EXTENDED: LabThreshold model + 7-test lookup method
├── alembic/
│   └── versions/
│       ├── 0003_patients.py   # patients table + 4 enum types
│       ├── 0004_vital_signs.py
│       └── 0005_lab_results.py
└── tests/
    ├── unit/
    │   ├── test_is_critical.py        # FR-017/FR-017a boundary values (7 tests × edges)
    │   ├── test_patient_schemas.py    # Pydantic validators (trim, date_of_admission)
    │   └── test_vitals_schemas.py     # recorded_at future rejection
    ├── contract/
    │   ├── test_patients_crud.py      # Story 1 ACs 1–5
    │   ├── test_vitals.py             # Story 2 ACs 1–3
    │   └── test_labs.py              # Story 3 ACs 1–4
    └── integration/
        ├── test_patient_detail.py     # FR-006 embedded vitals/labs
        ├── test_pagination.py         # NFR-003 across all list endpoints
        ├── test_phi_redaction_p1a.py  # NFR-001 new endpoints
        └── test_router_allowlist.py   # Updated: patients/vitals/labs now allowed
```

---

## Scope Guard Amendment (Principle III / FR-020)

The P0 CI gate (`scripts/ci/check_router_allowlist.sh`) hard-codes the allowlist. P1a amends it:

```bash
# Before (P0):
! -name 'health.py' ! -name 'auth.py'

# After (P1a amendment):
! -name 'health.py' ! -name 'auth.py' \
! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py'
```

The gate still fails on any other file (e.g., `protocols.py`, `alerts.py`). This change ships in the same commit as the first patient router test (TDD step 9 in the sequence below).

---

## `is_critical` Computation (FR-016 / FR-017 / FR-017a)

### Logic (in `lab_service.py`)

```
given: test_name, value, reference_low (optional), reference_high (optional)

thresholds = clinical_config.get_lab_thresholds(test_name)  # Returns LabThreshold | None
if thresholds is None:
    return False  # Unsupported test (Creatinine, Troponin, unknown)

outside_ref_range = True
if reference_low is not None and reference_high is not None:
    outside_ref_range = value < reference_low or value > reference_high

crosses_critical = (
    (thresholds.critical_high is not None and value >= thresholds.critical_high)
    or (thresholds.critical_low  is not None and value <= thresholds.critical_low)
)

return outside_ref_range and crosses_critical
```

When `reference_low`/`reference_high` are absent from the request, `outside_ref_range` defaults to `True` — only the critical threshold gate applies (per spec edge case).

### Boundary values for unit tests (sourced from `SPEC.md §3.2`)

| Test | Critical low | Critical high | Test case values |
|---|---|---|---|
| K+ | 2.5 | 6.0 | 2.4→true, 2.5→false(boundary), 6.0→false(boundary), 6.1→true |
| Na+ | 125.0 | 155.0 | 124.9→true, 155.1→true |
| Hemoglobin | 7.0 | — | 6.9→true, 7.0→false |
| Platelets | 50.0 | — | 49→true, 50→false |
| INR | — | 3.0 | 3.1→true, 3.0→false |
| Blood Sugar | 54.0 | 400.0 | 53.9→true, 400.1→true |
| Lactate | — | 4.0 | 4.1→true, 4.0→false |
| Creatinine | — | — | any value → false (delta-based, P1b) |
| Troponin | — | — | any value → false (reference-relative, P1b) |

---

## TDD Order (Principle II — Red → Green → Refactor)

Each step is a commit with a failing test first. Total: ~35 tasks across 14 steps.

### Step 1 — `clinical_config.py` lab threshold extension (unit)
- **Red**: `test_is_critical.py` — import `get_lab_thresholds`; assert K+ 6.1 → `LabThreshold` with critical_high=6.0
- **Green**: Extend `ClinicalConfig` with 14 new env vars + `LabThreshold` model + `get_lab_thresholds()` method
- **Refactor**: Confirm `lru_cache` still invalidated correctly in tests via `cache_clear()`

### Step 2 — `is_critical` service unit (full boundary suite)
- **Red**: `test_is_critical.py` — all 9 test×boundary combinations above, all fail
- **Green**: `lab_service.py::compute_is_critical(test_name, value, reference_low, reference_high)` — pure function, no DB
- **Refactor**: No literals; all values from config

### Step 3 — Patient Pydantic schemas (unit)
- **Red**: `test_patient_schemas.py` — `PatientCreate` rejects future `date_of_admission`, trims whitespace, rejects invalid enums
- **Green**: `schemas/patient.py` — all validators including FR-001a
- **Refactor**: Extract `_trim_string` validator decorator if reused ≥3 fields

### Step 4 — Vitals + Labs Pydantic schemas (unit)
- **Red**: `test_vitals_schemas.py` — future `recorded_at` rejected; all-null vitals rejected; `is_critical` in `LabCreate` raises validation error
- **Green**: `schemas/vitals.py`, `schemas/labs.py` — validators; `LabCreate` uses `model_validator` to reject `is_critical` field
- **Refactor**: Shared `_future_datetime_check` validator if reused in both

### Step 5 — Migration 0003_patients (schema)
- **Red**: Alembic `upgrade()` creates `patients` table + 4 enum types; `downgrade()` reverses. Verify with a raw SQL SELECT.
- **Green**: Hand-write `0003_patients.py`; run `alembic upgrade 0003`; confirm table exists
- **Refactor**: Ensure all CHECK constraints present per data-model.md; run `alembic downgrade base` + re-upgrade

### Step 6 — Migration 0004_vital_signs
- **Red**: `upgrade()` creates `vital_signs` with FK + indexes; `downgrade()` drops
- **Green**: Hand-write `0004_vital_signs.py`
- **Refactor**: Confirm index ix_vital_signs_patient_recorded exists via `\d+ vital_signs`

### Step 7 — Migration 0005_lab_results
- **Red**: `upgrade()` creates `lab_results` with FK + indexes; `downgrade()` drops
- **Green**: Hand-write `0005_lab_results.py`
- **Refactor**: Round-trip downgrade/upgrade; confirm all columns per data-model.md

### Step 8 — ORM models (integration)
- **Red**: `conftest.py` patient factory — `Patient()` with required fields; assert DB insert + read-back round-trip
- **Green**: `models/patient.py`, `models/vital_signs.py`, `models/lab_result.py` — `Mapped[]` annotations matching data-model.md
- **Refactor**: Share `_utcnow()` from `models/base.py`; no per-model duplication

### Step 9 — Router allowlist amendment + `patients.py` skeleton
- **Red**: `test_router_allowlist.py` — updated negative test expects `patients.py`, `vitals.py`, `labs.py` to pass; any other file fails. Update `check_router_allowlist.sh` to include the three new names.
- **Green**: Create empty `routers/patients.py` (just the `APIRouter()` instance); update the shell script; wire router into `main.py`
- **Refactor**: Confirm CI gate script exits 0 on clean tree

### Step 10 — Patient CRUD contract tests
- **Red**: `test_patients_crud.py` — Story 1 ACs 1–5 + edge cases (bed_number formats, PATCH empty body, discharge 409)
- **Green**: `routers/patients.py` + `services/patient_service.py` — full CRUD + discharge
- **Refactor**: Extract `get_patient_or_404` dependency

### Step 11 — Patient list + pagination integration
- **Red**: `test_pagination.py` — `GET /patients` with `limit=101` → 400; `page=0` → 400; empty ward → 200 with `patients: []` and all-zero summary (NFR-008)
- **Green**: Pagination logic in patient_service + response model
- **Refactor**: Extract shared `PaginationParams` dependency (reused in vitals + labs)

### Step 12 — Vitals contract tests
- **Red**: `test_vitals.py` — Story 2 ACs 1–3 + future `recorded_at` → 400 + all-null vitals → 400
- **Green**: `routers/vitals.py` + `services/vitals_service.py`
- **Refactor**: Patient-existence guard refactored into shared `get_patient_or_404` dependency

### Step 13 — Labs contract tests (includes `is_critical` integration)
- **Red**: `test_labs.py` — Story 3 ACs 1–4 + client-supplied `is_critical` → 400 `field_not_allowed` + K+ 6.2 → is_critical=true round-trip against real DB
- **Green**: `routers/labs.py` + `services/lab_service.py` (calls `compute_is_critical`)
- **Refactor**: Confirm no threshold literal in router or service via `grep -r "6\.0\|2\.5\|7\.0" api/app/routers api/app/services` (CI-runnable)

### Step 14 — PHI redaction + detail endpoint integration
- **Red**: `test_phi_redaction_p1a.py` — POST patient; capture structlog output; assert name and bed_number absent. `test_patient_detail.py` — GET `/patients/{id}` returns embedded `vitals[]` and `labs[]` (FR-006)
- **Green**: Verify RedactingProcessor strips new fields; add `name` and `bed_number` to the P0 redaction field list if not already present
- **Refactor**: Redaction field list extracted to a single constant in `core/logging.py`

---

## CI Gates (inherited from P0 + amendments)

1. `ruff check .` + `ruff format --check .`
2. `mypy --strict app/`
3. `pytest -q` (all unit + contract + integration)
4. `pnpm --filter web lint` + `pnpm --filter web typecheck` (unchanged)
5. **Router allowlist gate** — amended per FR-020 (Step 9 above)
6. Secret scan (`gitleaks`)

No new CI gates required for P1a beyond the allowlist amendment.

---

## Deliverables (end of P1a)

- All source per §Project Structure above
- `specs/002-p1a-patient-data-layer/data-model.md` — entity definitions (this plan's companion)
- `specs/002-p1a-patient-data-layer/contracts/openapi.yaml` — OpenAPI 3.1 for all 9 endpoints
- `.env.example` updated with 14 new `CLINICAL_LAB_*` env vars
- Green CI on `002-p1a-patient-data-layer` branch

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| _(none)_ | _(none)_ | _(none)_ |
