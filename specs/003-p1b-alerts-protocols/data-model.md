# Data Model: P1b — Alert Engine + Clinical Protocols

**Feature**: `003-p1b-alerts-protocols`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Constitution**: `.specify/memory/constitution.md` v0.2.0

---

## Entity: Alert

**Table**: `alerts`

| Column | SQLAlchemy Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID PK | No | `gen_random_uuid()` | Immutable |
| `patient_id` | UUID FK → patients.id | No | — | CASCADE on patient delete |
| `alert_type` | Enum('critical','warning') | No | — | — |
| `trigger_source` | Enum('vital','lab','protocol') | No | — | — |
| `trigger_parameter` | String(50) | No | — | e.g. `heart_rate`, `K+` |
| `trigger_value` | Float | No | — | Numeric value that fired the alert |
| `message` | String(500) | No | — | De-identified; no patient name |
| `protocol_link` | String(200) | Yes | NULL | URL fragment to evaluate endpoint |
| `acknowledged` | Boolean | No | `false` | — |
| `acknowledged_by` | UUID FK → users.id | Yes | NULL | SET NULL on user delete |
| `acknowledged_at` | DateTime(timezone=True) | Yes | NULL | UTC |
| `created_at` | DateTime(timezone=True) | No | `now()` | UTC; server-side default |

**Indexes**:
- `ix_alerts_patient_id_created_at` on `(patient_id, created_at DESC)` — GET /patients/{id}/alerts pagination
- `ix_alerts_patient_id_acknowledged` on `(patient_id, acknowledged)` — `?acknowledged=false` filter

**Constraints**:
- `FK alerts.patient_id → patients.id ON DELETE CASCADE`
- `FK alerts.acknowledged_by → users.id ON DELETE SET NULL`
- No composite unique constraint — multiple alerts per patient per recording are allowed

**Migration**: `api/alembic/versions/0006_alerts.py` — hand-written; `downgrade()` drops both indexes, then drops the table.

---

## Existing Entity: shadow_events (first writer in P1b)

Schema unchanged from migration `0002_shadow_events.py`. P1b is the first producer.

| Column | P1b Value |
|---|---|
| `id` | `gen_random_uuid()` |
| `event_type` | `"protocol_evaluation"` |
| `ho_user_id` | authenticated user UUID (from JWT `sub`) |
| `payload` (JSONB) | `{"protocol": "<str>", "severity": "<str>", "actions_count": <int>}` |
| `divergence_score` | NULL (no HO ground-truth available in P1b) |
| `shift_id` | NULL (shift entity deferred to P2+) |
| `created_at` | `now()` UTC |

**Payload PHI guarantee**: payload contains zero direct identifiers — no `patient_id`, name, bed number, or raw clinical values. The shadow_events purpose is divergence tracking, not clinical audit.

---

## ORM Model Sketch: Alert

```python
class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(_UUIDString(), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        _UUIDString(), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String(10), nullable=False)
    trigger_source: Mapped[str] = mapped_column(String(10), nullable=False)
    trigger_parameter: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_value: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    protocol_link: Mapped[str | None] = mapped_column(String(200), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(
        _UUIDString(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

Enum values for `alert_type` and `trigger_source` are enforced at the Pydantic schema layer; no PostgreSQL enum type (simpler migration rollback).

---

## clinical_config.py Extensions

New model added alongside existing `LabThreshold`:

```python
class VitalThreshold(BaseModel):
    warn_low: float | None = None
    warn_high: float | None = None
    crit_low: float | None = None
    crit_high: float | None = None
```

21 new `ClinicalConfig` fields (all `float`, env-driven):

| Field | Env Alias | Default | SPEC §3.1 Tier |
|---|---|---|---|
| `vital_hr_warn_low` | `CLINICAL_VITAL_HR_WARN_LOW` | 50 | Warning low |
| `vital_hr_warn_high` | `CLINICAL_VITAL_HR_WARN_HIGH` | 110 | Warning high |
| `vital_sbp_warn_low` | `CLINICAL_VITAL_SBP_WARN_LOW` | 100 | Warning low |
| `vital_sbp_warn_high` | `CLINICAL_VITAL_SBP_WARN_HIGH` | 160 | Warning high |
| `vital_sbp_crit_high` | `CLINICAL_VITAL_SBP_CRIT_HIGH` | 180 | Critical high |
| `vital_dbp_warn_high` | `CLINICAL_VITAL_DBP_WARN_HIGH` | 100 | Warning high |
| `vital_dbp_crit_high` | `CLINICAL_VITAL_DBP_CRIT_HIGH` | 110 | Critical high |
| `vital_temp_warn_low` | `CLINICAL_VITAL_TEMP_WARN_LOW` | 36.0 | Warning low |
| `vital_temp_warn_high` | `CLINICAL_VITAL_TEMP_WARN_HIGH` | 38.0 | Warning high |
| `vital_temp_crit_low` | `CLINICAL_VITAL_TEMP_CRIT_LOW` | 35.0 | Critical low |
| `vital_temp_crit_high` | `CLINICAL_VITAL_TEMP_CRIT_HIGH` | 39.5 | Critical high |
| `vital_spo2_warn_low` | `CLINICAL_VITAL_SPO2_WARN_LOW` | 94 | Warning low |
| `vital_spo2_crit_low` | `CLINICAL_VITAL_SPO2_CRIT_LOW` | 90 | Critical low |
| `vital_rr_warn_low` | `CLINICAL_VITAL_RR_WARN_LOW` | 10 | Warning low |
| `vital_rr_warn_high` | `CLINICAL_VITAL_RR_WARN_HIGH` | 24 | Warning high |
| `vital_rr_crit_low` | `CLINICAL_VITAL_RR_CRIT_LOW` | 8 | Critical low |
| `vital_rr_crit_high` | `CLINICAL_VITAL_RR_CRIT_HIGH` | 30 | Critical high |
| `vital_bs_warn_low` | `CLINICAL_VITAL_BS_WARN_LOW` | 70 | Warning low |
| `vital_bs_warn_high` | `CLINICAL_VITAL_BS_WARN_HIGH` | 250 | Warning high |
| `vital_bs_crit_low` | `CLINICAL_VITAL_BS_CRIT_LOW` | 54 | Critical low |
| `vital_bs_crit_high` | `CLINICAL_VITAL_BS_CRIT_HIGH` | 400 | Critical high |

**Critical-tier mapping for existing fields**: `hr_min`/`CLINICAL_HR_MIN` = HR critical low (40); `hr_max`/`CLINICAL_HR_MAX` = HR critical high (130); `sbp_min`/`CLINICAL_SBP_MIN` = SBP critical low (90). These aliases are unchanged. `get_vital_thresholds("heart_rate")` exposes both existing and new fields via one `VitalThreshold` object.

---

## Protocol: No Persistent Data Model

Protocols are stateless pure functions (AKI reads from existing `lab_results`). No new tables.

---

## Migration Sequence

| Rev ID | Table | Phase |
|---|---|---|
| `0001_users` | users | P0 |
| `0002_shadow_events` | shadow_events | P0 (MEP hinge) |
| `0003_patients` | patients | P1a |
| `0004_vital_signs` | vital_signs | P1a |
| `0005_lab_results` | lab_results | P1a |
| `0006_alerts` | **alerts** | **P1b** |
