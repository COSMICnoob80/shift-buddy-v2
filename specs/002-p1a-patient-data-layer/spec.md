# Feature Specification: P1a — Patient Data Layer

**Feature Branch**: `002-p1a-patient-data-layer`
**Created**: 2026-04-24
**Status**: Draft
**Phase**: P1a (data layer only; alert engine is P1b, UI is P1c)
**Parent Spec**: `SPEC.md §1.1–1.4, §2.2–2.4, §8`
**Constitution**: `.specify/memory/constitution.md` v0.2.0

---

## 1. Purpose & Non-Goals

**Purpose**: Ship the patient data layer — ORM models, Alembic migrations, and REST endpoints for Patient, Vitals, and Labs — so P1b (alert engine) and P1c (patient board UI) have a stable, tested, typed foundation to build on.

**Non-Goals (P1a)**:
- Alert engine / notifications (P1b)
- Clinical protocol evaluation (P1b)
- Drug interaction checking (P1b)
- Patient board UI (P1c)
- LangGraph agents or Ollama inference (P2+)
- `is_critical` triggering any side-effect — it is computed and stored, silent until P1b.

---

## 2. User Stories

### Story 1 — HO Admits a Patient (Priority: P1)

A House Officer logs in, creates a new patient record with full demographic and medication data, and confirms the patient appears retrievable by ID and in the ward list.

**Why this priority**: Everything else depends on patients existing in the system. No patient → no vitals, no labs, no alerts.

**Independent Test**: POST `/patients` → confirm 201 + UUID → GET `/patients/{id}` → confirm all fields round-trip.

**Acceptance Scenarios**:

1. **Given** an authenticated HO, **When** they POST a valid patient payload (all required fields), **Then** the system returns 201 with a UUID, `created_at`, and `updated_at` in UTC.
2. **Given** an authenticated HO, **When** they POST a patient missing `bed_number`, **Then** the system returns 400 with `{"error": "validation_error", "message": "..."}`.
3. **Given** a patient exists, **When** the HO GETs `/patients?ward=ortho`, **Then** the response includes a `summary` with acuity counts and only ortho patients.
4. **Given** a patient exists, **When** the HO PATCHes `acuity`, **Then** `updated_at` is refreshed; all other fields are unchanged.
5. **Given** a patient exists, **When** the HO POSTs `/patients/{id}/discharge`, **Then** `status` = `discharged`; the record persists (soft state change, not deleted).

### Story 2 — HO Records Vitals (Priority: P2)

An HO records a partial vitals set (not all parameters measured every time) for a patient and can retrieve the full chronological trend later.

**Why this priority**: Vitals are the primary clinical data stream; without them, the alert engine (P1b) has nothing to evaluate.

**Independent Test**: POST `/patients/{id}/vitals` with partial fields → GET `/patients/{id}/vitals` → confirm ascending-sorted array.

**Acceptance Scenarios**:

1. **Given** a patient exists, **When** the HO posts vitals with only `heart_rate` and `spo2`, **Then** the system returns 201 with a UUID and all unset fields absent/null.
2. **Given** a patient exists, **When** the HO posts vitals with `recorded_at` in the future, **Then** the system returns 400.
3. **Given** multiple vitals recorded, **When** the HO GETs `/patients/{id}/vitals`, **Then** records are sorted ascending by `recorded_at`.

### Story 3 — HO Checks Lab Results (Priority: P3)

An HO adds a lab result and the system auto-computes `is_critical` based on thresholds from `clinical_config.py`. The HO can filter by test name.

**Why this priority**: Lab `is_critical` flag is the input signal for the alert engine in P1b. The flag must be correct before P1b can use it.

**Independent Test**: POST `/patients/{id}/labs` with K+ value → confirm `is_critical` matches threshold logic → GET with `?test_name=K%2B` → only K+ results returned.

**Acceptance Scenarios**:

