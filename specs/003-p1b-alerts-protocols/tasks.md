# Tasks: P1b — Alert Engine + Clinical Protocols

**Feature**: `003-p1b-alerts-protocols`
**Input**: `specs/003-p1b-alerts-protocols/` (spec.md, plan.md, data-model.md, contracts/openapi.yaml)
**Numbering**: Continues from P1a — first task T096
**Constitution**: `.specify/memory/constitution.md` v0.2.0
**TDD**: Red → Green → Refactor mandatory on all clinical + security paths (Principle II)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US1]**: HO Sees Alert After Critical Vitals (P1)
- **[US2]**: HO Sees Alert After Critical Lab (P1)
- **[US3]**: HO Evaluates Hyperkalemia Protocol (P2)
- **[US4]**: Shadow Event Written Per Protocol Evaluation (P3)

---

## Phase 1: Setup — Scope Guard Amendment (Principle III / FR-018)

**Purpose**: Extend the P1a router allowlist to permit `alerts.py` and `protocols.py` before any implementation files land. The CI gate must reject any other router file.

- [ ] T096 **RED** — Update `api/tests/integration/test_router_allowlist.py`: change expected allowlist from `{__init__.py, health.py, auth.py, patients.py, vitals.py, labs.py}` to also include `alerts.py` and `protocols.py`. Confirm test fails because neither file exists yet. **Acceptance**: `pytest api/tests/integration/test_router_allowlist.py` fails with file-set mismatch.

- [ ] T097 **GREEN** — Create bare stub `api/app/routers/alerts.py` (`APIRouter(prefix="/alerts", tags=["alerts"])`, no routes) and `api/app/routers/protocols.py` (`APIRouter(prefix="/protocols", tags=["protocols"])`, no routes); amend `scripts/ci/check_router_allowlist.sh` adding `! -name 'alerts.py' ! -name 'protocols.py'` per `plan.md §Scope Guard Amendment`; wire both routers into `api/app/main.py` under `/api/v1`. **Acceptance**: T096 passes; `bash scripts/ci/check_router_allowlist.sh` exits 0 on clean tree.

---

## Phase 2: Foundational — Config Extension + Alert ORM + Schemas

**Purpose**: Foundational building blocks shared by all user stories. No story phase can proceed until this phase is complete.

**⚠️ CRITICAL**: US1, US2, US3, US4 all depend on this phase completing first.

- [ ] T098 **RED** — `api/tests/unit/test_vital_thresholds.py` (import guard): import `get_vital_thresholds` and `VitalThreshold` from `api/app/core/clinical_config`; assert `get_vital_thresholds("heart_rate")` raises `ImportError` or `AttributeError` (method missing). Also assert calling `get_vital_thresholds("gcs")` will return `None` (deferred parameter). **Acceptance**: `pytest api/tests/unit/test_vital_thresholds.py` fails (method/model not yet defined).

