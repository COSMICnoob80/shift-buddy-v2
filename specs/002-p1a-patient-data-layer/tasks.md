---
description: "Dependency-ordered, TDD-enforced tasks for P1a Patient Data Layer"
---

# Tasks: Phase 1a — Patient Data Layer

**Feature Branch**: `002-p1a-patient-data-layer`
**Input**: `specs/002-p1a-patient-data-layer/{plan,spec,data-model}.md`, `contracts/openapi.yaml`
**Constitution**: v0.2.0 — TDD (II), Scope Discipline (III), Privacy (IV), Type Safety (VI), Config Externalization (XI), MEP over MVP (XIV) are binding.

**TDD is mandatory.** Every `RED` task writes a FAILING test. No `GREEN` implementation task may be committed until its paired `RED` is red on CI. Commits land in the order listed so the failing→passing arc is reproducible from `git log`.

Parallel marker `[P]` = different files, no shared state with prior incomplete tasks. Serialize when a task edits a file another open task also edits, or when it depends on wiring that isn't green yet.

**Numbering**: Continues from P0. First task = T061.

---

## Phase 1 — Clinical Config Extension + is_critical Unit Logic (Steps 1–2) (T061–T064)

**Gate**: No lab router or service may be written until T064 is green — the `compute_is_critical` function is the one source of truth for all threshold logic (Principle XI).

- [ ] T061 **RED** — `api/tests/unit/test_is_critical.py` (first half): import `get_lab_thresholds` from `api/app/core/clinical_config.py`; assert K+ returns a `LabThreshold` with `critical_high=6.0` and `critical_low=2.5` (env defaults); assert calling `get_lab_thresholds("Creatinine")` returns `None`; assert calling `get_lab_thresholds("Unknown")` returns `None`. Also assert `ClinicalConfig` rejects non-numeric values for `CLINICAL_LAB_K_CRITICAL_HIGH` with a `ValidationError`. **Acceptance**: `pytest api/tests/unit/test_is_critical.py -k "threshold"` fails (module or method missing).

