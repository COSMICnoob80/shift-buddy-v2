# SHIFT BUDDY V2 — SPEC.md (Phase 0 + Phase 1)

> **Scope:** Foundation + Core Agent (Weeks 1-6)
> **Parent Document:** CLAUDE.md (read for vision, context, and architecture)
> **Rule:** Code that contradicts this spec is a bug. Spec that contradicts user needs is a spec revision.

---

## 1. DATA MODELS

### 1.1 Patient

| Field | Type | Required | Constraints | Default |
|---|---|---|---|---|
| `id` | UUID v4 | Auto | Immutable | System-generated |
| `bed_number` | String | Yes | 1-20 chars, e.g., "12", "ICU-3", "FW-1" | — |
| `name` | String | Yes | 1-100 chars, trimmed | — |
| `age` | Integer | Yes | 0-150 | — |
| `sex` | Enum | Yes | `male`, `female` | — |
| `rank_title` | String | No | Military rank/title, e.g., "Cpl/t", "Hav", "CNE", "Lt Col", "M/O", "W/O" | `null` |
| `date_of_admission` | ISO 8601 Date | Yes | Cannot be future | — |
| `provisional_diagnosis` | String | Yes | 1-500 chars | — |
| `active_problems` | Array of Strings | No | 0-20 items, each 1-200 chars | `[]` |
| `current_medications` | Array of Medication | No | See Medication schema below | `[]` |
| `allergies` | Array of Strings | No | Empty = "NKDA" displayed | `[]` |
| `acuity` | Enum | Yes | `critical`, `urgent`, `stable`, `discharge_ready` | `stable` |
| `ward` | Enum | Yes | `ortho`, `surgical_itc`, `family`, `officer`, `child`, `emergency` | — |
| `assigned_ho` | UUID (User ref) | Yes | The HO responsible this shift | Current user |
| `status` | Enum | Yes | `admitted`, `discharged`, `transferred`, `expired` | `admitted` |
| `created_by` | UUID (User ref) | Auto | Immutable | Authenticated user |
| `created_at` | ISO 8601 DateTime | Auto | UTC, immutable | System timestamp |
| `updated_at` | ISO 8601 DateTime | Auto | UTC, updated on every modification | System timestamp |

### 1.2 Medication (Embedded in Patient)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | String | Yes | 1-100 chars, e.g., "Inj. Ceftriaxone" |
| `dose` | String | Yes | e.g., "1g", "500mg", "10 units" |
| `route` | Enum | Yes | `iv`, `im`, `sc`, `po`, `pr`, `nebulized`, `topical`, `sublingual` |
| `frequency` | String | Yes | e.g., "BD", "TDS", "QID", "STAT", "PRN", "OD" |
| `start_date` | ISO 8601 Date | Yes | — |
| `end_date` | ISO 8601 Date | No | `null` = ongoing |
| `notes` | String | No | e.g., "After meals", "Dilute in 100ml NS over 30min" |

### 1.3 Vital Signs (One entry per recording)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID v4 | Auto | — |
| `patient_id` | UUID (Patient ref) | Yes | Must reference existing patient |
| `recorded_at` | ISO 8601 DateTime | Yes | Cannot be future |
| `heart_rate` | Integer | No | 0-300 bpm |
| `systolic_bp` | Integer | No | 0-300 mmHg |
| `diastolic_bp` | Integer | No | 0-200 mmHg |
| `temperature` | Float | No | 30.0-45.0 °C |
| `spo2` | Integer | No | 0-100 % |
| `respiratory_rate` | Integer | No | 0-80 /min |
| `gcs` | Integer | No | 3-15 |
| `urine_output` | Float | No | 0-5000 ml (per recording period) |
| `blood_sugar` | Float | No | 0-1000 mg/dL |