- [ ] T099 **GREEN** — Extend `api/app/core/clinical_config.py`: add `VitalThreshold` Pydantic v2 model (`warn_low: float | None`, `warn_high: float | None`, `crit_low: float | None`, `crit_high: float | None`); add all 21 env-driven `float` fields from `data-model.md §clinical_config.py Extensions` table with defaults as specified (e.g. `vital_hr_warn_low: float = Field(50, alias="CLINICAL_VITAL_HR_WARN_LOW")`); add `get_vital_thresholds(parameter: str) -> VitalThreshold | None` that returns a populated `VitalThreshold` for the 7 supported parameters (`heart_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `spo2`, `respiratory_rate`, `blood_sugar`) and `None` for all others. Existing `hr_min`/`hr_max`/`sbp_min` alias fields map into `VitalThreshold.crit_low`/`crit_high` within the method. Update `api/.env.example` with all 21 new `CLINICAL_VITAL_*` keys. **Acceptance**: T098 passes; `grep -rn "CLINICAL_VITAL_" api/.env.example | wc -l` returns 21.

- [ ] T100 **RED** — `api/tests/integration/test_alert_orm.py`: using the async test session, attempt to import `Alert` from `api/app/models/alert`; attempt `db.add(Alert(patient_id=fixture_patient.id, alert_type="critical", trigger_source="vital", trigger_parameter="heart_rate", trigger_value=135.0, message="heart_rate 135 bpm — Critical tachycardia."))` and `await db.commit()`; assert the resulting `Alert` row has a UUID `id`, `acknowledged=False`, `acknowledged_by=None`, `created_at` timezone-aware. Also assert `alembic downgrade 0005` → table absent; `alembic upgrade head` → table present again. **Acceptance**: fails until T101 (ORM + migration missing).

- [ ] T101 **GREEN** — Create `api/app/models/alert.py` with `Alert` ORM using `Mapped[]` annotations verbatim from `data-model.md §ORM Model Sketch`; use `_UUIDString()` consistent with P1a models; set `server_default="false"` on `acknowledged`; set `server_default=func.now()` on `created_at`. Hand-write `api/alembic/versions/0006_alerts.py`: `upgrade()` creates `alerts` table + index `ix_alerts_patient_id_created_at` on `(patient_id, created_at DESC)` + index `ix_alerts_patient_id_acknowledged` on `(patient_id, acknowledged)` + FK `alerts.patient_id → patients.id ON DELETE CASCADE` + FK `alerts.acknowledged_by → users.id ON DELETE SET NULL`; `downgrade()` drops both indexes then drops the table. Register `Alert` in `api/app/models/db.py` metadata. **Acceptance**: T100 passes; `alembic downgrade base && alembic upgrade head` round-trips cleanly; `mypy --strict api/app/models/alert.py` clean.

- [ ] T102 [P] **RED** — `api/tests/contract/test_alert_engine.py` (schema import guard): assert `from api/app/schemas/alerts import AlertRead, AlertListResponse, AcknowledgeResponse` raises `ImportError`. `api/tests/contract/test_protocols.py` (schema import guard): assert `from api/app/schemas/protocols import ProtocolEvaluateRequest, ProtocolEvaluateResponse, Recommendation` raises `ImportError`. **Acceptance**: both test files fail with `ImportError`.

- [ ] T103 [P] **GREEN** — Create `api/app/schemas/alerts.py`: `AlertRead` (all 12 fields from `openapi.yaml #/components/schemas/Alert`; enums `alert_type: Literal["critical","warning"]`, `trigger_source: Literal["vital","lab","protocol"]`; `model_config = ConfigDict(from_attributes=True)`), `AlertListResponse` (alerts list + page/limit/total_pages), `AcknowledgeResponse` (acknowledged/acknowledged_by/acknowledged_at). Create `api/app/schemas/protocols.py`: `Recommendation` (action/priority/rationale/source — source `min_length=1` enforced per Principle IX), `ProtocolEvaluateRequest` (protocol enum `["hyperkalemia","aki_staging","dka"]`, patient_id UUID, values dict), `ProtocolEvaluateResponse` (protocol/severity/recommendations/escalation/alert_generated). Reuse `ErrorResponse` from P1a schemas (do not duplicate). **Acceptance**: T102 passes; `mypy --strict api/app/schemas/alerts.py api/app/schemas/protocols.py` clean.

**Checkpoint**: Alert ORM + migration + schemas ready — US1/US2/US3/US4 phases can now proceed.

---

## Phase 3: User Stories 1 + 2 — Alert Engine (Priority: P1) 🎯 MVP

**Goal**: Critical vitals and labs auto-create Alert records atomically. Alerts are listable and acknowledgeable.

**Independent Test**: `POST /vitals heart_rate=135` → 201 + Alert row in DB unacknowledged; `GET /patients/:id/alerts` returns it; `POST /alerts/:id/acknowledge` → 200; repeat → 409.

### Tests for US1/US2

- [ ] T104 [US1] **RED** — `api/tests/unit/test_vital_thresholds.py` (full boundary suite): import `evaluate_vital_thresholds` from `api/app/services/alert_service`; parametrize: `heart_rate=135` → `[AlertCreate(alert_type="critical")]`; `heart_rate=55` → `[AlertCreate(alert_type="warning")]`; `heart_rate=80` → `[]`; `spo2=91` → `[AlertCreate(alert_type="warning")]`; `spo2=89` → `[AlertCreate(alert_type="critical")]`; `temperature=39.6` → `[AlertCreate(alert_type="critical")]`; `systolic_bp=181` → `[AlertCreate(alert_type="critical")]`; all using env-default `ClinicalConfig`. Confirm function returns at most one alert per parameter (highest severity wins). **Acceptance**: `pytest api/tests/unit/test_vital_thresholds.py -k "evaluate"` fails (function missing).

- [ ] T105 [US1] **GREEN** — `api/app/services/alert_service.py`: implement `evaluate_vital_thresholds(vitals: VitalSigns, config: ClinicalConfig) -> list[AlertCreate]` — pure function, no DB call. For each of the 7 supported parameters check `crit_high`, `crit_low`, `warn_high`, `warn_low` from `get_vital_thresholds(parameter)`; when a field is not `None` and the value crosses it, emit one `AlertCreate` at the highest applicable tier. Zero threshold literals — all values sourced from `config`. **Acceptance**: T104 passes; `grep -rn "[0-9]\.[0-9]" api/app/services/alert_service.py` returns 0 threshold literals.

- [ ] T106 [P] [US2] **RED** — `api/tests/unit/test_vital_thresholds.py` (build_lab_alert unit): import `build_lab_alert` from `api/app/services/alert_service`; assert: K+ `is_critical=True` → `AlertCreate` with `trigger_source="lab"`, `protocol_link="/api/v1/protocols/evaluate?protocol=hyperkalemia"`, `alert_type="critical"`; K+ `is_critical=False` → `None`; Creatinine `is_critical=True` → `AlertCreate` with `protocol_link` containing `aki_staging`; `test_name="Troponin"` `is_critical=True` → `AlertCreate` with `protocol_link=None`. **Acceptance**: fails (function missing).

- [ ] T107 [P] [US2] **GREEN** — `api/app/services/alert_service.py`: implement `build_lab_alert(lab: LabResult, config: ClinicalConfig) -> AlertCreate | None` — returns `None` when `lab.is_critical=False`; builds `AlertCreate` with `trigger_source="lab"`, `protocol_link` set when `test_name` maps to a supported protocol per FR-007 (`K+`→hyperkalemia, `Creatinine`→aki_staging, `Blood Sugar`→dka), `None` otherwise. **Acceptance**: T106 passes; `mypy --strict api/app/services/alert_service.py` clean.

- [ ] T108 [US1] [US2] **RED** — `api/tests/contract/test_alert_engine.py` (Story 1+2 integration): (a) `POST /api/v1/patients/{id}/vitals` `heart_rate=135` → 201 + one `alerts` row in DB with `alert_type="critical"`, `trigger_parameter="heart_rate"`, `trigger_value=135.0`, `acknowledged=False`; (b) `POST /api/v1/patients/{id}/vitals` `heart_rate=80` → 201 + zero new `alerts` rows; (c) `POST /api/v1/patients/{id}/labs` K+=6.2 (is_critical=True) → 201 + one `alerts` row with `trigger_source="lab"`, `protocol_link` containing `hyperkalemia`; (d) rollback test: inject `AsyncSession` that raises `SQLAlchemyError` during `db.add(Alert(...))` → assert vitals row also absent from DB. **Acceptance**: all 4 cases fail until T109.

- [ ] T109 [US1] [US2] **GREEN** — `api/app/services/alert_service.py`: implement `create_vitals_with_alerts(patient_id, payload, db)` (flush vitals → evaluate_vital_thresholds → add alert rows → commit → refresh) and `create_lab_with_alerts(patient_id, payload, db)` (compute_is_critical → flush lab → build_lab_alert → add alert row if non-None → commit → refresh). Update `api/app/routers/vitals.py` to import and call `create_vitals_with_alerts` instead of `vitals_service.create_vitals`. Update `api/app/routers/labs.py` to import and call `create_lab_with_alerts` instead of `lab_service.create_lab`. P1a service functions (`create_vitals`, `create_lab`) remain **unchanged**. **Acceptance**: T108 passes; `mypy --strict api/app/services/alert_service.py` clean.

- [ ] T110 [US1] **RED** — `api/tests/contract/test_alert_management.py`: (a) `GET /api/v1/patients/{id}/alerts` with no alerts → `200 {"alerts":[],"page":1,"limit":20,"total_pages":0}` (never 404); (b) create 2 critical + 1 warning alert → `GET ?alert_type=critical` returns 2, `?alert_type=warning` returns 1; (c) `GET ?acknowledged=false` returns all unacknowledged; (d) `POST /api/v1/alerts/{id}/acknowledge` → `200 {"acknowledged":true, "acknowledged_by":"<uuid>", "acknowledged_at":"<utc-iso>"}`; (e) repeat POST → `409 {"error":"already_acknowledged"}`; (f) `POST /api/v1/alerts/nonexistent-uuid/acknowledge` → `404 {"error":"alert_not_found"}`; (g) unauthenticated GET → 401. **Acceptance**: all 7 cases fail until T111.

- [ ] T111 [US1] **GREEN** — `api/app/routers/alerts.py`: implement `GET /patients/{patient_id}/alerts` (verify patient exists via `get_patient_or_404`; paginate with `PaginationParams`; filter by `alert_type` and `acknowledged` query params; return `AlertListResponse`) and `POST /alerts/{alert_id}/acknowledge` (set `acknowledged=True`, `acknowledged_by=current_user.id`, `acknowledged_at=utcnow()`; 409 if already acknowledged; 404 if missing). `api/app/services/alert_service.py`: implement `list_alerts(patient_id, alert_type, acknowledged, pagination, db) -> AlertListResponse` and `acknowledge_alert(alert_id, user_id, db) -> AcknowledgeResponse`. Extract `get_alert_or_404` as a FastAPI dependency. **Acceptance**: T110 passes; `mypy --strict api/app/routers/alerts.py` clean.

- [ ] T112 [P] **Regression** — Run full P1a contract test suite to confirm no regressions from the coordinator swap: `pytest api/tests/contract/test_vitals.py api/tests/contract/test_labs.py api/tests/contract/test_patients_crud.py api/tests/contract/test_discharge.py -q`. **Acceptance**: all P1a contract tests pass; no previously-green test turns red.

**Checkpoint**: US1 + US2 complete — critical vitals/labs auto-create alerts; management endpoints functional.

---

## Phase 4: User Story 3 — Protocol Evaluators (Priority: P2)

**Goal**: Three deterministic offline clinical protocols (Hyperkalemia, DKA, AKI) are evaluable via `POST /protocols/evaluate`. All 14 SPEC §4 test cases committed as `@pytest.mark.parametrize`.

**Independent Test**: `POST /protocols/evaluate` with `{protocol:"hyperkalemia", patient_id:"<uuid>", values:{potassium:6.2, ecg_changes:false}}` → `200 {"severity":"severe", "recommendations":[...], "alert_generated":true}`.

### Tests + Implementation for US3

- [ ] T113 [P] [US3] **RED** — `api/tests/unit/test_hyperkalemia.py`: all 6 SPEC §4.1 `@pytest.mark.parametrize` cases: (1) K+=5.0 → `severity="normal"`; (2) K+=5.6 → `severity="moderate"`, recommendations include Kayexalate; (3) K+=6.2, ecg_changes=False → `severity="severe"`, priority-1 action is Calcium Gluconate; (4) K+=6.2, ecg_changes=True → `severity="emergency_ecg"`, escalation non-None; (5) K+=6.7 → `severity="emergency"`, escalation contains "CALL SENIOR"; (6) K+=3.0 → `severity="normal"`, empty recommendations. Assert every non-empty recommendation has non-empty `source` (Principle IX). **Acceptance**: all 6 cases fail (module missing).

- [ ] T114 [P] [US3] **GREEN** — `api/app/protocols/__init__.py` (empty); `api/app/protocols/hyperkalemia.py`: implement `evaluate(potassium: float, ecg_changes: bool = False) -> ProtocolResult` with tier table verbatim from `plan.md §Protocol Architecture` (constants in module — KDIGO/AHA guidelines, not config-driven). `ProtocolResult` dataclass (`severity: str`, `recommendations: list[Recommendation]`, `escalation: str | None`, `alert_generated: bool`). `alert_generated = severity not in ("normal", "insufficient_data")`. Every `Recommendation` has non-empty `source = "AHA 2023 Hyperkalemia Guidelines"`. **Acceptance**: T113 passes; zero env/config reads in `hyperkalemia.py`.

- [ ] T115 [P] [US3] **RED** — `api/tests/unit/test_dka.py`: ≥3 `@pytest.mark.parametrize` cases per SPEC §4.4: (1) mild (`ph=7.27, hco3=16, blood_sugar=300, mental_status="alert"`) → `severity="mild"`; (2) moderate (`ph=7.15, hco3=12`) → `severity="moderate"`; (3) severe (`ph=6.95, hco3=8`) → `severity="severe"`, escalation non-None; (4) `ph=7.35` (outside DKA range) → `severity="normal"`. All non-empty recommendations have non-empty `source`. **Acceptance**: all cases fail (module missing).

- [ ] T116 [P] [US3] **GREEN** — `api/app/protocols/dka.py`: implement `evaluate(blood_sugar: float, ph: float, hco3: float, mental_status: str) -> ProtocolResult` with DKA severity tiers per SPEC §4.4: mild (pH 7.25–7.30 / HCO3 15–18), moderate (pH 7.00–7.24 / HCO3 10–14), severe (pH < 7.00 / HCO3 < 10). Management pathway per tier. `source` citations reference DKA management guidelines. **Acceptance**: T115 passes; `mypy --strict api/app/protocols/dka.py` clean.

- [ ] T117 [US3] **RED** — `api/tests/unit/test_aki_staging.py`: 5 `@pytest.mark.parametrize` cases per SPEC §4.2 KDIGO criteria (fixture inserts a baseline Creatinine row at `now - 24h`): (1) `creatinine_current=1.0`, baseline=0.8 → delta=0.2 (< 0.3), ratio=1.25× → `severity="normal"`; (2) `creatinine_current=1.2`, baseline=0.8 → delta=0.4 (≥ 0.3) → `severity="stage_1"`; (3) `creatinine_current=1.3`, baseline=0.8 → ratio=1.625× → `severity="stage_1"`; (4) `creatinine_current=1.8`, baseline=0.8 → ratio=2.25× → `severity="stage_2"`; (5) no baseline row within 48h → `severity="insufficient_data"`. All non-insufficient results have recommendations with non-empty `source`. **Acceptance**: all 5 fail (module missing).

- [ ] T118 [US3] **GREEN** — `api/app/protocols/aki_staging.py`: implement `async def evaluate(creatinine_current: float, patient_id: uuid.UUID, recorded_at: datetime, db: AsyncSession) -> ProtocolResult` — one `SELECT MIN(id) ... WHERE test_name='Creatinine' AND patient_id=? AND recorded_at >= (recorded_at - interval '48 hours')` query; delta/ratio computation per SPEC §4.2; returns `severity="insufficient_data"` with empty recommendations when no baseline found. `source = "KDIGO 2023 AKI Clinical Practice Guidelines"`. **Acceptance**: T117 passes; `mypy --strict api/app/protocols/aki_staging.py` clean.

- [ ] T119 [US3] **RED** — `api/tests/contract/test_protocols.py`: (a) `GET /api/v1/protocols` → `200 {"protocols":[{"name":"hyperkalemia",...},{"name":"aki_staging",...},{"name":"dka",...}]}` (static list, no DB hit); (b) `POST /api/v1/protocols/evaluate` `{protocol:"unknown_protocol",...}` → `400 {"error":"protocol_not_found"}`; (c) `POST` hyperkalemia with `potassium=6.2, ecg_changes=false` → `200 severity="severe"`, priority-1 recommendation action includes "Calcium Gluconate"; (d) `POST` aki_staging for a patient with no prior Creatinine → `200 severity="insufficient_data"`, `alert_generated=false`; (e) unauthenticated → 401. **Acceptance**: all 5 cases fail until T120.

- [ ] T120 [US3] **GREEN** — `api/app/routers/protocols.py`: implement `GET /protocols` (returns static `PROTOCOL_LIST` constant, no `db` dep, works fully offline) and `POST /protocols/evaluate` (dispatch on `request.protocol`: call `hyperkalemia.evaluate`, `dka.evaluate` synchronously; `aki_staging.evaluate` with `await`; catch `KeyError`/`ValueError` and return `400 protocol_not_found` or `400 missing_required_value`; verify patient exists for AKI via `get_patient_or_404`). Return `ProtocolEvaluateResponse` constructed from `ProtocolResult`. **Acceptance**: T119 passes; `mypy --strict api/app/routers/protocols.py` clean.

**Checkpoint**: US3 complete — all 3 protocols evaluable offline, 14 parametrized test cases green.

---

## Phase 5: User Story 4 — Shadow Events (Priority: P3)

**Goal**: Every protocol evaluation writes one de-identified row to `shadow_events`, activating the P0 MEP hinge.

**Independent Test**: `POST /protocols/evaluate` (any protocol) → `shadow_events` table has one new row; `payload` keys are exactly `{protocol, severity, actions_count}`; `patient_id` is NOT in the payload.

### Tests + Implementation for US4

- [ ] T121 [US4] **RED** — `api/tests/integration/test_shadow_events.py`: (a) `POST /api/v1/protocols/evaluate` (hyperkalemia, K+=6.2) → assert one new row in `shadow_events` with `event_type="protocol_evaluation"`, `ho_user_id=current_user_uuid`, `divergence_score=None`, `shift_id=None`; (b) assert `payload` JSONB keys are exactly `{"protocol","severity","actions_count"}` — no `patient_id`, no raw clinical values; (c) DKA evaluate call → second row written; GET /protocols (no evaluate) → zero shadow_events rows added. **Acceptance**: all cases fail until T122.

- [ ] T122 [US4] **GREEN** — `api/app/services/shadow_event_service.py`: implement `async def record_protocol_evaluation(ho_user_id: uuid.UUID, protocol: str, severity: str, actions_count: int, db: AsyncSession) -> None` — constructs `ShadowEvent(event_type="protocol_evaluation", ho_user_id=ho_user_id, payload={"protocol":protocol,"severity":severity,"actions_count":actions_count}, divergence_score=None, shift_id=None)`; `db.add(event)` (does **not** call `db.commit()` — commit is owned by caller/router transaction). Wire call in `api/app/routers/protocols.py` POST handler after `ProtocolEvaluateResponse` is built, before returning. **Acceptance**: T121 passes; `mypy --strict api/app/services/shadow_event_service.py` clean.

---

## Phase 6: Polish + Cross-Cutting (NFR-001, NFR-005, FR-019)

**Purpose**: PHI redaction verification, type-safety sweep, and `CLINICAL_SAFETY.md` graduation.

- [ ] T123 [P] **RED** — `api/tests/integration/test_phi_redaction_p1b.py`: (a) `POST /api/v1/patients/{id}/vitals` `heart_rate=135` → capture structlog output → assert patient `name` and `bed_number` values do NOT appear in any log event (only `[REDACTED]`); (b) retrieve the created `Alert` from DB → assert `alert.message` does not contain patient name string; (c) `POST /api/v1/protocols/evaluate` → retrieve new `shadow_events` row → assert `payload` dict does not contain `patient_id` key or patient name. **Acceptance**: at least one assertion fails until T124 confirms redaction covers alert message field.

- [ ] T124 **GREEN** — Verify `api/app/core/logging.py` `REDACT_FIELDS` constant covers `name` and `bed_number` (confirmed P1a); verify `alert.message` construction in `alert_service.py` uses only `trigger_parameter` + `trigger_value` + severity text (no patient name, bed number — FR-006); add `message` to structlog redaction fields only if message field itself appears in log events. Confirm `shadow_event_service.py` payload dict is constructed from protocol-result fields only. **Acceptance**: T123 passes; `grep -rn "name\|bed_number" api/app/services/alert_service.py` returns zero matches outside comments.

- [ ] T125 [P] **mypy sweep** — Run `mypy --strict api/app/` targeting all new P1b modules: `alert_service.py`, `shadow_event_service.py`, `routers/alerts.py`, `routers/protocols.py`, `models/alert.py`, `schemas/alerts.py`, `schemas/protocols.py`, `protocols/hyperkalemia.py`, `protocols/dka.py`, `protocols/aki_staging.py`. Fix any type errors until all modules are clean. **Acceptance**: `mypy --strict api/app/services/alert_service.py api/app/services/shadow_event_service.py api/app/routers/alerts.py api/app/routers/protocols.py api/app/models/alert.py api/app/schemas/alerts.py api/app/schemas/protocols.py api/app/protocols/hyperkalemia.py api/app/protocols/dka.py api/app/protocols/aki_staging.py` exits 0.

- [ ] T126 **CLINICAL_SAFETY.md activation** — Update `CLINICAL_SAFETY.md` STATUS header from `INERT` to `BINDING (Phase 1 onward)`; add P1b binding rules per FR-019: (a) all protocol dosing is sourced from deterministic tier tables — no LLM decides doses; (b) every `Recommendation` object returned by any protocol evaluator MUST include a non-empty `source` citation; (c) MedGemma is advisory-only in all P2+ phases — it MUST NOT override a protocol result; (d) `CLINICAL_SAFETY.md` is now the authoritative safety surface referenced by all P2+ clinical tasks. **Acceptance**: file updated with `STATUS: BINDING (Phase 1 onward)` and all four rules present.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup / T096–T097)**: No dependencies — start immediately.
- **Phase 2 (Foundational / T098–T103)**: Depends on Phase 1 (scope guard must pass before any router files land). T102 and T103 are parallel to each other but both need T101.
- **Phase 3 (US1+US2 / T104–T112)**: Depends on Phase 2. T104/T106 and T105/T107 are parallel pairs; T108 needs T105 + T107; T109 needs T108; T110 needs T109; T112 is parallel once T109 lands.
- **Phase 4 (US3 / T113–T120)**: Depends on Phase 2. T113/T114 (hyperkalemia), T115/T116 (DKA), and T117/T118 (AKI) are three independent parallel tracks. T119 needs T114 + T116 + T118; T120 needs T119.
- **Phase 5 (US4 / T121–T122)**: Depends on T120 (protocol router must exist). T121 (RED) must fail before T122 (GREEN).
- **Phase 6 (Polish / T123–T126)**: Depends on Phase 5 completion. T123/T125 are parallel; T126 is independent throughout.

