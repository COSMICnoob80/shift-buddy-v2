# 005-mobile-offline-pivot — TASKS.md

> **Sprint:** 6 days | **Branch:** `005-mobile-offline-pivot`
> **Total tasks:** 25 | **All tasks are offline-first by default**

---

## Day 1–2: Expo Scaffold + SQLite + Protocol Ports

### T001 — Expo RN app scaffold
**Type:** infra | **Day:** 1
Run `npx create-expo-app@latest mobile --template` (TypeScript, Expo Router).
Verify: `cd mobile && npx expo start` opens Expo Go without errors.
Config: `app.json` — name `Shift Buddy`, bundle ID `com.shiftbuddy.mobile`, Android minSdk 31.

### T002 — Core dependency install
**Type:** infra | **Day:** 1 | **Depends:** T001
Install: `expo-sqlite`, `expo-camera`, `expo-file-system`, `expo-crypto`,
`expo-secure-store`, `@react-native-community/netinfo`, `expo-sharing`.
Verify: `npx expo install --fix` passes with no native module errors.

### T003 — SQLite schema + migration runner
**Type:** red→green | **Day:** 1 | **Depends:** T002
Create `mobile/lib/db/schema.ts` — 5 CREATE TABLE statements (patients, vitals,
lab_results, alerts, shadow_events) from spec §3.
Create `mobile/lib/db/migrate.ts` — runs schema on first open via `db.execAsync()`.
Create `mobile/lib/db/index.ts` — exports `getDb()` singleton.
**Test:** migration runs without error; `shadow_events` table exists post-migration.

### T004 — Port `hyperkalemia.ts`
**Type:** red→green | **Day:** 1 | **Depends:** T003
Create `mobile/lib/protocols/hyperkalemia.ts`.
Copy tier thresholds verbatim from `api/app/protocols/hyperkalemia.py`.
Export `evaluate(potassium: number, ecgChanges: boolean): ProtocolResult`.
**Test cases (must all pass):**
- K+ = 5.4 → severity `normal`, recommendations `[]`
- K+ = 5.6 → severity `moderate`, alert_generated `true`
- K+ = 6.0, ecgChanges false → severity `severe`
- K+ = 6.0, ecgChanges true → severity `emergency_ecg`
- K+ = 6.7 → severity `emergency`, escalation includes "CALL SENIOR"

### T005 — Port `dka.ts`
**Type:** red→green | **Day:** 1 | **Depends:** T003
Create `mobile/lib/protocols/dka.ts`.
Export `evaluate(bloodSugar, ph, hco3, mentalStatus): ProtocolResult`.
**Test cases:**
- pH 7.28, HCO3 16 → `mild`
- pH 7.10, HCO3 12 → `moderate`
- pH 6.95, HCO3 8 → `severe`, escalation includes "CALL SENIOR STAT"
- pH 6.95, HCO3 8, mentalStatus `obtunded` → severe + airway recommendation

### T006 — Port `aki_staging.ts`
**Type:** red→green | **Day:** 2 | **Depends:** T003
Create `mobile/lib/protocols/aki_staging.ts`.
Function signature: `evaluateAki(current: number, patientId: string, recordedAt: Date, db: SQLiteDatabase): ProtocolResult`.
Baseline lookup: earliest Creatinine row in `lab_results` within 48h of `recordedAt`.
Reuse `_classify()` and `_buildResult()` logic from Python source.
**Test cases (use in-memory SQLite populated with fixture rows):**
- No baseline → `insufficient_data`
- Cr 1.0 → 1.2 (delta 0.2) → `normal`
- Cr 1.0 → 1.4 (delta 0.4) → `stage_1`
- Cr 1.0 → 2.5 (ratio 2.5) → `stage_2`
- Cr 1.0 → 4.2 (value ≥ 4.0) → `stage_3`, escalation present

### T007 — `is_critical.ts`
**Type:** red→green | **Day:** 2 | **Depends:** T005
Create `mobile/lib/is_critical.ts`.
Export `isLabCritical(testName: string, value: number): boolean`.
Export `isVitalCritical(param: string, value: number): 'warning' | 'critical' | null`.
Use thresholds from `clinical_config.ts` (T008 dependency — write after T008).
**Test:** K+ 6.1 → critical; K+ 5.7 → warning; K+ 5.0 → null.

