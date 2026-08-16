# Data Model: P1a — Patient Data Layer

**Branch**: `002-p1a-patient-data-layer` | **Date**: 2026-04-26
**Spec**: [spec.md](./spec.md) | **Constitution**: `.specify/memory/constitution.md` v0.2.0

---

## Entities Overview

```
users (P0)
  └── patients           (FK: assigned_ho → users.id, created_by → users.id)
        ├── vital_signs  (FK: patient_id → patients.id)
        └── lab_results  (FK: patient_id → patients.id)
```

All IDs are UUID v4 (no sequential integers per NFR-002). All timestamps UTC.

---

## Entity: Patient

**Table**: `patients`

| Column | PG Type | Nullable | Constraints | Default |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK | `gen_random_uuid()` |
| `bed_number` | `VARCHAR(20)` | NOT NULL | CHECK(length ≥ 1) | — |
| `name` | `VARCHAR(100)` | NOT NULL | CHECK(length ≥ 1) | — |
| `age` | `INTEGER` | NOT NULL | CHECK(age BETWEEN 0 AND 150) | — |
| `sex` | `patient_sex` (enum) | NOT NULL | — | — |
| `rank_title` | `VARCHAR(100)` | NULL | — | NULL |
| `date_of_admission` | `DATE` | NOT NULL | CHECK(date_of_admission ≤ CURRENT_DATE) | — |
| `provisional_diagnosis` | `VARCHAR(500)` | NOT NULL | CHECK(length ≥ 1) | — |
| `active_problems` | `JSONB` | NOT NULL | Array of strings; see JSONB schema | `'[]'` |
| `current_medications` | `JSONB` | NOT NULL | Array of medication objects; see JSONB schema | `'[]'` |
| `allergies` | `JSONB` | NOT NULL | Array of strings | `'[]'` |
| `acuity` | `patient_acuity` (enum) | NOT NULL | — | `'stable'` |
| `ward` | `patient_ward` (enum) | NOT NULL | — | — |
| `assigned_ho` | `UUID` | NOT NULL | FK → users.id ON DELETE RESTRICT | — |
| `status` | `patient_status` (enum) | NOT NULL | — | `'admitted'` |
| `discharged_at` | `TIMESTAMPTZ` | NULL | Set on discharge | NULL |
| `condition_at_discharge` | `TEXT` | NULL | Set on discharge | NULL |
| `created_by` | `UUID` | NOT NULL | FK → users.id ON DELETE RESTRICT; immutable | — |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Immutable | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Refreshed on every write | `NOW()` |

### PG Enum Types

```sql
CREATE TYPE patient_sex    AS ENUM ('male', 'female');
CREATE TYPE patient_acuity AS ENUM ('critical', 'urgent', 'stable', 'discharge_ready');
CREATE TYPE patient_ward   AS ENUM ('ortho', 'surgical_itc', 'family', 'officer', 'child', 'emergency');
CREATE TYPE patient_status AS ENUM ('admitted', 'discharged', 'transferred', 'expired');
```

### Indexes

```sql
-- Ward list queries (FR-004)
CREATE INDEX ix_patients_ward       ON patients (ward)     WHERE status = 'admitted';
CREATE INDEX ix_patients_acuity     ON patients (acuity)   WHERE status = 'admitted';
CREATE INDEX ix_patients_assigned_ho ON patients (assigned_ho);
CREATE INDEX ix_patients_status     ON patients (status);
-- Composite for default sort (acuity weight sort + ward filter)
CREATE INDEX ix_patients_ward_acuity ON patients (ward, acuity) WHERE status = 'admitted';
```

### Acuity Sort Weights

Applied in application layer (not stored in DB):

| Acuity | Weight |
|---|---|
| `critical` | 1 |
| `urgent` | 2 |
| `stable` | 3 |
| `discharge_ready` | 4 |

### FK Cascade Rules

- `assigned_ho` → `users.id` ON DELETE **RESTRICT** — prevents deleting a user who has assigned patients (clinical audit trail).
- `created_by` → `users.id` ON DELETE **RESTRICT** — immutable authorship; user cannot be deleted while patients reference them.

---

## Embedded Schema: Medication (JSONB in `patients.current_medications`)