### Critical Path (sequential minimum)

```
T096 → T097 → T098 → T099 → T100 → T101 → T102/T103
  → T104 → T105 → T108 → T109 → T110 → T111
  → T113 → T114 → T119 → T120 → T121 → T122
  → T123 → T124 → T125 → T126
```

### Key Hard Dependencies

- **T105** depends on T099 (`get_vital_thresholds` must exist).
- **T108** depends on T105 + T107 (both pure-function evaluators must exist for the transaction coordinators).
- **T109** depends on T108 (coordinator GREEN needs contract test RED first).
- **T118** (AKI) depends on T101 (`lab_results` table must exist for baseline lookup fixture).
- **T122** (shadow_event_service) depends on T120 (protocol router must exist to wire the call).
- **T124** depends on T123 (PHI redaction GREEN needs the RED test assertions).

---

## Parallel Opportunities

**After T103 lands — three tracks in parallel**:
```
Track A (US1+2 alert engine): T104 → T105, T106 → T107 → T108 → T109 → T110 → T111
Track B (hyperkalemia):        T113 → T114
Track C (DKA):                 T115 → T116
```

**After T116 + T114 land**:
```
T117 → T118 → T119 → T120  (AKI + protocol router — blocks US4)
```

**After T109 lands**:
```
T112 (P1a regression) — parallel, any time after T109
```