### 1.4 Lab Result

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID v4 | Auto | — |
| `patient_id` | UUID (Patient ref) | Yes | — |
| `test_name` | String | Yes | e.g., "Hb", "TLC", "Plt", "K+", "Creatinine", "Lipase" |
| `value` | Float | Yes | — |
| `unit` | String | Yes | e.g., "g/dL", "x10^3/uL", "mEq/L", "mg/dL" |
| `reference_low` | Float | No | — |
| `reference_high` | Float | No | — |
| `is_critical` | Boolean | Auto | Computed: true if outside critical range (see Section 4) |
| `recorded_at` | ISO 8601 DateTime | Yes | — |

### 1.5 User (House Officer)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | UUID v4 | Auto | — |
| `name` | String | Yes | 1-100 chars |
| `pmdc_number` | String | Yes | Unique, validated format |
| `hospital_code` | String | Yes | e.g., "FSL" |
| `department` | String | Yes | e.g., "General Surgery" |
| `role` | Enum | Yes | `ho`, `senior_resident`, `consultant` | 
| `email` | String | Yes | Valid email, unique |
| `password_hash` | String | Yes | bcrypt, never exposed in API |
| `created_at` | ISO 8601 DateTime | Auto | — |

---

## 2. API CONTRACT (Phase 0 + Phase 1)

**Base URL:** `/api/v1`
**Auth:** Bearer token (JWT) on all endpoints except `POST /auth/register` and `POST /auth/login`
**Error format (all errors):**
```json
{"error": "error_code", "message": "Human-readable description"}
```

### 2.1 Authentication

#### Register
`POST /api/v1/auth/register`
```json
// Request
{
  "name": "Dr. Abdullah Shah",
  "email": "abdullah@example.com",
  "password": "min8chars",
  "pmdc_number": "12345-S",
  "hospital_code": "FSL",
  "department": "General Surgery"
}
// Success: 201 Created → { "id": "uuid", "token": "jwt..." }
// Errors: 400 (validation), 409 (email/pmdc already exists)
```

#### Login
`POST /api/v1/auth/login`
```json
// Request
{ "email": "abdullah@example.com", "password": "min8chars" }
// Success: 200 → { "token": "jwt...", "user": { ... } }
// Errors: 401 (invalid credentials)
```

### 2.2 Patient CRUD

#### Create Patient
`POST /api/v1/patients`
```json
// Request
{
  "bed_number": "3",
  "name": "Cook Lateef",
  "age": 45,
  "sex": "male",
  "rank_title": "Cook",
  "date_of_admission": "2026-01-28",
  "provisional_diagnosis": "Right hypochondriac pain",
  "active_problems": ["Hepatic steatosis", "Right small kidney", "Prostate enlarged"],
  "current_medications": [
    {
      "name": "Inj. Pantoprazole",
      "dose": "40mg",
      "route": "iv",
      "frequency": "OD",
      "start_date": "2026-01-28"
    }
  ],
  "allergies": [],
  "acuity": "stable",
  "ward": "ortho"
}
// Success: 201 → Full patient object with id, created_at, updated_at
// Errors: 400 (validation), 401 (not authenticated)
```

#### List Patients (Patient Board)
`GET /api/v1/patients`

| Query Param | Type | Default | Description |
|---|---|---|---|
| `ward` | String | All | Filter by ward |
| `acuity` | String | All | Filter by acuity level |
| `assigned_ho` | UUID | Current user | Filter by assigned HO |
| `status` | String | `admitted` | Filter by status |
| `sort` | String | `acuity` | Sort by: `acuity`, `bed_number`, `date_of_admission` |

```json
// Success: 200
{
  "patients": [ ... ],
  "summary": {
    "total": 16,
    "critical": 2,
    "urgent": 3,
    "stable": 9,
    "discharge_ready": 2
  }
}
```

**Acuity sort order:** critical (1) → urgent (2) → stable (3) → discharge_ready (4)

#### Get Single Patient
`GET /api/v1/patients/{patient_id}`
```json
// Success: 200 → Full patient object + vitals array + labs array
// Error: 404 (not found)
```