1. **Given** a patient exists, **When** the HO posts K+ = 6.2 mEq/L (above critical threshold), **Then** the system returns 201 with `is_critical = true`.
2. **Given** a patient exists, **When** the HO posts K+ = 4.0 mEq/L (within normal), **Then** the system returns 201 with `is_critical = false`.
3. **Given** labs exist, **When** the HO GETs `/patients/{id}/labs?test_name=K%2B`, **Then** only K+ records are returned.
4. **Given** labs exist, **When** the HO GETs `/patients/{id}/labs` with no filter, **Then** all labs sorted ascending by `recorded_at` are returned.

### Edge Cases

- Patient `bed_number` must accept alphanumeric formats ("12", "ICU-3", "FW-1").
- `allergies = []` is valid (displayed as "NKDA" in UI — UI concern, not API).
- PATCH with an empty body `{}` is valid and returns the current patient unchanged (with refreshed `updated_at`).
- Vitals with all optional fields absent (empty recording) → 400; at least one measurement required.
- Lab `reference_low` / `reference_high` absent → `is_critical` computed against `clinical_config.py` absolute thresholds only.
- Pagination: `page=0` or `limit > 100` → 400 validation error.
- Discharge an already-discharged patient → 409 `already_discharged`.

---

## 3. Functional Requirements

### Patient CRUD

- **FR-001**: System MUST accept `POST /api/v1/patients` with the payload defined in §5.1 and return 201 + full patient object including system-assigned `id`, `created_at`, `updated_at`.
- **FR-001a**: `date_of_admission` MUST NOT be a future date (compared to UTC today). Returns 400 `{"error": "validation_error"}` if violated. Consistent with FR-012 (recorded_at).
- **FR-002**: `created_by` MUST be set to the authenticated user's UUID from the Bearer token; not supplied by client.
- **FR-003**: `assigned_ho` defaults to the authenticated user's UUID if not provided.
- **FR-004**: System MUST return `GET /api/v1/patients` with `patients[]` + `summary` (acuity counts). Supports query params: `ward`, `acuity`, `assigned_ho`, `status` (default `admitted`), `sort` (default `acuity`). Paginated (default 20, max 100).
- **FR-005**: Acuity sort order MUST be: critical → urgent → stable → discharge_ready (numeric weights 1–4).
- **FR-006**: `GET /api/v1/patients/{patient_id}` MUST include the full patient object plus embedded `vitals[]` (all records) and `labs[]` (all records). Returns 404 if not found.
- **FR-007**: `PATCH /api/v1/patients/{patient_id}` accepts a partial update. Only included fields mutate. `updated_at` refreshes on every call including empty body. Returns 200 + updated object.
- **FR-008**: `POST /api/v1/patients/{patient_id}/discharge` sets `status = discharged`, records discharge timestamp. Record is NOT deleted. Returns 409 if already discharged.
- **FR-009**: All string inputs MUST be trimmed (leading/trailing whitespace removed) before persistence.
- **FR-010**: All timestamps MUST be stored and returned in UTC ISO 8601.

### Vitals

- **FR-011**: `POST /api/v1/patients/{patient_id}/vitals` accepts a partial vitals payload (minimum one measurement field required). Returns 201 + vitals record with UUID.
- **FR-012**: `recorded_at` MUST NOT be a future timestamp; returns 400 if so.
- **FR-013**: `GET /api/v1/patients/{patient_id}/vitals` returns all vitals records sorted ascending by `recorded_at`. Paginated.
- **FR-014**: Returns 404 if `patient_id` does not exist.

### Labs

