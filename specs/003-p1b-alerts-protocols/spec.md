# Feature Specification: P1b — Alert Engine + Clinical Protocols

**Feature Branch**: `003-p1b-alerts-protocols`
**Created**: 2026-04-28
**Status**: Draft
**Phase**: P1b (alert engine + deterministic protocol evaluator; P1a complete)
**Parent Spec**: `SPEC.md §2.5, §3, §4, §6 (P1 acceptance)`
**Constitution**: `.specify/memory/constitution.md` v0.2.0

---

## 1. Purpose & Non-Goals

**Purpose**: Ship the alert engine and deterministic clinical protocol evaluator. P1a built the patient/vitals/labs data layer. P1b adds the rules layer: fire structured Alert records when SPEC §3 thresholds are crossed, expose alert management endpoints, and evaluate 3 offline-capable deterministic protocols (Hyperkalemia, AKI, DKA). Every protocol evaluation writes its first row to `shadow_events`, activating the MEP hinge from P0.

**Non-Goals (P1b)**:
- Patient board / alert UI (P1c)
- LangGraph agents or any LLM call (P2+)
- Drug interaction checker beyond protocol-internal flags
- WebSocket real-time push (P1c)
- GCS drop-based alerting (requires session baseline; P1c)
- Urine output rate-based alerting (requires patient weight + 6-hr window; P1c)
- ACS and Sepsis protocols (P1c)
- WhatsApp / notification delivery (P3+)

---

## 2. User Stories

### Story 1 — HO Sees Alert After Critical Vitals (Priority: P1)

An HO posts `heart_rate=135`; a critical Alert record is auto-created in the same transaction. A subsequent `GET /patients/:id/alerts` surfaces it unacknowledged.

**Acceptance Scenarios**:
1. `POST /vitals` `heart_rate=135` → 201 + Alert(`alert_type=critical`, `trigger_parameter=heart_rate`).
2. `POST /vitals` `heart_rate=55` → 201 + Alert(`alert_type=warning`).
3. `POST /vitals` `heart_rate=80` → 201 + no Alert created.
4. `GET /patients/:id/alerts` → paginated list; `?acknowledged=false` filters to open alerts.
5. `POST /alerts/:id/acknowledge` → 200 with `acknowledged_by` + `acknowledged_at`; 409 on double-ack.

### Story 2 — HO Sees Alert After Critical Lab (Priority: P1)

A lab already evaluated as `is_critical=true` by P1a `compute_is_critical` now also produces an Alert with a `protocol_link`.

**Acceptance Scenarios**:
1. `POST /labs` K+=6.2 → 201 + Alert(`trigger_source=lab`, `protocol_link=/api/v1/protocols/evaluate?protocol=hyperkalemia`).
2. `POST /labs` K+=4.0 → 201 + no Alert.

### Story 3 — HO Evaluates Hyperkalemia Protocol (Priority: P2)

An HO submits K+=6.2 with no ECG changes; system returns severity + ranked actions with citations. Works with no internet. Shadow event written.

**Acceptance Scenarios**:
1. `values: {potassium: 5.6}` → `severity=moderate`, actions include Kayexalate.
2. `values: {potassium: 6.2, ecg_changes: false}` → `severity=severe`, Calcium Gluconate priority 1.
3. `values: {potassium: 6.7}` → `severity=emergency`, `escalation` includes "CALL SENIOR IMMEDIATELY".
4. All 6 SPEC §4.1 test cases pass.

### Story 4 — Shadow Event Written Per Protocol Evaluation (Priority: P3)

Every protocol evaluation writes one row to `shadow_events`. Payload has no PHI.

**Acceptance Scenarios**:
1. `POST /protocols/evaluate` (any protocol) → `shadow_events` row with `event_type=protocol_evaluation`, `divergence_score=null`.
2. DB row payload MUST NOT contain `patient_id`, patient name, bed number, or raw clinical value.