### T008 — `clinical_config.ts`
**Type:** infra | **Day:** 2
Create `mobile/lib/clinical_config.ts`.
Export a `const CLINICAL_CONFIG` typed object with same default values as
`api/app/core/clinical_config.py` (lab thresholds + vital thresholds).
No env vars — phone runtime uses fixed defaults.
**Test:** `CLINICAL_CONFIG.lab_k_critical_high === 6.0`.

### T009 — Protocol unit test suite
**Type:** test | **Day:** 2 | **Depends:** T004, T005, T006, T007, T008
Create `mobile/__tests__/protocols/` with `hyperkalemia.test.ts`, `dka.test.ts`,
`aki_staging.test.ts`, `is_critical.test.ts`.
All SPEC.md §4 test cases must pass. Run with `npx jest`.
**Gate:** 0 failing tests before proceeding to Day 3.

---

## Day 3: Doctor On Duty Vault + Calculators

### T010 — `doctor-on-duty.json` scaffold
**Type:** content | **Day:** 3 | **Depends:** T001
Create `mobile/assets/doctor-on-duty.json`.
Structure: `{ chapters: [{ id, title, topics: [{ id, title, content: string }] }] }`.
Populate with 5 chapters matching SPEC §4 protocols:
Hyperkalemia, DKA, AKI, ACS/Chest Pain, Sepsis/SIRS.
Content fields: our authored summaries citing source guidelines (not verbatim AKU text).

### T011 — Protocol list screen
**Type:** red→green | **Day:** 3 | **Depends:** T010
Create `mobile/app/protocols/index.tsx`.
FlatList of chapters/topics from bundled JSON. Search bar filters by title.
Tapping a topic navigates to T012. No network calls. Renders instantly.
**AC:** search "hyper" surfaces Hyperkalemia entry within 1 render cycle.

### T012 — Protocol detail screen
**Type:** red→green | **Day:** 3 | **Depends:** T011
Create `mobile/app/protocols/[id].tsx`.
Renders full `content` field from JSON. Back navigation to list.
**AC:** opens without network; back button returns to list state (search preserved).

### T013 — Clinical calculators module
**Type:** red→green | **Day:** 3
Create `mobile/lib/calculators.ts`.
Export three pure functions:
- `calcGFR(sex, age, creatinine): number` — CKD-EPI 2021 (race-free)
- `calcCorrectedCalcium(calcium, albumin): number` — standard formula
- `calcAnionGap(na, cl, hco3): number` — standard formula
**Test:** known reference values for each calculator.

### T014 — Calculator screens
**Type:** red→green | **Day:** 3 | **Depends:** T013
Create `mobile/app/protocols/calc/[type].tsx`.
Numeric input fields → computed result displayed inline. No submit button needed
(live calculation on change). Types: `gfr`, `corrected-calcium`, `anion-gap`.

---

## Day 4: Patient Management + Camera

### T015 — Add/edit patient form
**Type:** red→green | **Day:** 4 | **Depends:** T003
Create `mobile/app/patients/add.tsx`.
Fields: name, bed number, diagnosis, age, sex, acuity (picker), ward, meds (free text).
On save: generate UUID v4, insert into `patients` SQLite.
Edit mode: pre-populate from patient ID param.

### T016 — Patient list screen
**Type:** red→green | **Day:** 4 | **Depends:** T015
Create `mobile/app/patients/index.tsx`.
Query all `admitted` patients, sort by acuity (critical→urgent→stable→discharge_ready).
Render `PatientCard` component: color-coded border (red/amber/green/blue), name, bed, diagnosis, active alert count.

### T017 — Vitals entry screen
**Type:** red→green | **Day:** 4 | **Depends:** T003, T007
Create `mobile/app/patients/[id]/vitals.tsx`.
Input: HR, SBP, DBP, SpO2, Temp, RR, GCS. All optional (partial recording OK per SPEC §1.3).
On save: insert vitals row, call `isVitalCritical()` for each non-null field,
insert alert row for any critical/warning result.
**AC:** HR 135 entered → critical alert row created immediately.