- **FR-015**: `POST /api/v1/patients/{patient_id}/labs` accepts a lab payload and auto-computes `is_critical`. Client MUST NOT supply `is_critical`.
- **FR-016**: `is_critical` computation MUST use only thresholds sourced from `api/app/core/clinical_config.py` (Principle XI). No threshold literal appears in the labs router or service.
- **FR-017**: `is_critical = true` if the `value` falls outside `[reference_low, reference_high]` AND crosses the critical threshold defined in `clinical_config.py` for that `test_name`. If `test_name` has no configured threshold, `is_critical` defaults to `false`.
- **FR-017a**: P1a `is_critical` supports **7 absolute-threshold tests only** (sourced from `SPEC.md §3.2`): K+, Na+, Hemoglobin, Platelets, INR, Blood Sugar, Lactate. Creatinine (delta-based threshold) and Troponin (reference-relative threshold) MUST return `is_critical = false` in P1a — delta-based and reference-relative logic is P1b scope.
- **FR-018**: `GET /api/v1/patients/{patient_id}/labs` returns all lab records sorted ascending by `recorded_at`. Optional `?test_name=` filter. Paginated.
- **FR-019**: Returns 404 if `patient_id` does not exist.

### Router Allowlist (NFR-009 Amendment)

- **FR-020**: The CI router allowlist gate (`scripts/ci/check_router_allowlist.sh`) MUST be updated to allow `patients.py`, `vitals.py`, and `labs.py` in addition to `health.py` and `auth.py`. The CI gate MUST still fail on any other file.

---

## 4. API Contracts

**Base URL**: `/api/v1` | **Auth**: Bearer JWT on all endpoints.

### 4.1 POST /patients

**Request**:
```json
{
  "bed_number": "3",
  "name": "Cook Lateef",
  "age": 45,
  "sex": "male",
  "rank_title": "Cook",
  "date_of_admission": "2026-01-28",
  "provisional_diagnosis": "Right hypochondriac pain",
  "active_problems": ["Hepatic steatosis"],
  "current_medications": [
    { "name": "Inj. Pantoprazole", "dose": "40mg", "route": "iv",
      "frequency": "OD", "start_date": "2026-01-28" }
  ],
  "allergies": [],
  "acuity": "stable",
  "ward": "ortho",
  "assigned_ho": "<uuid-optional>"
}
```
**Success**: `201` → full Patient object (all fields including `id`, `created_by`, `created_at`, `updated_at`).
**Errors**: `400` validation, `401` unauthenticated.

### 4.2 GET /patients

**Query params**: `ward`, `acuity`, `assigned_ho`, `status` (default `admitted`), `sort` (default `acuity`), `page` (default 1), `limit` (default 20, max 100).

**Success**: `200`
```json
{
  "patients": [...],
  "summary": { "total": 16, "critical": 2, "urgent": 3, "stable": 9, "discharge_ready": 2 },
  "page": 1, "limit": 20, "total_pages": 1
}
```

### 4.3 GET /patients/{patient_id}

**Success**: `200` → Patient object + `"vitals": [...]` + `"labs": [...]`.
**Errors**: `401`, `404 patient_not_found`.

### 4.4 PATCH /patients/{patient_id}

**Request**: Any subset of mutable Patient fields.
**Success**: `200` → updated Patient object.
**Errors**: `400`, `401`, `404`.

### 4.5 POST /patients/{patient_id}/discharge

**Request**: `{ "condition_at_discharge": "Improved, tolerating orals" }`
**Success**: `200` → `{ "status": "discharged", "discharged_at": "<utc-iso>" }`.
**Errors**: `401`, `404`, `409 already_discharged`.

### 4.6 POST /patients/{patient_id}/vitals

**Request** (at least one measurement field required):
```json
{ "heart_rate": 88, "systolic_bp": 130, "diastolic_bp": 80,
  "temperature": 37.2, "spo2": 97, "recorded_at": "2026-02-16T14:30:00Z" }
```
**Success**: `201` → VitalSigns record with `id`.
**Errors**: `400` (future `recorded_at`, no fields), `401`, `404`.

### 4.7 GET /patients/{patient_id}/vitals

**Query params**: `page`, `limit`.
**Success**: `200` → `{ "vitals": [...sorted asc by recorded_at], "page": 1, "limit": 20, "total_pages": N }`.