#### Update Patient
`PATCH /api/v1/patients/{patient_id}`
```json
// Partial update. Only included fields change. updated_at refreshed.
// Success: 200 → Updated patient object
// Errors: 400, 404
```

#### Discharge Patient
`POST /api/v1/patients/{patient_id}/discharge`
```json
// Request
{ "condition_at_discharge": "Improved, ambulating, tolerating orals" }
// Sets status = "discharged", records discharge time
// Success: 200
// Patient remains in DB (soft state change, not hard delete)
```

### 2.3 Vital Signs

#### Record Vitals
`POST /api/v1/patients/{patient_id}/vitals`
```json
// Request (partial vitals OK — not all fields measured every time)
{
  "heart_rate": 88,
  "systolic_bp": 130,
  "diastolic_bp": 80,
  "temperature": 37.2,
  "spo2": 97,
  "recorded_at": "2026-02-16T14:30:00Z"
}
// Success: 201 → Vital record with id
// Side effect: If any vital crosses alert threshold → triggers alert engine
```

#### Get Vital Trends
`GET /api/v1/patients/{patient_id}/vitals`
```json
// Success: 200 → Array of vital records, sorted chronologically ascending
// Used by frontend to plot trend charts
```

### 2.4 Lab Results

#### Add Lab Result
`POST /api/v1/patients/{patient_id}/labs`
```json
// Request
{
  "test_name": "K+",
  "value": 5.8,
  "unit": "mEq/L",
  "reference_low": 3.5,
  "reference_high": 5.0,
  "recorded_at": "2026-02-16T15:00:00Z"
}
// Success: 201 → Lab record with is_critical auto-computed
// Side effect: If is_critical = true → triggers alert engine
```

#### Get Lab History
`GET /api/v1/patients/{patient_id}/labs`
```json
// Success: 200 → Array of lab records, sorted chronologically ascending
// Query param: ?test_name=K+ (filter by specific test)
```

### 2.5 Clinical Protocols

#### Evaluate Protocol
`POST /api/v1/protocols/evaluate`
```json
// Request
{
  "protocol": "hyperkalemia",
  "patient_id": "uuid-of-patient",
  "values": { "potassium": 6.2, "ecg_changes": false }
}
// Success: 200
{
  "severity": "critical",
  "recommendations": [
    {
      "action": "IV Calcium Gluconate 10% 10ml over 10 minutes",
      "priority": 1,
      "rationale": "Cardiac membrane stabilization — K+ > 6.0",
      "source": "AHA 2023 Hyperkalemia Guidelines"
    },
    {
      "action": "Insulin 10 units + Dextrose 25g IV",
      "priority": 2,
      "rationale": "Intracellular potassium shift",
      "source": "KDIGO 2023"
    }
  ],
  "alert_generated": true,
  "review_medication_list": true,
  "escalation": "Contact senior if K+ > 6.5 or ECG changes present"
}
```

#### List Available Protocols
`GET /api/v1/protocols`
```json
// Success: 200 → Array of protocol names and descriptions
// These run deterministically — no AI model needed, works offline
```

---

## 3. ALERT THRESHOLDS (Deterministic — No AI Needed)

These are the EXACT trigger values. No ambiguity.

### 3.1 Vital Sign Alerts

| Parameter | Warning (Amber) | Critical (Red) |
|---|---|---|
| Heart Rate | < 50 or > 110 bpm | < 40 or > 130 bpm |
| Systolic BP | < 100 or > 160 mmHg | < 90 or > 180 mmHg |
| Diastolic BP | > 100 mmHg | > 110 mmHg |
| Temperature | > 38.0 or < 36.0 °C | > 39.5 or < 35.0 °C |
| SpO2 | < 94% | < 90% |
| Respiratory Rate | < 10 or > 24 /min | < 8 or > 30 /min |
| GCS | Drop of 1 from baseline | Drop of ≥ 2 or GCS ≤ 8 |
| Urine Output | < 0.5 ml/kg/hr for 6hrs | < 0.3 ml/kg/hr for 6hrs |
| Blood Sugar | < 70 or > 250 mg/dL | < 54 or > 400 mg/dL |

