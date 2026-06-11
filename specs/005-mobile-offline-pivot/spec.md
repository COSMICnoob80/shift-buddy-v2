# 005-mobile-offline-pivot — SPEC.md

> **Sprint:** 6 days | **Branch:** `005-mobile-offline-pivot`
> **Constitution:** v0.3.0 | **Principles in scope:** XII, XIII, XIV, XV, XVI
> **Rule:** Code that contradicts this spec is a bug.

---

## §0 Delivery Context (Principle XV)

| Dimension | Constraint |
|---|---|
| **Physical setting** | Hospital ward, standing, one hand free |
| **Network** | Mobile data, metered. HARD offline-first — no spinner on clinical path |
| **Input** | Manual one-thumb entry + camera (photo only in P1) |
| **Output** | Screen + WhatsApp text share |
| **Model tier (P1)** | Deterministic code only (Principle XVI tier 1) |
| **Model tier (P2)** | MedGemma on-device (deferred — requires AICore SDK) |

---

## §1 Purpose

Replace the web PWA board (P1c) with a native Android app that runs entirely on-device.
All clinical logic (protocols, alert thresholds, calculators) executes in-process from
SQLite state. Zero network dependency on the core clinical path.

Out of scope: cloud sync, OCR processing, MedGemma/Gemma 4 inference, biometric auth,
AKU Manual content (citation-only per copyright), backend API calls.

---

## §2 Functional Requirements

### FR-1: Protocol Engine (Day 1–2)
- **FR-1.1** `hyperkalemia.ts` — pure function, same tier logic as Python source (`hyperkalemia.py`)
- **FR-1.2** `dka.ts` — pure function, same severity classification as Python source
- **FR-1.3** `aki_staging.ts` — synchronous SQLite baseline lookup, same KDIGO thresholds
- **FR-1.4** `is_critical.ts` — lab + vital critical flags matching `clinical_config.py` defaults
- **FR-1.5** `clinical_config.ts` — typed defaults object (no env vars on a phone)
- **FR-1.6** All SPEC.md §4 test cases pass as Jest unit tests

### FR-2: Doctor On Duty Vault (Day 3)
- **FR-2.1** `doctor-on-duty.json` bundled in `mobile/assets/` — structure: `chapter → topic → content`
- **FR-2.2** Protocol list screen — searchable FlatList, instant filter, fully offline
- **FR-2.3** Protocol detail screen — renders JSON content, no network call
- **FR-2.4** Clinical calculators: CKD-EPI GFR, corrected calcium, anion gap (pure math)

### FR-3: Patient Management (Day 4)
- **FR-3.1** Add/edit patient: name, bed number, diagnosis, meds (free text), acuity
- **FR-3.2** Patient list: sorted by acuity (critical → discharge_ready), color-coded cards
- **FR-3.3** Vitals entry: HR, BP (systolic/diastolic), SpO2, Temp, RR, GCS — triggers alert engine
- **FR-3.4** Labs entry: K+, Na+, Cr, Hb, Plt, INR, Blood Sugar — triggers alert engine
- **FR-3.5** expo-camera: capture photo of paper file → store image path in SQLite (no OCR)
- **FR-3.6** Patient detail screen: latest vitals, labs, active alerts, medications

### FR-4: Share + Polish (Day 5)
- **FR-4.1** Patient summary generator — structured text block (name, bed, diagnosis, latest vitals, labs, active alert, plan)
- **FR-4.2** WhatsApp share via `Linking.openURL('whatsapp://send?text=...')` deep link
- **FR-4.3** Offline indicator — `@react-native-community/netinfo`, persistent header badge when offline
- **FR-4.4** PIN lock — 4-digit code, hashed (SHA-256) in SQLite, required on app resume after 5 min

### FR-5: Build (Day 6)
- **FR-5.1** EAS Build: internal Android APK distribution
- **FR-5.2** Tag `v0.5.0-mobile` on passing smoke test

---

## §3 SQLite Data Model

All tables live in a single `shift_buddy.db` managed by `expo-sqlite`.

```sql
CREATE TABLE patients (
  id TEXT PRIMARY KEY,            -- UUID v4
  bed_number TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  rank_title TEXT,
  diagnosis TEXT NOT NULL,
  active_problems TEXT,           -- JSON array
  current_medications TEXT,       -- JSON array of {name,dose,route,freq}
  allergies TEXT,                 -- JSON array
  acuity TEXT NOT NULL DEFAULT 'stable',
  ward TEXT,
  status TEXT NOT NULL DEFAULT 'admitted',
  last_photo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE vitals (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  recorded_at TEXT NOT NULL,
  heart_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  temperature REAL,
  spo2 INTEGER,
  respiratory_rate INTEGER,
  gcs INTEGER,
  blood_sugar REAL
);

CREATE TABLE lab_results (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  test_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  is_critical INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL
);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  severity TEXT NOT NULL,         -- 'warning' | 'critical'
  parameter TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  message TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE shadow_events (      -- MEP hinge (Principle XIV) — no rows written in P1
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  event_type TEXT NOT NULL,
  agent_recommendation TEXT,
  ho_decision TEXT,
  recorded_at TEXT NOT NULL
);
```

---

## §4 Screen Inventory

| Screen | Route | Offline | Day |
|---|---|---|---|
| PIN Lock | `/` | ✅ | 5 |
| Patient List | `/patients` | ✅ | 4 |
| Add/Edit Patient | `/patients/add` | ✅ | 4 |
| Patient Detail | `/patients/[id]` | ✅ | 4 |
| Vitals Entry | `/patients/[id]/vitals` | ✅ | 4 |
| Labs Entry | `/patients/[id]/labs` | ✅ | 4 |
| Camera Capture | `/patients/[id]/camera` | ✅ | 4 |
| Protocol List | `/protocols` | ✅ | 3 |
| Protocol Detail | `/protocols/[id]` | ✅ | 3 |
| Calculator | `/protocols/calc/[type]` | ✅ | 3 |
| Alert List | `/alerts` | ✅ | 4 |

---

## §5 Acceptance Criteria

- [ ] All SPEC.md §4 hyperkalemia test cases pass in Jest (FR-1.1)
- [ ] All SPEC.md §4 DKA test cases pass (FR-1.2)
- [ ] AKI: Cr 1.0→1.4 in 48h → Stage 1; Cr 1.0→2.5 → Stage 2; Cr 1.0→4.2 → Stage 3 (FR-1.3)
- [ ] No network call made during patient add, vitals entry, labs entry, or protocol view
- [ ] Alert generated immediately on labs entry when critical threshold crossed
- [ ] WhatsApp deep link opens with pre-filled patient summary text
- [ ] Offline badge visible in header when device has no network
- [ ] PIN prompt appears on cold start and after 5-min background
- [ ] EAS APK installs and runs on Android 12+ device
- [ ] `shadow_events` table exists in SQLite with correct schema (zero rows is correct P1 state)

---

*Constitution alignment: I(clinical safety — deterministic only), XII(offline-first), XIII(shadow-first hinge), XIV(MEP — shadow_events scaffold), XV(delivery context above), XVI(tier-1 deterministic code in P1).*