### 4.8 POST /patients/{patient_id}/labs

**Request**:
```json
{ "test_name": "K+", "value": 6.2, "unit": "mEq/L",
  "reference_low": 3.5, "reference_high": 5.0,
  "recorded_at": "2026-02-16T15:00:00Z" }
```
**Success**: `201` → LabResult record with `id` and server-computed `is_critical`.
**Errors**: `400`, `401`, `404`. Client supplying `is_critical` → 400 `field_not_allowed`.

### 4.9 GET /patients/{patient_id}/labs

**Query params**: `test_name` (optional filter), `page`, `limit`.
**Success**: `200` → `{ "labs": [...sorted asc by recorded_at], "page": 1, "limit": 20, "total_pages": N }`.

**Error envelope (all errors)**:
```json
{ "error": "error_code", "message": "Human-readable description" }
```

---

## 5. Data Models

*Verbatim from SPEC.md §1.1–1.4. FK relationships made explicit.*

### 5.1 Patient

| Field | Type | Required | Constraints | Default |
|---|---|---|---|---|
| `id` | UUID v4 | Auto | Immutable, PK | System-generated |
| `bed_number` | String | Yes | 1–20 chars | — |
| `name` | String | Yes | 1–100 chars, trimmed | — |
| `age` | Integer | Yes | 0–150 | — |
| `sex` | Enum | Yes | `male`, `female` | — |
| `rank_title` | String | No | Military rank/title | `null` |
| `date_of_admission` | ISO 8601 Date | Yes | Cannot be future | — |
| `provisional_diagnosis` | String | Yes | 1–500 chars | — |
| `active_problems` | Array[String] | No | 0–20 items, each 1–200 chars | `[]` |
| `current_medications` | Array[Medication] | No | See §5.2 | `[]` |
| `allergies` | Array[String] | No | — | `[]` |
| `acuity` | Enum | Yes | `critical`, `urgent`, `stable`, `discharge_ready` | `stable` |
| `ward` | Enum | Yes | `ortho`, `surgical_itc`, `family`, `officer`, `child`, `emergency` | — |
| `assigned_ho` | UUID FK → users.id | Yes | — | Current user |
| `status` | Enum | Yes | `admitted`, `discharged`, `transferred`, `expired` | `admitted` |
| `discharged_at` | DateTime | No | UTC, set on discharge | `null` |
| `condition_at_discharge` | String | No | Set on discharge | `null` |
| `created_by` | UUID FK → users.id | Auto | Immutable | Authenticated user |
| `created_at` | DateTime | Auto | UTC, immutable | System timestamp |
| `updated_at` | DateTime | Auto | UTC, updated on every write | System timestamp |

**Storage**: `current_medications` and `active_problems` stored as JSONB (PostgreSQL). `allergies` stored as JSONB array.

### 5.2 Medication (Embedded in Patient.current_medications)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | String | Yes | 1–100 chars |
| `dose` | String | Yes | e.g. "1g", "500mg" |
| `route` | Enum | Yes | `iv`, `im`, `sc`, `po`, `pr`, `nebulized`, `topical`, `sublingual` |
| `frequency` | String | Yes | e.g. "BD", "TDS", "OD", "PRN" |
| `start_date` | ISO 8601 Date | Yes | — |
| `end_date` | ISO 8601 Date | No | `null` = ongoing |
| `notes` | String | No | — |

### 5.3 VitalSigns

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID v4 | Auto | PK |
| `patient_id` | UUID FK → patients.id | Yes | — |
| `recorded_at` | DateTime | Yes | UTC, not future |
| `heart_rate` | Integer | No | 0–300 bpm |
| `systolic_bp` | Integer | No | 0–300 mmHg |
| `diastolic_bp` | Integer | No | 0–200 mmHg |
| `temperature` | Float | No | 30.0–45.0 °C |
| `spo2` | Integer | No | 0–100 % |
| `respiratory_rate` | Integer | No | 0–80 /min |
| `gcs` | Integer | No | 3–15 |
| `urine_output` | Float | No | 0–5000 ml |
| `blood_sugar` | Float | No | 0–1000 mg/dL |