### 3.2 Lab Value Alerts

| Test | Warning (Amber) | Critical (Red) |
|---|---|---|
| Potassium (K+) | < 3.0 or > 5.5 mEq/L | < 2.5 or > 6.0 mEq/L |
| Sodium (Na+) | < 130 or > 150 mEq/L | < 125 or > 155 mEq/L |
| Creatinine | Rise > 0.3 mg/dL in 48hrs | Rise > 0.5 mg/dL in 48hrs OR value > 4.0 |
| Hemoglobin | < 8.0 g/dL | < 7.0 g/dL |
| Platelets | < 100 x10³/µL | < 50 x10³/µL |
| INR | > 2.0 | > 3.0 |
| Blood Sugar | < 70 or > 250 mg/dL | < 54 or > 400 mg/dL |
| Troponin | Any elevation above normal | > 5x upper normal limit |
| Lactate | > 2.0 mmol/L | > 4.0 mmol/L |

### 3.3 Alert Notification Schema

```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "patient_name": "Cook Lateef",
  "bed_number": "3",
  "severity": "critical",
  "type": "lab_value",
  "parameter": "K+",
  "value": 6.2,
  "unit": "mEq/L",
  "threshold_crossed": "critical_high",
  "message": "K+ 6.2 mEq/L — Critical hyperkalemia. Check medications for potassium-sparing drugs.",
  "recommended_action": "Evaluate with hyperkalemia protocol",
  "protocol_link": "/api/v1/protocols/evaluate?protocol=hyperkalemia",
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "created_at": "2026-02-16T15:01:00Z"
}
```

---

## 4. CLINICAL PROTOCOLS — SPECIFICATION (Phase 1: Top 5)

Each protocol runs as **deterministic rules** — no AI model involved. Must work offline.

### 4.1 Hyperkalemia Protocol

**Trigger:** K+ lab value recorded > 5.5 mEq/L

| K+ Level | Severity | Actions |
|---|---|---|
| 5.5 - 5.9 | Moderate | Stop K+-sparing drugs (spironolactone, ACEi, ARB). Kayexalate 15g PO. Recheck K+ in 4hrs. |
| 6.0 - 6.4 (no ECG changes) | Severe | All of above + IV Calcium Gluconate 10% 10ml over 10min + Insulin 10U + D25 50ml IV. Recheck K+ in 2hrs. ECG stat. |
| 6.0 - 6.4 (with ECG changes) | Emergency | All of above + Cardiology consult + Consider ICU transfer. Continuous cardiac monitoring. |
| ≥ 6.5 | Emergency | All of above + CALL SENIOR IMMEDIATELY + ICU transfer. Nebulized salbutamol 10mg. Consider dialysis. |

**Test cases:**
- [ ] K+ = 5.4 → No alert, no protocol triggered
- [ ] K+ = 5.6 → Amber alert + moderate protocol
- [ ] K+ = 6.0, no ECG changes → Red alert + severe protocol
- [ ] K+ = 6.0, ECG changes present → Red alert + emergency protocol
- [ ] K+ = 6.7 → Red alert + emergency protocol with "CALL SENIOR IMMEDIATELY"
- [ ] K+ = 5.8, patient on spironolactone → Alert includes drug flag

### 4.2 AKI (Acute Kidney Injury) Protocol

**Trigger:** Creatinine rise OR urine output decrease matching KDIGO criteria