```json
[
  {
    "name": "Inj. Pantoprazole",
    "dose": "40mg",
    "route": "iv",
    "frequency": "OD",
    "start_date": "2026-01-28",
    "end_date": null,
    "notes": null
  }
]
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | 1–100 chars |
| `dose` | string | Yes | 1–50 chars (e.g. "40mg", "1g") |
| `route` | string (enum) | Yes | `iv`, `im`, `sc`, `po`, `pr`, `nebulized`, `topical`, `sublingual` |
| `frequency` | string | Yes | 1–20 chars (e.g. "OD", "BD", "TDS", "PRN") |
| `start_date` | string (ISO 8601 date) | Yes | — |
| `end_date` | string (ISO 8601 date) \| null | No | null = ongoing |
| `notes` | string \| null | No | — |

Validated by the `MedicationSchema` Pydantic v2 model at request time; stored verbatim as JSONB.

---

## Embedded Schema: active_problems (JSONB)

```json
["Hepatic steatosis", "Hypertension"]
```

- Array of strings; 0–20 items; each item 1–200 chars.
- Validated by Pydantic at request time; stored as JSONB array.

---

## Embedded Schema: allergies (JSONB)

```json
["Penicillin", "NSAIDs"]
```

- Array of strings; no length limit per item (spec does not specify).
- Empty array `[]` = "No Known Drug Allergies" (NKDA) — display concern only.

---

## Entity: VitalSigns

**Table**: `vital_signs`

| Column | PG Type | Nullable | Constraints | Default |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK | `gen_random_uuid()` |
| `patient_id` | `UUID` | NOT NULL | FK → patients.id ON DELETE CASCADE | — |
| `recorded_at` | `TIMESTAMPTZ` | NOT NULL | CHECK(recorded_at ≤ NOW()), not future | — |
| `heart_rate` | `INTEGER` | NULL | CHECK(0 ≤ heart_rate ≤ 300) | NULL |
| `systolic_bp` | `INTEGER` | NULL | CHECK(0 ≤ systolic_bp ≤ 300) | NULL |
| `diastolic_bp` | `INTEGER` | NULL | CHECK(0 ≤ diastolic_bp ≤ 200) | NULL |
| `temperature` | `NUMERIC(4,1)` | NULL | CHECK(30.0 ≤ temperature ≤ 45.0) | NULL |
| `spo2` | `INTEGER` | NULL | CHECK(0 ≤ spo2 ≤ 100) | NULL |
| `respiratory_rate` | `INTEGER` | NULL | CHECK(0 ≤ respiratory_rate ≤ 80) | NULL |
| `gcs` | `INTEGER` | NULL | CHECK(3 ≤ gcs ≤ 15) | NULL |
| `urine_output` | `NUMERIC(7,1)` | NULL | CHECK(0 ≤ urine_output ≤ 5000) | NULL |
| `blood_sugar` | `NUMERIC(6,1)` | NULL | CHECK(0 ≤ blood_sugar ≤ 1000) | NULL |

**Constraint**: At least one non-null measurement field required — enforced in application layer (Pydantic validator), not DB level. A pure-null vitals row is rejected at 400.

### FK Cascade Rule

- `patient_id` → `patients.id` ON DELETE **CASCADE** — vitals are owned by the patient; if a patient is ever hard-deleted (out of P1a scope), vitals go with them. In practice, patients are only soft-discharged in P1a, so this is a safety net.

### Indexes

```sql
-- Trend queries sorted ascending (FR-013)
CREATE INDEX ix_vital_signs_patient_recorded ON vital_signs (patient_id, recorded_at ASC);
```

---

## Entity: LabResult

**Table**: `lab_results`

| Column | PG Type | Nullable | Constraints | Default |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK | `gen_random_uuid()` |
| `patient_id` | `UUID` | NOT NULL | FK → patients.id ON DELETE CASCADE | — |
| `test_name` | `VARCHAR(100)` | NOT NULL | CHECK(length ≥ 1) | — |
| `value` | `NUMERIC(10,4)` | NOT NULL | — | — |
| `unit` | `VARCHAR(50)` | NOT NULL | CHECK(length ≥ 1) | — |
| `reference_low` | `NUMERIC(10,4)` | NULL | — | NULL |
| `reference_high` | `NUMERIC(10,4)` | NULL | — | NULL |
| `is_critical` | `BOOLEAN` | NOT NULL | Server-computed; see FR-017/FR-017a | `FALSE` |
| `recorded_at` | `TIMESTAMPTZ` | NOT NULL | — | — |

### FK Cascade Rule

- `patient_id` → `patients.id` ON DELETE **CASCADE** — same rationale as vital_signs.

### Indexes

```sql
-- Trend queries (FR-018) + test_name filter
CREATE INDEX ix_lab_results_patient_recorded ON lab_results (patient_id, recorded_at ASC);
CREATE INDEX ix_lab_results_patient_test     ON lab_results (patient_id, test_name);
```

---

## Migration Sequence

| Migration | Table(s) | Precondition |
|---|---|---|
| `0001_users` (P0, done) | `users` | — |
| `0002_shadow_events` (P0, done) | `shadow_events` | 0001 |
| `0003_patients` | `patients` + enum types | 0002 |
| `0004_vital_signs` | `vital_signs` | 0003 |
| `0005_lab_results` | `lab_results` | 0004 |

Each migration MUST implement both `upgrade()` and `downgrade()`. Downgrade order reverses dependency: 0005 → 0004 → 0003.

---

## `clinical_config.py` Extension — Lab Thresholds

The 7 P1a-supported tests and their env var keys (sourced from `SPEC.md §3.2`; see FR-017a):

| Test | Env var (critical high) | Env var (critical low) | Default value |
|---|---|---|---|
| K+ | `CLINICAL_LAB_K_CRITICAL_HIGH` | `CLINICAL_LAB_K_CRITICAL_LOW` | 6.0 / 2.5 |
| Na+ | `CLINICAL_LAB_NA_CRITICAL_HIGH` | `CLINICAL_LAB_NA_CRITICAL_LOW` | 155.0 / 125.0 |
| Hemoglobin | `CLINICAL_LAB_HB_CRITICAL_LOW` | _(high not applicable)_ | 7.0 |
| Platelets | `CLINICAL_LAB_PLT_CRITICAL_LOW` | _(high not applicable)_ | 50.0 |
| INR | `CLINICAL_LAB_INR_CRITICAL_HIGH` | _(low not applicable)_ | 3.0 |
| Blood Sugar | `CLINICAL_LAB_BS_CRITICAL_HIGH` | `CLINICAL_LAB_BS_CRITICAL_LOW` | 400.0 / 54.0 |
| Lactate | `CLINICAL_LAB_LACTATE_CRITICAL_HIGH` | _(low not applicable)_ | 4.0 |

**Lookup mechanism**: `ClinicalConfig` gains a `get_lab_thresholds(test_name: str) -> LabThreshold | None` method. Returns `None` for unsupported tests (Creatinine, Troponin, and any unlisted test) → `is_critical = False`. No threshold literals in router or service.

---

*All entity definitions are authoritative for migration hand-writing. Any divergence is a bug per Principle II.*