- [ ] T062 **GREEN** — Extend `api/app/core/clinical_config.py`: add `LabThreshold` Pydantic v2 model (`critical_high: float | None`, `critical_low: float | None`); add 14 new env vars (`CLINICAL_LAB_K_CRITICAL_HIGH`, `CLINICAL_LAB_K_CRITICAL_LOW`, `CLINICAL_LAB_NA_CRITICAL_HIGH`, `CLINICAL_LAB_NA_CRITICAL_LOW`, `CLINICAL_LAB_HB_CRITICAL_LOW`, `CLINICAL_LAB_PLT_CRITICAL_LOW`, `CLINICAL_LAB_INR_CRITICAL_HIGH`, `CLINICAL_LAB_BS_CRITICAL_HIGH`, `CLINICAL_LAB_BS_CRITICAL_LOW`, `CLINICAL_LAB_LACTATE_CRITICAL_HIGH` — all typed `float` with defaults from `data-model.md §clinical_config extension`); add `get_lab_thresholds(test_name: str) -> LabThreshold | None` method on `ClinicalConfig`. `lru_cache` on the config singleton; test must call `cache_clear()` between env-override cases. **Acceptance**: T061 passes; `grep -rn "6\.0\|2\.5\|7\.0\|50\.0\|3\.0\|400\|54\.0\|4\.0\|125\|155" api/app/routers api/app/services 2>/dev/null | grep -v "^Binary"` returns nothing (no literals in routers/services; they don't exist yet, but this grep runs clean).

- [ ] T063 [P] **RED** — `api/tests/unit/test_is_critical.py` (full boundary suite): import `compute_is_critical` from `api/app/services/lab_service`; assert all boundary cases from `plan.md §Boundary values`: K+ 2.4→true, 2.5→false, 6.0→false, 6.1→true; Na+ 124.9→true, 155.1→true; Hemoglobin 6.9→true, 7.0→false; Platelets 49→true, 50→false; INR 3.1→true, 3.0→false; Blood Sugar 53.9→true, 400.1→true; Lactate 4.1→true, 4.0→false; Creatinine (any value)→false; Troponin (any value)→false. Also test the `outside_ref_range` guard: K+ 6.1 with `reference_low=3.5, reference_high=5.0` → true; K+ 6.1 with `reference_low=3.5, reference_high=7.0` (value inside ref range) → false. **Acceptance**: `pytest api/tests/unit/test_is_critical.py` fails (lab_service missing).

- [ ] T064 **GREEN** — Create `api/app/services/lab_service.py` with `compute_is_critical(test_name: str, value: float, reference_low: float | None, reference_high: float | None) -> bool` — pure function, no DB call. Implements logic from `plan.md §is_critical Computation`: `outside_ref_range` defaults to `True` when both ref bounds absent; `crosses_critical` uses `>=` for high and `<=` for low; returns `outside_ref_range and crosses_critical`. Calls `get_lab_thresholds` from `clinical_config`; returns `False` for `None`. **Acceptance**: T063 passes; function has zero threshold literals — all values sourced from config.

---

## Phase 2 — Pydantic v2 Schemas (Steps 3–4) (T065–T068)

- [ ] T065 **RED** — `api/tests/unit/test_patient_schemas.py`: (a) `PatientCreate` rejects `date_of_admission` set to tomorrow UTC (FR-001a) with `validation_error`; (b) `PatientCreate` trims leading/trailing whitespace from `name`, `bed_number`, `provisional_diagnosis` (FR-009); (c) `PatientCreate` rejects invalid enum values for `sex`, `acuity`, `ward` with descriptive errors; (d) `MedicationSchema` validates all 8 route values; (e) `PatientPatch` accepts an empty dict `{}` as valid (all fields optional); (f) `active_problems` rejects items exceeding 200 chars; (g) `PatientCreate` rejects `age < 0` and `age > 150`. **Acceptance**: `pytest api/tests/unit/test_patient_schemas.py` fails (module missing).

- [ ] T066 **GREEN** — Create `api/app/schemas/patient.py`: `MedicationSchema` (Pydantic v2 with route enum), `PatientCreate`, `PatientRead`, `PatientPatch`, `PatientSummary`, `PatientListResponse`, `PatientDetailResponse`, `DischargeRequest`, `DischargeResponse` — all matching `openapi.yaml` shapes. Validators: `@field_validator` for `date_of_admission` (reject future dates against `date.today()` in UTC); `@field_validator(mode="before")` for string trimming on name/bed_number/provisional_diagnosis; `model_config = ConfigDict(str_strip_whitespace=False)` (manual trim only on targeted fields, not global). **Acceptance**: T065 passes; `mypy --strict api/app/schemas/patient.py` clean.

- [ ] T067 **RED** — `api/tests/unit/test_vitals_schemas.py` + `api/tests/unit/test_labs_schemas.py`: vitals: (a) future `recorded_at` rejected; (b) all-null measurement fields rejected with `"At least one measurement field required"`; (c) valid partial set (only `heart_rate`) accepted; (d) `temperature` outside [30.0, 45.0] rejected. Labs: (e) `LabCreate` does NOT accept an `is_critical` field from client (reject with `field_not_allowed`); (f) `test_name` min-length 1 enforced; (g) `recorded_at` missing raises validation error. **Acceptance**: both test files fail (modules missing).

- [ ] T068 **GREEN** — Create `api/app/schemas/vitals.py` (`VitalsCreate`, `VitalsRead`, `VitalsListResponse`) and `api/app/schemas/labs.py` (`LabCreate`, `LabRead`, `LabListResponse`). `VitalsCreate`: `@model_validator(mode="after")` checks at least one non-null measurement; `@field_validator` for `recorded_at` rejects future timestamps. `LabCreate`: `@model_validator(mode="before")` raises `ValueError("field_not_allowed")` if `is_critical` key present in raw input. Shared `_future_datetime_check` validator extracted as a standalone function and imported by both schemas (avoid duplication). **Acceptance**: T067 passes; `mypy --strict api/app/schemas/vitals.py api/app/schemas/labs.py` clean.

---

## Phase 3 — Alembic Migrations 0003–0005 (Steps 5–7) (T069–T072)

**Note**: Migration files can be written in parallel [P] but `alembic upgrade` runs sequentially: 0003 → 0004 → 0005. The RED test verifies all three in one round-trip.

- [ ] T069 **RED** — `api/tests/integration/test_migration_roundtrip_p1a.py`: run `alembic upgrade head` against a test DB; assert `patients`, `vital_signs`, `lab_results` tables exist (via `information_schema.tables` query); assert all 4 enum types exist (`patient_sex`, `patient_acuity`, `patient_ward`, `patient_status`); run `alembic downgrade base`; assert all three tables and all four enums absent; run `alembic upgrade head` again — clean. Also assert `alembic/versions/` contains no `--autogenerate` header comment (extends P0's T023 guard to include new revisions). **Acceptance**: fails until T070–T072 land; confirms downgrade paths are functional.

- [ ] T070 **GREEN** — Hand-write `api/alembic/versions/0003_patients.py`: `upgrade()` creates 4 enum types (`patient_sex`, `patient_acuity`, `patient_ward`, `patient_status`) then `patients` table with all columns from `data-model.md §Entity: Patient`; creates 5 indexes (`ix_patients_ward`, `ix_patients_acuity`, `ix_patients_assigned_ho`, `ix_patients_status`, `ix_patients_ward_acuity`) — partial index WHERE `status='admitted'` for the first two and the composite. `downgrade()` drops indexes, table, then enums in reverse order. FK `assigned_ho` and `created_by` reference `users.id` ON DELETE RESTRICT. **Acceptance**: `alembic upgrade 0003` + `psql -c '\d patients'` shows all columns; `alembic downgrade 0002` removes all; T069 passes after T071 + T072 also land.

- [ ] T071 [P] **GREEN** — Hand-write `api/alembic/versions/0004_vital_signs.py`: `upgrade()` creates `vital_signs` table with FK `patient_id → patients.id ON DELETE CASCADE`, all nullable measurement columns with CHECK constraints per `data-model.md §Entity: VitalSigns`, index `ix_vital_signs_patient_recorded` on `(patient_id, recorded_at ASC)`. `downgrade()` drops index then table. **Acceptance**: `alembic upgrade 0004` + `psql -c '\d+ vital_signs'` confirms index exists; downgrade clean.

- [ ] T072 [P] **GREEN** — Hand-write `api/alembic/versions/0005_lab_results.py`: `upgrade()` creates `lab_results` table with FK `patient_id → patients.id ON DELETE CASCADE`, all columns per `data-model.md §Entity: LabResult` (`is_critical BOOLEAN NOT NULL DEFAULT FALSE`), indexes `ix_lab_results_patient_recorded` on `(patient_id, recorded_at ASC)` and `ix_lab_results_patient_test` on `(patient_id, test_name)`. `downgrade()` drops indexes then table. **Acceptance**: T069 round-trip passes (all three revisions); `grep -c "autogenerate" api/alembic/versions/0003_patients.py api/alembic/versions/0004_vital_signs.py api/alembic/versions/0005_lab_results.py` returns zero.

---

## Phase 4 — ORM Models (Step 8) (T073–T074)

- [ ] T073 **RED** — `api/tests/integration/test_orm_models_p1a.py`: using the async test session, insert a `Patient` with all required fields (FK `assigned_ho` and `created_by` pointing to a fixture user); read back by `id`; assert UUID round-trip, `status == "admitted"`, `acuity == "stable"`, `active_problems == []`, `created_at` is timezone-aware. Insert a `VitalSigns` linked to that patient with `heart_rate=88`, read back; assert `patient_id` matches. Insert a `LabResult` for K+ 6.2 with `is_critical=True`; read back; assert `is_critical` stored correctly. Verify FK cascade: create a second patient with a VitalSigns; the VitalSigns row persists (no cascade-delete triggered by RESTRICT on users). **Acceptance**: fails until T074 (models missing).

- [ ] T074 **GREEN** — Create `api/app/models/patient.py` (`Patient` ORM with `Mapped[]` annotations matching `data-model.md` column types; JSONB fields typed `list[dict[str, Any]]` / `list[str]`), `api/app/models/vital_signs.py` (`VitalSigns` ORM), `api/app/models/lab_result.py` (`LabResult` ORM). All three import `_utcnow` from `api/app/models/base.py` (or extend the existing base) for the `default=_utcnow` on `created_at`/`updated_at`; no per-model datetime duplication. Register all three in `api/app/models/db.py` metadata. **Acceptance**: T073 passes; `mypy --strict api/app/models/patient.py api/app/models/vital_signs.py api/app/models/lab_result.py` clean.

---

## Phase 5 — Router Allowlist Amendment (Step 9) (T075–T077)

- [ ] T075 **RED** — Update `api/tests/integration/test_router_allowlist.py`: change the expected allowlist from `{__init__.py, health.py, auth.py}` to `{__init__.py, health.py, auth.py, patients.py, vitals.py, labs.py}` (FR-020). Confirm that walking `api/app/routers/` with only the P0 files produces a FAILING test (the file set is now smaller than expected). **Acceptance**: test fails because `patients.py`, `vitals.py`, `labs.py` don't exist yet.

- [ ] T076 **GREEN** — Create stub `api/app/routers/patients.py` (bare `APIRouter(prefix="/patients", tags=["patients"])` instance, no routes), `api/app/routers/vitals.py`, `api/app/routers/labs.py`; wire all three into `api/app/main.py` under `/api/v1`; update `scripts/ci/check_router_allowlist.sh` to extend the allowlist per `plan.md §Scope Guard Amendment` (adding `! -name 'patients.py' ! -name 'vitals.py' ! -name 'labs.py'`). **Acceptance**: T075 passes; `bash scripts/ci/check_router_allowlist.sh` exits 0 on the current tree.

- [ ] T077 [P] **Negative gate test** — `api/tests/integration/test_router_allowlist_negative_p1a.py`: fixture creates `api/app/routers/_dummy_p1a.py` (teardown removes it); shells out to `scripts/ci/check_router_allowlist.sh`; asserts non-zero exit code AND teardown restores tree. **Acceptance**: proves the gate still fails loud on scope creep beyond the three new names; analogous to P0's T043.

---

## Phase 6 — Patient CRUD + Discharge (Step 10) (T078–T080)

- [ ] T078 **RED** — `api/tests/contract/test_patients_crud.py`: Story-1 ACs 1–5 + edge cases — (a) POST valid payload → 201 with UUID, `created_by=authenticated_user_id`, `status="admitted"`, all timestamps UTC; (b) POST missing `bed_number` → 400 `validation_error`; (c) POST future `date_of_admission` → 400 `validation_error`; (d) GET `/patients?ward=ortho` → `patients` array contains only ortho patients plus `summary` acuity counts; (e) PATCH `acuity` → 200, `updated_at` refreshed, other fields unchanged; (f) PATCH empty body `{}` → 200, `updated_at` refreshed; (g) `bed_number` "ICU-3" accepted; (h) unauthenticated request → 401. **Acceptance**: fails until T080.

- [ ] T079 **RED** — `api/tests/contract/test_discharge.py`: (a) POST `/patients/{id}/discharge` with `{"condition_at_discharge": "Improved"}` → 200 `{"status":"discharged","discharged_at":"<utc-iso>"}` (FR-008); (b) patient record NOT deleted — subsequent GET `/patients/{id}` returns 200 with `status="discharged"` and `condition_at_discharge` set; (c) second POST to same patient → 409 `already_discharged`; (d) POST to nonexistent patient → 404 `patient_not_found`. **Acceptance**: fails until T080 (discharge endpoint missing).

- [ ] T080 **GREEN** — Implement `api/app/routers/patients.py` (all 5 patient endpoints: `POST /patients`, `GET /patients`, `GET /patients/{patient_id}`, `PATCH /patients/{patient_id}`, `POST /patients/{patient_id}/discharge`) and `api/app/services/patient_service.py` (CRUD + discharge + acuity-weighted sort). Extract `get_patient_or_404` as a FastAPI dependency (shared with vitals + labs). `assigned_ho` defaults to `current_user.id` if not provided (FR-003). `created_by` always equals `current_user.id` (FR-002). All string fields run through `.strip()` at service layer (FR-009). **Acceptance**: T078 + T079 pass; `mypy --strict api/app/routers/patients.py api/app/services/patient_service.py` clean.

---

## Phase 7 — Pagination (Step 11) (T081–T082)

- [ ] T081 **RED** — `api/tests/integration/test_pagination.py`: (a) GET `/patients?limit=101` → 400 `validation_error "limit: must be ≤ 100"`; (b) GET `/patients?page=0` → 400; (c) GET `/patients?ward=child` (empty ward, no patients) → 200 `{"patients":[],"summary":{"total":0,"critical":0,"urgent":0,"stable":0,"discharge_ready":0},"page":1,"limit":20,"total_pages":0}` (NFR-008); (d) 25 patients created in ortho → GET `/patients?ward=ortho&limit=20` returns 20 patients + `total_pages=2`; GET with `page=2` returns 5 patients. Same tests for `/patients/{id}/vitals` and `/patients/{id}/labs` pagination params. **Acceptance**: fails until T082.

- [ ] T082 **GREEN** — Create shared `PaginationParams` FastAPI dependency (`page: int = Query(1, ge=1)`, `limit: int = Query(20, ge=1, le=100)`); integrate into `patient_service.get_patients()`, and stub into vitals/labs routers for later wiring. Return `total_pages = ceil(total_count / limit)` (or 0 when count is 0). **Acceptance**: T081 passes; `PaginationParams` is defined once and imported by all three routers.

---

## Phase 8 — Vitals (Step 12) (T083–T084)

- [ ] T083 **RED** — `api/tests/contract/test_vitals.py`: Story-2 ACs 1–3 + validation — (a) POST partial vitals (`heart_rate=88, spo2=97`) → 201 with UUID, null fields absent or null, `recorded_at` in UTC; (b) POST vitals with `recorded_at` 1 minute in the future → 400 `"recorded_at: cannot be a future timestamp"`; (c) POST all-null measurement fields → 400 `"At least one measurement field required"`; (d) GET `/patients/{id}/vitals` with two recordings → array sorted ascending by `recorded_at`; (e) GET vitals for nonexistent patient → 404; (f) unauthenticated → 401. **Acceptance**: fails until T084.

- [ ] T084 **GREEN** — Implement `api/app/routers/vitals.py` (`POST /patients/{patient_id}/vitals`, `GET /patients/{patient_id}/vitals`) and `api/app/services/vitals_service.py`. Reuse `get_patient_or_404` dependency from patient_service (FR-014). Sort returned records ascending by `recorded_at` (FR-013). Wire `PaginationParams` from T082. **Acceptance**: T083 passes; `mypy --strict api/app/routers/vitals.py api/app/services/vitals_service.py` clean.

---

## Phase 9 — Labs (Step 13) (T085–T087)

- [ ] T085 **RED** — `api/tests/contract/test_labs.py`: Story-3 ACs 1–4 + validation — (a) POST K+ 6.2 → 201 with `is_critical=true` (above critical_high=6.0, outside reference range 3.5–5.0); (b) POST K+ 4.0 → 201 with `is_critical=false`; (c) GET `/patients/{id}/labs?test_name=K%2B` → only K+ records returned; (d) GET with no filter → all labs sorted ascending by `recorded_at`; (e) POST with `is_critical` field in request body → 400 `field_not_allowed`; (f) POST K+ 6.2 with `reference_low=3.5, reference_high=7.0` (value inside ref range) → `is_critical=false` (outside_ref_range=false overrides threshold); (g) POST Creatinine any value → `is_critical=false`; (h) nonexistent patient → 404. **Acceptance**: fails until T086.

- [ ] T086 **GREEN** — Implement `api/app/routers/labs.py` (`POST /patients/{patient_id}/labs`, `GET /patients/{patient_id}/labs`) and complete `api/app/services/lab_service.py` (wire `compute_is_critical` from T064; set `is_critical` on the ORM object before `db.add()`; client-supplied `is_critical` detected by schema's `model_validator` and rejected 400). Wire `get_patient_or_404` and `PaginationParams`. **Acceptance**: T085 passes; `mypy --strict api/app/routers/labs.py api/app/services/lab_service.py` clean.

- [ ] T087 [P] **Literal-threshold guard** — Add CI-runnable grep to `scripts/ci/check_router_allowlist.sh` (or a new `scripts/ci/check_threshold_literals.sh`): `grep -rn "6\.0\|2\.5\|7\.0\|50\.0\|3\.0\|400\.0\|54\.0\|4\.0\|125\.0\|155\.0" api/app/routers api/app/services` must exit non-zero (no matches). Wire into `.github/workflows/ci.yml`. **Acceptance**: script exits 0 (no literals found) on clean tree; removing a threshold from clinical_config and hardcoding it in a service causes CI failure.

---

## Phase 10 — PHI Redaction + Patient Detail Endpoint (Step 14) (T088–T090)

- [ ] T088 **RED** — `api/tests/integration/test_phi_redaction_p1a.py`: using `structlog` test capture, POST a patient with `name="John Doe"`, `bed_number="ICU-1"`; POST vitals; POST labs; assert no log event in any of the three calls contains the literal strings `"John Doe"` or `"ICU-1"` — only `[REDACTED]` (extends P0 redaction tests to new endpoints). **Acceptance**: fails if `name` and `bed_number` are not yet in the redaction field list.

- [ ] T089 [P] **RED** — `api/tests/integration/test_patient_detail.py`: POST a patient → POST two vitals → POST two labs → GET `/patients/{id}` → assert response contains `"vitals"` array with 2 items sorted ascending by `recorded_at`, `"labs"` array with 2 items, patient fields intact, embedded items include their `id` and `patient_id` fields (FR-006). **Acceptance**: fails until T090 wires the detail query.

- [ ] T090 **GREEN** — Verify `api/app/core/logging.py` REDACT_FIELDS constant includes `name` and `bed_number`; add them if absent (they may already be there from P0 if the constant was generic, but confirm explicitly). Implement `patient_service.get_patient_detail()` that eager-loads `vitals` and `labs` sorted by `recorded_at ASC`; wire into `GET /patients/{patient_id}` using `PatientDetailResponse` schema. **Acceptance**: T088 + T089 both pass.

---

## Phase 11 — Cross-Cutting: Types, Env Vars, CI Gates (T091–T095)

- [ ] T091 [P] **Update `.env.example`** — Append the 14 new `CLINICAL_LAB_*` env vars with their default values from `data-model.md §clinical_config extension` (K+, Na+, Hb, Plt, INR, BS, Lactate — critical high and/or low per test). Also add `CLINICAL_HR_MIN`, `CLINICAL_HR_MAX`, `CLINICAL_SBP_MIN` placeholder stubs if not already present. **Acceptance**: `grep -c "CLINICAL_LAB_" .env.example` returns 10 (7 tests × varies, see data-model.md; exact count is 10 vars for the 7 tests); no real secrets present.

- [ ] T092 [P] **mypy clean sweep** — Run `mypy --strict api/app/` on all new modules added in P1a (`schemas/patient.py`, `schemas/vitals.py`, `schemas/labs.py`, `models/patient.py`, `models/vital_signs.py`, `models/lab_result.py`, `routers/patients.py`, `routers/vitals.py`, `routers/labs.py`, `services/patient_service.py`, `services/vitals_service.py`, `services/lab_service.py`, `core/clinical_config.py`). Fix any `type: ignore` shortcuts or `Any` escapes introduced during GREEN phases. **Acceptance**: `mypy --strict api/app/` exits 0 with no errors or warnings on all P1a modules.

- [ ] T093 **Full Constitution Check** — Walk Principles I–XIV per `plan.md §Constitution Check`; update any row that drifted during implementation (especially Principle IV if redaction fields were added in T090). Record evidence for each principle (test IDs, file paths, grep outputs). **Acceptance**: all 14 principles checked in the PR description with evidence links; Complexity Tracking table empty or populated with justified entries.

- [ ] T094 **Deliverables verification** — Confirm all items from `plan.md §Deliverables` are present: all source files in `§Project Structure`; `data-model.md` companion unchanged; `contracts/openapi.yaml` committed; `.env.example` updated; CI green on branch. Run `pytest -q` and confirm count ≥ 35 new tests. Confirm `git log --oneline` shows the RED→GREEN arc across Steps 1–14. **Acceptance**: branch is merge-ready into `dev`; all deliverables present; CI green including router allowlist gate (T076), negative test (T077), and threshold literal guard (T087).

- [ ] T095 [P] **PHR** — Write Prompt History Record for P1a tasks generation session under `history/prompts/002-p1a-patient-data-layer/` with stage `tasks`, recording the `/sp.tasks` command, the 35-task output, and confirmation of spec/plan alignment. **Acceptance**: file exists at expected path; no unresolved placeholders; PROMPT_TEXT is complete.

---

## Dependency Graph (non-obvious callouts)

- **T062** (clinical_config extension) MUST land before **T064** (compute_is_critical imports `get_lab_thresholds`).
- **T064** (compute_is_critical) MUST land before **T086** (lab_service wires it) — no threshold logic in the router.
- **T066** (patient schemas) blocks **T078** (patient CRUD tests import `PatientCreate`, `PatientRead`).
- **T068** (vitals + labs schemas) blocks **T083** and **T085**.
- **T069** (migration RED test) depends on **T070, T071, T072** all being green — do not merge T069 alone.
- **T070** blocks **T071** at `alembic upgrade` runtime (FK dependency: vital_signs FK → patients).
- **T071** blocks **T072** at `alembic upgrade` runtime (lab_results FK → patients, which needs 0003 applied).
- **T074** (ORM models) MUST follow **T070–T072** — models reference table columns defined in migrations.
- **T075** (allowlist test RED) must run before **T076** (adds stubs) — proves test was failing first.
- **T080** (patient CRUD GREEN) depends on **T074** (ORM models) and **T066** (schemas).
- **T082** (PaginationParams) must exist before **T083** and **T085** test vitals/labs list endpoints.
- **T086** (lab router GREEN) calls `compute_is_critical` from **T064** — hard dependency.
- **T090** (PHI + detail GREEN) depends on **T080** (patient service) for `get_patient_detail`.
- **T092** (mypy sweep) is the final type-check gate — runs after all GREEN tasks are complete.

## Parallel Batches (safe concurrent execution)

- **After T062 lands**: {T063, T065, T067} — all unit tests, different files.
- **After T066 + T068 land**: {T069, T073} — migration round-trip + ORM test can be written simultaneously.
- **After T070 lands**: {T071, T072} — migration files are independent; `alembic upgrade` still sequential.
- **After T076 lands**: {T077, T078, T079} — allowlist negative test + patient CRUD RED tests independent.
- **After T082 lands**: {T083, T085} — vitals and labs RED tests use PaginationParams, different files.
- **After T086 + T084 land**: {T087, T088, T089, T091, T092} — cross-cutting checks are independent.