| Stage | Criteria | Actions |
|---|---|---|
| Stage 1 | Cr rise ≥ 0.3 in 48hrs OR 1.5-1.9x baseline | Hold nephrotoxics (NSAIDs, aminoglycosides, ACEi). Fluid challenge 250ml NS over 1hr. Monitor UO hourly. Recheck Cr in 12hrs. |
| Stage 2 | Cr 2.0-2.9x baseline | All of above + Renal dose adjust ALL medications. Daily U&E. Strict I/O charting. Senior review. |
| Stage 3 | Cr ≥ 3x baseline OR Cr ≥ 4.0 OR Anuria 12hrs | All of above + CALL SENIOR + Nephrology consult. Consider dialysis access. Urgent K+, pH, bicarbonate. |

**Test cases:**
- [ ] Cr 1.0 → 1.2 (rise 0.2 in 48hrs) → No AKI triggered
- [ ] Cr 1.0 → 1.4 (rise 0.4 in 48hrs) → Stage 1 AKI
- [ ] Cr 1.0 → 2.5 (2.5x baseline) → Stage 2 AKI
- [ ] Cr 1.0 → 4.2 → Stage 3 AKI with senior escalation
- [ ] Cr rise + patient on gentamicin → Drug flag in alert

### 4.3 Chest Pain / ACS Protocol

**Trigger:** Manual activation by HO ("chest pain" presenting complaint)

**Immediate (within 10 minutes):**
1. ECG — 12 lead STAT
2. Troponin I/T STAT
3. Aspirin 300mg PO (chew) — unless allergic
4. IV access + blood for CBC, BMP, coagulation
5. O2 if SpO2 < 94%
6. Morphine 2-4mg IV PRN if pain severe + Ondansetron 4mg IV
7. Nitrates SL (contraindicated if SBP < 90, RV infarct, or PDE5 inhibitor in 48hrs)

**Decision tree after initial workup:**
- ST elevation → STEMI → CALL SENIOR + Cardiology STAT + Consider cath lab activation
- ST depression / T inversion + troponin positive → NSTEMI → Anticoagulation (enoxaparin) + Cardiology consult
- Normal ECG + negative troponin → Repeat troponin at 6hrs + Risk stratify (HEART score)
- Normal ECG + 2 negative troponins → Low risk → Consider discharge with outpatient follow-up

### 4.4 Diabetic Ketoacidosis (DKA) Protocol

**Trigger:** Blood sugar > 250 + clinical suspicion or pH < 7.3 or Bicarbonate < 18

**Immediate:**
1. ABG STAT (pH, HCO3, pCO2)
2. BMP (K+, Na+, Cl-, BUN, Cr)
3. Blood sugar (lab, not glucometer for accuracy)
4. Urine ketones or serum beta-hydroxybutyrate
5. NS 1L bolus over 1hr (if not in heart failure)

**Severity Classification:**
| | Mild | Moderate | Severe |
|---|---|---|---|
| pH | 7.25-7.30 | 7.00-7.24 | < 7.00 |
| HCO3 | 15-18 | 10-14 | < 10 |
| Mental status | Alert | Alert/Drowsy | Obtunded |
| Management | Ward | Ward/Step-down | ICU + Senior STAT |

### 4.5 Sepsis / SIRS Protocol

**Trigger:** ≥ 2 SIRS criteria present:
- Temperature > 38.3°C or < 36°C
- Heart rate > 90 bpm
- Respiratory rate > 20 /min
- WBC > 12,000 or < 4,000 or > 10% bands

**If SIRS + suspected infection → Sepsis → Hour-1 Bundle:**
1. Lactate level STAT
2. Blood cultures x2 (before antibiotics) — from 2 different sites
3. Broad-spectrum antibiotics within 1 hour (hospital protocol: Pip-Tazo 4.5g IV or Meropenem 1g IV)
4. NS 30ml/kg bolus if hypotensive or lactate > 4
5. Vasopressors if MAP < 65 despite fluid resuscitation → CALL SENIOR + ICU

---

## 5. UI SPECIFICATIONS (Phase 1 — Web)

### 5.1 Design System