### Edge Cases
- Vitals with all measurement fields absent → 400 (P1a rule, unchanged).
- `POST /alerts/:id/acknowledge` on non-existent alert → 404 `alert_not_found`.
- `POST /protocols/evaluate` with unknown protocol → 400 `protocol_not_found`.
- `GET /protocols` → 200 with static list; no DB hit.
- AKI protocol with no prior creatinine within 48 hrs → `severity=insufficient_data`.
- `GET /patients/:id/alerts` with no alerts → 200 `alerts: []`, not 404.

---

## 3. Functional Requirements

### 3.1 Alert Engine

- **FR-001**: `POST /vitals` and `POST /labs` MUST evaluate thresholds and, if triggered, create an Alert record in the same DB transaction. If alert insert fails, the vitals/labs write rolls back.
- **FR-002**: Threshold evaluation MUST source all values from `clinical_config.py` (Principle XI). No threshold literal appears in `alert_service.py` or any router.
- **FR-003**: Vital parameters evaluated in P1b: `heart_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `spo2`, `respiratory_rate`, `blood_sugar`. One alert per parameter per recording at the highest applicable severity.
- **FR-004**: `alert_type = critical` if the value crosses the critical threshold; `alert_type = warning` if it crosses only the warning threshold.
- **FR-005**: For lab alerts, `is_critical=true` from `compute_is_critical` (P1a, `lab_service.py`) is the trigger. The alert service MUST NOT duplicate threshold logic — it consumes the already-computed boolean.
- **FR-006**: Alert `message` is human-readable and de-identified: references `trigger_parameter` + `trigger_value` + severity text. Never contains patient name.
- **FR-007**: `protocol_link` is set on lab alerts when `test_name` maps to a supported protocol (K+ → hyperkalemia, Creatinine → aki_staging, Blood Sugar → dka). All others `null`.
- **FR-008**: `GET /api/v1/patients/{patient_id}/alerts` returns paginated alerts; filterable by `?alert_type` and `?acknowledged`. Default 20, max 100.
- **FR-009**: `POST /api/v1/alerts/{alert_id}/acknowledge` sets `acknowledged=true`, `acknowledged_by` from Bearer JWT, `acknowledged_at` to UTC now. Returns 409 `already_acknowledged` if repeated.

### 3.2 clinical_config.py Extension (Vitals Thresholds)

The existing `hr_min`, `hr_max`, `sbp_min` fields are the critical-tier values for those parameters. P1b extends `ClinicalConfig` with:

| Field Name | Env Alias | Default | Source |
|---|---|---|---|
| `vital_hr_warn_low` | CLINICAL_VITAL_HR_WARN_LOW | 50 | SPEC §3.1 |
| `vital_hr_warn_high` | CLINICAL_VITAL_HR_WARN_HIGH | 110 | SPEC §3.1 |
| `vital_sbp_warn_low` | CLINICAL_VITAL_SBP_WARN_LOW | 100 | SPEC §3.1 |
| `vital_sbp_warn_high` | CLINICAL_VITAL_SBP_WARN_HIGH | 160 | SPEC §3.1 |
| `vital_sbp_crit_high` | CLINICAL_VITAL_SBP_CRIT_HIGH | 180 | SPEC §3.1 |
| `vital_dbp_warn_high` | CLINICAL_VITAL_DBP_WARN_HIGH | 100 | SPEC §3.1 |
| `vital_dbp_crit_high` | CLINICAL_VITAL_DBP_CRIT_HIGH | 110 | SPEC §3.1 |
| `vital_temp_warn_low` | CLINICAL_VITAL_TEMP_WARN_LOW | 36.0 | SPEC §3.1 |
| `vital_temp_warn_high` | CLINICAL_VITAL_TEMP_WARN_HIGH | 38.0 | SPEC §3.1 |
| `vital_temp_crit_low` | CLINICAL_VITAL_TEMP_CRIT_LOW | 35.0 | SPEC §3.1 |
| `vital_temp_crit_high` | CLINICAL_VITAL_TEMP_CRIT_HIGH | 39.5 | SPEC §3.1 |
| `vital_spo2_warn_low` | CLINICAL_VITAL_SPO2_WARN_LOW | 94 | SPEC §3.1 |
| `vital_spo2_crit_low` | CLINICAL_VITAL_SPO2_CRIT_LOW | 90 | SPEC §3.1 |
| `vital_rr_warn_low` | CLINICAL_VITAL_RR_WARN_LOW | 10 | SPEC §3.1 |
| `vital_rr_warn_high` | CLINICAL_VITAL_RR_WARN_HIGH | 24 | SPEC §3.1 |
| `vital_rr_crit_low` | CLINICAL_VITAL_RR_CRIT_LOW | 8 | SPEC §3.1 |
| `vital_rr_crit_high` | CLINICAL_VITAL_RR_CRIT_HIGH | 30 | SPEC §3.1 |
| `vital_bs_warn_low` | CLINICAL_VITAL_BS_WARN_LOW | 70 | SPEC §3.1 |
| `vital_bs_warn_high` | CLINICAL_VITAL_BS_WARN_HIGH | 250 | SPEC §3.1 |
| `vital_bs_crit_low` | CLINICAL_VITAL_BS_CRIT_LOW | 54 | SPEC §3.1 |
| `vital_bs_crit_high` | CLINICAL_VITAL_BS_CRIT_HIGH | 400 | SPEC §3.1 |

Existing aliases `CLINICAL_HR_MIN`, `CLINICAL_HR_MAX`, `CLINICAL_SBP_MIN` are retained as-is (they represent the critical-low/high tiers for HR and SBP).

A `get_vital_thresholds(parameter: str)` method analogous to `get_lab_thresholds` MUST be added to `ClinicalConfig`.

### 3.3 Clinical Protocol Engine

- **FR-010**: `GET /api/v1/protocols` returns a static in-memory list of supported protocol names + descriptions. No DB hit.
- **FR-011**: `POST /api/v1/protocols/evaluate` accepts `{protocol, patient_id, values}`. `patient_id` is required for AKI baseline lookup; optional for others (present but unused).
- **FR-012**: **Hyperkalemia** — implements SPEC §4.1 tier table verbatim. Tiers: moderate (5.5–5.9), severe (6.0–6.4, no ECG changes), emergency-ECG (6.0–6.4, ECG changes), emergency-high (≥6.5). All 6 SPEC §4.1 test cases are committed as pytest `@parametrize` cases.
- **FR-013**: **AKI staging** — implements SPEC §4.2 KDIGO criteria. Baseline = earliest `LabResult(test_name='Creatinine')` for `patient_id` within the 48 hours preceding `values.recorded_at` (defaults to UTC now). Delta = `creatinine_current − baseline`. Ratio = `creatinine_current / baseline`. Stages: 1 (delta ≥ 0.3 or ratio 1.5–1.9×), 2 (ratio 2.0–2.9×), 3 (ratio ≥ 3× OR value ≥ 4.0). If no baseline found → `severity=insufficient_data`. All 5 SPEC §4.2 test cases pass.
- **FR-014**: **DKA** — implements SPEC §4.4 severity tiers: mild (pH 7.25–7.30 / HCO3 15–18), moderate (pH 7.00–7.24 / HCO3 10–14), severe (pH < 7.00 / HCO3 < 10). Management pathway per tier. Input values: `{blood_sugar, ph, hco3, mental_status}`.
- **FR-015**: Every recommendation object MUST include a non-empty `source` citation string (Principle IX).
- **FR-016**: All protocol computation is offline — zero external calls.
- **FR-017**: Every successful evaluation writes one `shadow_events` row: `event_type="protocol_evaluation"`, `ho_user_id`=authenticated user UUID, `payload={"protocol": str, "severity": str, "actions_count": int}` (no PHI), `divergence_score=null`, `shift_id=null`.

### 3.4 Router Allowlist & Safety Update

- **FR-018**: CI gate `scripts/ci/check_router_allowlist.sh` MUST permit `alerts.py` and `protocols.py`. Any other file still fails.
- **FR-019**: `CLINICAL_SAFETY.md` STATUS header changes from `INERT` to `BINDING (Phase 1 onward)`. P1b binding rules added: (a) all protocol dosing is sourced from deterministic tables — no LLM decides doses; (b) every protocol action includes a `source` citation; (c) MedGemma advisory-only boundary stated.

---

## 4. API Contracts

**Base URL**: `/api/v1` | **Auth**: Bearer JWT on all endpoints.

### 4.1 GET /patients/{patient_id}/alerts

**Query params**: `alert_type` (`critical`|`warning`), `acknowledged` (`true`|`false`), `page` (default 1), `limit` (default 20, max 100).

**Success `200`**:
```json
{
  "alerts": [{
    "id": "uuid",
    "patient_id": "uuid",
    "alert_type": "critical",
    "trigger_source": "lab",
    "trigger_parameter": "K+",
    "trigger_value": 6.2,
    "message": "K+ 6.2 mEq/L — Critical hyperkalemia.",
    "protocol_link": "/api/v1/protocols/evaluate?protocol=hyperkalemia",
    "acknowledged": false,
    "acknowledged_by": null,
    "acknowledged_at": null,
    "created_at": "2026-02-16T15:01:00Z"
  }],
  "page": 1, "limit": 20, "total_pages": 1
}
```
**Errors**: `401`, `404 patient_not_found`.

### 4.2 POST /alerts/{alert_id}/acknowledge

**Request**: empty body.
**Success `200`**: `{ "acknowledged": true, "acknowledged_by": "uuid", "acknowledged_at": "<utc-iso>" }`.
**Errors**: `401`, `404 alert_not_found`, `409 already_acknowledged`.

### 4.3 GET /protocols

**Success `200`**:
```json
{
  "protocols": [
    {"name": "hyperkalemia", "description": "Hyperkalemia management (AHA 2023 / KDIGO 2023)"},
    {"name": "aki_staging",  "description": "AKI staging by KDIGO 2023 creatinine criteria"},
    {"name": "dka",          "description": "Diabetic Ketoacidosis severity and management"}
  ]
}
```

### 4.4 POST /protocols/evaluate

**Request (hyperkalemia)**:
```json
{ "protocol": "hyperkalemia", "patient_id": "uuid",
  "values": { "potassium": 6.2, "ecg_changes": false } }