### T018 — Labs entry screen
**Type:** red→green | **Day:** 4 | **Depends:** T003, T007
Create `mobile/app/patients/[id]/labs.tsx`.
Input: test name picker (K+, Na+, Cr, Hb, Plt, INR, Blood Sugar) + value + unit.
On save: insert lab row, call `isLabCritical()`, insert alert row if critical.
For Creatinine: call `evaluateAki()` — append AKI stage to alert if triggered.
**AC:** K+ 6.2 → critical alert + hyperkalemia protocol link shown immediately.

### T019 — Patient detail screen
**Type:** red→green | **Day:** 4 | **Depends:** T016
Create `mobile/app/patients/[id]/index.tsx`.
Sections: active alerts (from `alerts` table), latest vitals row, latest labs (one per test),
medications list. Action buttons: [Add Vitals] [Add Labs] [Camera] [Share].

### T020 — Camera capture screen
**Type:** red→green | **Day:** 4 | **Depends:** T002, T019
Create `mobile/app/patients/[id]/camera.tsx`.
Use `expo-camera` CameraView. Capture → save to `FileSystem.documentDirectory`.
Store path in `patients.last_photo_path`. No OCR — photo is reference only in P1.
**AC:** photo path persists across app restart.

---

## Day 5: Share + Polish

### T021 — Patient summary text generator
**Type:** red→green | **Day:** 5 | **Depends:** T019
Create `mobile/lib/summary.ts`.
Export `generateSummary(patientId: string, db: SQLiteDatabase): Promise<string>`.
Format per plan §5 WhatsApp format. Bold via `*asterisks*`.
**Test:** known DB fixture → expected string output (snapshot test).

### T022 — WhatsApp share
**Type:** red→green | **Day:** 5 | **Depends:** T021
Wire [Share] button in T019 to call `generateSummary()` then:
`Linking.openURL('whatsapp://send?text=' + encodeURIComponent(text))`.
Fallback: `https://wa.me/?text=<encoded>` if `whatsapp://` scheme unavailable.
**AC:** tapping Share on a patient with at least one vital opens WhatsApp with pre-filled text.

### T023 — Offline indicator component
**Type:** red→green | **Day:** 5 | **Depends:** T002
Create `mobile/components/OfflineIndicator.tsx`.
Use `@react-native-community/netinfo` — subscribe to connection state.
When offline: render amber badge `● Offline` in root layout header.
When online: badge hidden (network is enhancement, not required).
**AC:** badge appears within 500 ms of disabling device WiFi/data (airplane mode test).

### T024 — PIN lock screen
**Type:** red→green | **Day:** 5 | **Depends:** T003
Create `mobile/app/index.tsx` (PIN lock) and `mobile/lib/pin.ts`.
PIN setup on first launch: 4-digit entry + confirm → hash with SHA-256 + per-device salt
(salt from `expo-secure-store`) → store hash in SQLite `settings` key-value table.
Lock re-engages after 5-min background (via `AppState` listener).
**AC:** wrong PIN rejected; correct PIN grants access; lock re-engages after 5-min BG.

---

## Day 6: Build + Tag

### T025 — EAS Build config + v0.5.0-mobile tag
**Type:** infra | **Day:** 6
Create `mobile/eas.json` with `preview` profile: Android APK, internal distribution.
Update `mobile/app.json`: version `0.5.0`, Android `versionCode 1`.
Run `eas build --profile preview --platform android`.
On successful install + smoke test: `git tag v0.5.0-mobile && git push origin v0.5.0-mobile`.
**Smoke test checklist:**
- [ ] App installs on Android 12+ device
- [ ] PIN lock works on cold start
- [ ] Add patient → appears in list with correct acuity color
- [ ] Enter K+ 6.2 → critical alert shown immediately
- [ ] Protocol list opens offline
- [ ] Share → WhatsApp opens with patient text

---

## Task Summary

| Day | Tasks | Theme |
|---|---|---|
| 1 | T001–T005 | Scaffold + hyperkalemia + DKA ports |
| 2 | T006–T009 | AKI port + is_critical + config + tests |
| 3 | T010–T014 | Protocol vault + calculators |
| 4 | T015–T020 | Patient CRUD + vitals + labs + camera |
| 5 | T021–T024 | Share + offline indicator + PIN |
| 6 | T025 | EAS build + tag |

**Gate before Day 3:** T009 (all protocol tests green).
**Gate before Day 5:** T019 (patient detail screen works end-to-end).
**Gate before tagging:** T025 smoke test checklist complete.