| Element | Value |
|---|---|
| **Font** | Inter. Regular 400 (body), Medium 500 (labels), SemiBold 600 (headings) |
| **Background** | `#0a0a0f` (near-black) |
| **Surface** | `#1a1a2e` (dark navy cards) |
| **Text primary** | `#f0f0f0` |
| **Text secondary** | `#8888aa` |
| **Critical / Red** | `#ef4444` |
| **Warning / Amber** | `#f59e0b` |
| **Stable / Green** | `#22c55e` |
| **Discharge / Blue** | `#3b82f6` |
| **Accent** | `#6366f1` (indigo — buttons, links) |
| **Border radius** | 8px (cards), 6px (buttons), 4px (inputs) |
| **Spacing unit** | 4px base (4, 8, 12, 16, 24, 32, 48) |

### 5.2 Patient Board Layout

```
┌─────────────────────────────────────────────────────────┐
│  SHIFT BUDDY V2          [🔔 3 alerts]  [Dr. Abdullah]  │
├─────────────────────────────────────────────────────────┤
│  Call Briefing: 16 patients | 2 critical | 3 pending    │
│  labs | Next action: Bed 7 vancomycin trough in 47min   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │🔴 Bed 5  │ │🔴 Bed 7  │ │🟡 Bed 3  │ │🟡 Bed 6  │   │
│  │Bashir    │ │Badal Khan│ │Lateef    │ │Waseem    │   │
│  │Exp.Lap   │ │RTA       │ │RHC Pain  │ │GSP       │   │
│  │Day 12    │ │CT fx     │ │CECT pend │ │CTSI: 6   │   │
│  │⚠️K+5.4   │ │MaxFac Mon│ │U/S done  │ │Lipase156 │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  ...           │
│  │🟢 Bed 1  │ │🟢 Bed 8  │ │🟢 Bed 11 │               │
│  │Faizan    │ │Waheed    │ │Asif      │               │
│  │On outpass│ │Mesh done │ │POD2 AppX │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                          │
│  ┌──────────┐                                           │
│  │🔵 Bed 4  │                                           │
│  │Atif      │                                           │
│  │No active │                                           │
│  │issues    │                                           │
│  └──────────┘                                           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [📸 Scanner]  [🏥 Board]  [📋 Protocols]  [🔔 Alerts]  │
└─────────────────────────────────────────────────────────┘
```

**Patient Card tap → Expanded View:**
- Full case summary (diagnosis, medications, labs, vitals)
- Action buttons: [Add Vitals] [Add Lab] [Edit Patient] [Generate Handover]
- Trend mini-charts for vitals and key labs
- Active alerts for this patient

### 5.3 Alert Banner

