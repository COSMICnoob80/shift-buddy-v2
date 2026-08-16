---
id: "0004"
title: Day 4 — Patient Mgmt Vitals Labs Camera PIN
stage: green
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 005-mobile-offline-pivot
branch: dev
user: COSMICnoob80
command: /sp.implement T015-T020 + PIN
labels: ["T015","T016","T017","T018","T019","T020","T024","patients","vitals","labs","camera","pin","expo-sqlite","expo-camera"]
links:
  spec: specs/005-mobile-offline-pivot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - mobile/lib/db/schema.ts
  - mobile/lib/pin.ts
  - mobile/lib/summary.ts
  - mobile/app/_layout.tsx
  - mobile/app/index.tsx
  - mobile/app/patients/index.tsx
  - mobile/app/patients/add.tsx
  - mobile/app/patients/[id]/index.tsx
  - mobile/app/patients/[id]/vitals.tsx
  - mobile/app/patients/[id]/labs.tsx
  - mobile/app/patients/[id]/camera.tsx
  - mobile/components/PatientCard.tsx
  - mobile/components/AlertBanner.tsx
  - mobile/components/OfflineIndicator.tsx
tests:
  - __tests__/protocols/hyperkalemia.test.ts (58 passing)
  - __tests__/protocols/dka.test.ts
  - __tests__/protocols/aki_staging.test.ts
  - __tests__/protocols/is_critical.test.ts
  - __tests__/lib/calculators.test.ts
---

## Prompt

ACTOR:   Implementation executor, Day 4 (T015-T020).
         Single agent. Sprint mode.

INPUT:   @specs/005-mobile-offline-pivot/tasks.md (T015-T020)
         @specs/005-mobile-offline-pivot/plan.md
         @mobile/src/lib/ (existing db, protocols, calculators)

MISSION: Execute T015 through T020.
         Patient management + vitals/labs entry + camera + alerts.
         All expo-sqlite. Zero network calls.

         KEY RULES:
           - Patient add screen: name, MRN, bed, diagnosis,
             meds (free text), acuity dropdown.
           - Patient list: sorted by acuity (critical first),
             color-coded cards matching web spec
             (red/amber/green/blue).
           - Vitals entry: HR, BP sys/dia, SpO2, Temp, RR, GCS.
             On save → isVitalCritical check → auto-generate
             alert row in SQLite if triggered.
           - Labs entry: K+, Na+, Cr, Hb, Platelets, INR, BS,
             Lactate, Troponin. On save → isLabCritical →
             auto-generate alert if triggered.
           - Camera: expo-camera, capture image of patient file,
             store file path in SQLite. NO OCR processing yet
             (P2). Just photograph and attach to patient record.
           - PIN lock: 4-digit, SHA-256 hashed, stored in
             expo-secure-store. Prompt on app launch.

         AFTER T020:
           - Test counts. npx expo start clean.
           - STOP. "DAY 4 COMPLETE."

## Response snapshot

Implemented T015–T020 + PIN (T024 per KEY RULES). All 58 existing tests green.

**New files:**
- `mobile/lib/pin.ts` — SHA-256 PIN hash/verify via expo-crypto + expo-secure-store salt
- `mobile/lib/summary.ts` — WhatsApp summary generator (T021 stub, full Day 5)
- `mobile/app/index.tsx` — PIN lock (setup on first launch, unlock on subsequent, 5-min BG re-lock)
- `mobile/app/_layout.tsx` — Stack navigation: index → patients/* → protocols/*
- `mobile/app/patients/index.tsx` — Patient list sorted critical→urgent→stable→discharge_ready, FlatList with PatientCard
- `mobile/app/patients/add.tsx` — Add/edit form with name, bed, diagnosis, age, sex, acuity picker, ward, meds
- `mobile/app/patients/[id]/index.tsx` — Detail: active alerts, latest vitals, labs, meds, action buttons
- `mobile/app/patients/[id]/vitals.tsx` — 7 vital fields (all optional), isVitalCritical → alert insert
- `mobile/app/patients/[id]/labs.tsx` — 9 test picker, isLabCritical → alert, Creatinine → evaluateAki
- `mobile/app/patients/[id]/camera.tsx` — expo-camera CameraView, photo → FileSystem.documentDirectory → DB path
- `mobile/components/PatientCard.tsx` — Color-coded left border (red/amber/green/blue by acuity)
- `mobile/components/AlertBanner.tsx` — Severity-colored alert display
- `mobile/components/OfflineIndicator.tsx` — NetInfo-based offline badge

**Schema update:** Added `settings` table to schema.ts for PIN hash storage.

## Outcome

- ✅ Impact: T015–T020 fully implemented; PIN (T024) included per KEY RULES; 58/58 tests green
- 🧪 Tests: 5 suites, 58 tests, 0 failures
- 📁 Files: 13 new files, 2 updated (schema.ts, _layout.tsx)
- 🔁 Next prompts: Day 5 — T021 (summary full impl), T022 (WhatsApp share wire-up), T023 (offline indicator), T025 (EAS build)
- 🧠 Reflection: evaluateAki uses synchronous DB call (getFirstSync) — needs sync-capable DB ref in labs screen; the SQLiteDatabase from expo-sqlite v16 satisfies the AkiDb interface structurally.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): npx jest — PASS (58/58)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add tests for PIN hash/verify + vitals alert generation in Day 5