**Final parallel**:
```
T123, T125 — parallel; both feed T124, T126
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Phase 1 (T096–T097): Scope guard
2. Phase 2 (T098–T103): Foundational
3. Phase 3, US1+US2 (T104–T112): Alert engine + management
4. **STOP and validate**: `pytest api/tests/contract/test_alert_engine.py api/tests/contract/test_alert_management.py` all green.
5. Deploy/demo: critical vitals/labs auto-create alerts; acknowledge workflow functional.

### Incremental Delivery

1. MVP (above) → Alert engine live
2. Add Phase 4 (T113–T120): Protocol evaluators → 14 clinical test cases green
3. Add Phase 5 (T121–T122): Shadow events → MEP hinge activated
4. Add Phase 6 (T123–T126): PHI + mypy sweep + CLINICAL_SAFETY.md → P1b complete

### Parallel Team Strategy

With two developers post-Phase 2:
- **Dev A**: US1+US2 alert engine (T104–T112)
- **Dev B**: US3 protocol evaluators (T113–T120, three sub-tracks in parallel)

---

## Notes

- `[P]` = different files, no incomplete upstream dependencies — safe to parallelize.
- `[USn]` label maps task to its user story for traceability and independent release.
- All TDD tasks come in RED/GREEN pairs — write the failing test before the implementation.
- `evaluate_vital_thresholds` and `build_lab_alert` are pure functions — unit test with no DB fixture.
- P1a service functions (`create_vitals`, `create_lab`) remain **unchanged** — backward-compatible; coordinators call them internally.
- Protocol tier constants (Hyperkalemia/DKA) live in each protocol module — they are fixed guidelines, not hospital-tunable via `clinical_config.py`.
- `shadow_event_service.record_protocol_evaluation` does NOT call `db.commit()` — the router owns the transaction boundary.
- Commit after each RED/GREEN pair; never commit RED-only without a follow-on GREEN in the same session.