```
**Request (aki_staging)**: `"values": { "creatinine_current": 1.4 }` (baseline fetched from DB by `patient_id`).
**Request (dka)**: `"values": { "blood_sugar": 340, "ph": 7.22, "hco3": 12, "mental_status": "alert" }`.

**Success `200`**:
```json
{
  "protocol": "hyperkalemia",
  "severity": "severe",
  "recommendations": [
    { "action": "IV Calcium Gluconate 10% 10ml over 10 minutes",
      "priority": 1,
      "rationale": "Cardiac membrane stabilization — K+ > 6.0",
      "source": "AHA 2023 Hyperkalemia Guidelines" }
  ],
  "escalation": null,
  "alert_generated": true
}
```
**Errors**: `400 protocol_not_found`, `400 missing_required_value`, `401`, `404 patient_not_found`.

**Error envelope**: `{ "error": "error_code", "message": "Human-readable description" }`.

---

## 5. Data Models

### 5.1 Alert

| Field | Type | Required | Constraints | Default |
|---|---|---|---|---|
| `id` | UUID v4 | Auto | PK | System-generated |
| `patient_id` | UUID FK → patients.id | Yes | CASCADE delete | — |
| `alert_type` | Enum | Yes | `critical`, `warning` | — |
| `trigger_source` | Enum | Yes | `vital`, `lab`, `protocol` | — |
| `trigger_parameter` | String(50) | Yes | e.g. `heart_rate`, `K+` | — |
| `trigger_value` | Float | Yes | Numeric value that fired the alert | — |
| `message` | String(500) | Yes | De-identified human-readable text | — |
| `protocol_link` | String(200) | No | URL fragment to evaluate endpoint | `null` |
| `acknowledged` | Boolean | Auto | — | `false` |
| `acknowledged_by` | UUID FK → users.id | No | SET NULL on user delete | `null` |
| `acknowledged_at` | DateTime | No | UTC | `null` |
| `created_at` | DateTime | Auto | UTC | System timestamp |

**Migration**: `api/alembic/versions/0006_alerts.py` (hand-written, reversible downgrade).

### 5.2 shadow_events (existing schema, first writer in P1b)

Schema defined in migration `0002_shadow_events.py`. P1b writes:

| Column | Value |
|---|---|
| `event_type` | `"protocol_evaluation"` |
| `ho_user_id` | authenticated user UUID |
| `payload` (JSONB) | `{"protocol": str, "severity": str, "actions_count": int}` |
| `divergence_score` | `null` |
| `shift_id` | `null` |

---

## 6. Non-Functional Requirements

- **NFR-001**: Alert `message` and `shadow_events.payload` MUST contain no patient name, bed number, or direct identifier. All structlog calls on new endpoints pass through `RedactingProcessor`.
- **NFR-002**: Alert write is atomic with the triggering vitals/labs insert (same `AsyncSession` transaction). Partial writes are impossible.
- **NFR-003**: Protocol evaluation is a pure-function pipeline: no async DB call during computation except AKI baseline lookup. P95 latency < 50ms.
- **NFR-004**: Alembic migration `0006_alerts.py` is hand-written with working `downgrade()`.
- **NFR-005**: `mypy --strict` MUST pass on `alert_service.py`, `alert_router.py`, `protocols/`, `alert_model.py`.
- **NFR-006**: All SPEC §4 test cases committed as `@pytest.mark.parametrize` cases — 6 hyperkalemia + 5 AKI + ≥ 3 DKA (mild/moderate/severe).
- **NFR-007**: CI router allowlist updated to include `alerts.py`, `protocols.py`; gate still fails on any other file.
- **NFR-008**: `GET /patients/:id/alerts` with no records returns `200 { "alerts": [] }`, not `404`.

---

## 7. Review Checklist

- [ ] Alert ORM model + Alembic migration 0006 created; `downgrade()` tested.
- [ ] Alert auto-created on vitals threshold crossing (sourced from clinical_config.py).
- [ ] Alert auto-created on lab `is_critical=true`; no duplicate threshold logic.
- [ ] `clinical_config.py` extended with all P1b vital thresholds; `get_vital_thresholds()` added.
- [ ] PHI absent from alert messages and `shadow_events` payload; redaction verified.
- [ ] Acknowledge endpoint: 200 on first call, 409 on double-ack, 404 on missing alert.
- [ ] All 3 protocols implemented; all SPEC §4 test cases pass as parametrized pytest.
- [ ] Every recommendation object has a non-empty `source` field.
- [ ] Every protocol evaluation writes to `shadow_events`; payload de-identified.
- [ ] `GET /protocols` has no DB dependency; returns static list offline.
- [ ] `CLINICAL_SAFETY.md` updated to BINDING status with P1b rules.
- [ ] CI router allowlist updated for `alerts.py`, `protocols.py`.
- [ ] `mypy --strict` clean on all new modules.
- [ ] Constitution Check: Principles I, II, III, IV, VI, IX, XI, XII, XIII, XIV aligned.

---

*Rule: Code that contradicts this spec is a bug. Spec that contradicts user needs is a spec revision.*