Critical alerts render as a persistent top-bar that cannot be dismissed without acknowledgment:

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Bed 5 K+ 6.2 mEq/L — On spironolactone  │
│ [View Protocol]  [Acknowledge]                          │
└─────────────────────────────────────────────────────────┘
```

Acknowledgment requires tapping [Acknowledge] → records `acknowledged_by` and `acknowledged_at`.
Warning alerts appear below critical alerts and CAN be dismissed.

---

## 6. ACCEPTANCE CRITERIA (Phase 0 + Phase 1)

### Phase 0: Foundation

- [ ] `docker compose up` starts FastAPI + PostgreSQL + Redis without errors
- [ ] `GET /api/v1/health` returns `{"status": "alive", "version": "0.1.0"}`
- [ ] `POST /api/v1/auth/register` creates user and returns JWT
- [ ] `POST /api/v1/auth/login` with valid credentials returns JWT
- [ ] `POST /api/v1/auth/login` with invalid credentials returns 401
- [ ] All endpoints return 401 without Bearer token
- [ ] Next.js web app loads with Inter font and dark theme
- [ ] Git repo has `main` and `dev` branches, CI runs on PR to dev
- [ ] `ruff check .` passes with zero warnings
- [ ] `pytest` runs and passes (even if only testing health endpoint)

### Phase 1: Core Agent

**Patient CRUD:**
- [ ] Create patient with all fields → returns 201 with UUID
- [ ] Create patient missing required field (e.g., no bed_number) → returns 400
- [ ] List patients returns summary with acuity counts
- [ ] List patients sorted by acuity: critical first, discharge_ready last
- [ ] Filter by ward: `?ward=ortho` returns only ortho patients
- [ ] Discharge patient changes status but doesn't delete record
- [ ] PATCH patient updates only specified fields, refreshes updated_at

**Vitals & Labs:**
- [ ] Record vitals for patient → returns 201
- [ ] Vitals with heart_rate = 135 → triggers critical alert automatically
- [ ] Get vital trends returns chronologically ascending array
- [ ] Record lab K+ = 6.2 → triggers critical alert + hyperkalemia protocol link
- [ ] Record lab Cr rise of 0.4 in 48hrs → triggers AKI Stage 1 alert
- [ ] Lab with value within normal range → no alert generated

**Alert Engine:**
- [ ] Critical alert appears as persistent banner (cannot dismiss without acknowledge)
- [ ] Acknowledging alert records user ID and timestamp
- [ ] Warning alert can be dismissed
- [ ] Patient on spironolactone + K+ 5.8 → alert message includes drug interaction flag
- [ ] All alert thresholds match Section 3 tables exactly (test each boundary)

**Clinical Protocols:**
- [ ] `POST /protocols/evaluate` with K+ = 6.2 → returns hyperkalemia severe protocol
- [ ] Hyperkalemia protocol response includes drug actions with sources
- [ ] ACS protocol triggered → returns immediate actions checklist
- [ ] Protocol endpoint works without internet (deterministic rules, no AI model call)
- [ ] All 6 test cases per protocol pass (see Section 4)

**Patient Board UI:**
- [ ] Board displays all admitted patients as cards
- [ ] Cards color-coded by acuity (red/amber/green/blue)
- [ ] Critical patients appear first in sort order
- [ ] Tap card → expanded view with vitals, labs, meds
- [ ] Call briefing summary shows correct counts
- [ ] Inter font renders correctly at all sizes

---

## 7. WHAT THIS SPEC DOES NOT COVER

The following are in CLAUDE.md but NOT specified here (future SPEC.md versions):

- **Scanner feature** (Phase 2) — OCR pipeline, image processing, structured extraction
- **ADMO generator** (Phase 2) — AI-powered admission document generation
- **Handover generator** (Phase 3) — Shift-end report compilation
- **WhatsApp integration** (Phase 3) — Daily format parsing
- **Mobile app** (Phase 4) — React Native, camera, push notifications
- **MCP servers** (Phase 5) — Protocol and drug interaction MCP
- **RAG knowledge base** (Phase 3) — Clinical guidelines retrieval

Each will get its own SPEC.md section when the corresponding phase begins.

---

## 8. TECHNICAL CONSTRAINTS

1. **All timestamps UTC.** Frontend handles timezone display.
2. **All string inputs trimmed.** Leading/trailing whitespace removed.
3. **All IDs UUID v4.** No sequential integers.
4. **Pagination on all list endpoints.** Default 20, max 100.
5. **All clinical thresholds configurable** via environment variables (not hardcoded) — different hospitals may use different thresholds.
6. **All protocol recommendations include source citation.** No unsourced clinical claims.
7. **De-identify all logs.** Patient names/IDs never appear in application logs.
8. **Python:** Type hints required. Ruff for linting. Pytest for tests.
9. **TypeScript:** Strict mode. ESLint. No `any` types.
10. **Docker:** Every service containerized. `docker compose up` is the only dev setup command.

---

*This SPEC.md is the build instruction. CLAUDE.md is the project context. Read CLAUDE.md to understand WHY. Read SPEC.md to know WHAT to build and HOW to verify it's correct.*