At least one optional field MUST be present; an all-null vitals record is rejected.

### 5.4 LabResult

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID v4 | Auto | PK |
| `patient_id` | UUID FK → patients.id | Yes | — |
| `test_name` | String | Yes | e.g. "K+", "Hb", "Creatinine" |
| `value` | Float | Yes | — |
| `unit` | String | Yes | e.g. "mEq/L", "g/dL" |
| `reference_low` | Float | No | — |
| `reference_high` | Float | No | — |
| `is_critical` | Boolean | Auto | Server-computed via `clinical_config.py`; client MUST NOT supply |
| `recorded_at` | DateTime | Yes | UTC |

---

## 6. Non-Functional Requirements

- **NFR-001**: PHI redaction — all new endpoints pass through the P0 `RedactingProcessor` (structlog). Patient names, bed numbers, and clinical values MUST NOT appear in application logs.
- **NFR-002**: All IDs are UUID v4. No sequential integers exposed in the API.
- **NFR-003**: Pagination MUST be present on all list endpoints. Default page size 20, maximum 100. Requests with `limit > 100` return 400.
- **NFR-004**: Type safety — new models use Pydantic v2 schemas; ORM models use SQLAlchemy 2.0 `Mapped[]` annotations. `mypy --strict` MUST pass.
- **NFR-005**: `is_critical` threshold logic MUST be unit-tested against boundary values defined in `SPEC.md §3.2`. No threshold literal appears in application code (Principle XI).
- **NFR-006**: CI router allowlist gate updated for `patients.py`, `vitals.py`, `labs.py`; gate still fails on any other file (FR-020).
- **NFR-007**: Alembic migrations for `patients`, `vital_signs`, and `lab_results` tables MUST be hand-written, reversible (downgrade path), and idempotent.
- **NFR-008**: `GET /patients` with no records returns `200` with `patients: []` and `summary` all zeros — not 404.
- **NFR-009**: Offline-first (Principle XII) — no external network call on any new endpoint. All threshold data loaded from env via `clinical_config.py`.

---

## 7. Review Checklist

- [ ] All data models match SPEC.md §1.1–1.4 verbatim.
- [ ] All endpoint signatures match §4.1–4.9 above.
- [ ] `is_critical` uses `clinical_config.py` — no hardcoded threshold literals anywhere.
- [ ] PHI redaction tested (no patient name/value in logs for new endpoints).
- [ ] Router allowlist CI gate updated to include `patients.py`, `vitals.py`, `labs.py`.
- [ ] `mypy --strict` clean on new modules.
- [ ] Alembic migrations have working `downgrade()`.
- [ ] Pagination present on all list endpoints; `limit > 100` → 400.
- [ ] Discharge is a soft state change — no DB DELETE.
- [ ] `is_critical = true` does NOT trigger alerts (P1b scope).
- [ ] Constitution Check records alignment with Principles I, II, III, IV, VI, XI, XIV before planning.

---

## Clarifications

### Session 2026-04-26

- Q: Should `date_of_admission` be validated server-side to reject future dates? → A: Yes — server returns 400 `validation_error` if `date_of_admission` is a future date (UTC). Added as FR-001a, consistent with the vitals `recorded_at` pattern in FR-012.
- Q: Which tests from SPEC.md §3.2 are in scope for P1a `is_critical` computation? → A: 7 absolute-threshold tests only — K+, Na+, Hemoglobin, Platelets, INR, Blood Sugar, Lactate. Creatinine (delta-based) and Troponin (reference-relative) return `is_critical = false` in P1a; delta/reference logic deferred to P1b. Added as FR-017a.

---

*Rule: Code that contradicts this spec is a bug. Spec that contradicts user needs is a spec revision.*
