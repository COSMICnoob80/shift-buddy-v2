---
id: "0002"
title: Day 1-2 Expo Scaffold + Protocol Ports
stage: green
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 005-mobile-offline-pivot
branch: dev
user: COSMICnoob80
command: sp.implement (Day 1-2 T001–T009)
labels: ["expo", "sqlite", "protocols", "typescript", "offline-first", "jest"]
links:
  spec: specs/005-mobile-offline-pivot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - mobile/app.json
  - mobile/package.json
  - mobile/lib/db/schema.ts
  - mobile/lib/db/migrate.ts
  - mobile/lib/db/index.ts
  - mobile/lib/protocols/types.ts
  - mobile/lib/protocols/hyperkalemia.ts
  - mobile/lib/protocols/dka.ts
  - mobile/lib/protocols/aki_staging.ts
  - mobile/lib/clinical_config.ts
  - mobile/lib/is_critical.ts
  - mobile/__mocks__/expo-sqlite.ts
  - mobile/__tests__/protocols/hyperkalemia.test.ts
  - mobile/__tests__/protocols/dka.test.ts
  - mobile/__tests__/protocols/aki_staging.test.ts
  - mobile/__tests__/protocols/is_critical.test.ts
tests:
  - __tests__/protocols/hyperkalemia.test.ts (8 cases)
  - __tests__/protocols/dka.test.ts (9 cases)
  - __tests__/protocols/aki_staging.test.ts (7 cases)
  - __tests__/protocols/is_critical.test.ts (22 cases)
---

## Prompt

ACTOR:   Implementation executor for 005-mobile-offline-pivot.
         Bound by constitution v0.3.0 (Principles XV + XVI binding).
         Single agent. Sprint mode. Day 1-2 scope.

INPUT:   @specs/005-mobile-offline-pivot/tasks.md
         @specs/005-mobile-offline-pivot/plan.md
         @specs/005-mobile-offline-pivot/spec.md
         @.specify/memory/constitution.md
         @api/app/protocols/hyperkalemia.py (port source)
         @api/app/protocols/dka.py (port source)
         @api/app/protocols/aki_staging.py (port source)
         @api/app/services/is_critical.py (port source)
         @api/app/core/clinical_config.py (port source)

MISSION: Execute Day 1-2 tasks (T001 through T009 per tasks.md —
         verify actual numbering before executing).
         Expo scaffold + SQLite schema + protocol ports.

         RULES:
           - Principle XV is supreme: everything runs on-device.
             No fetch() to any server in any protocol or data function.
           - Port Python protocols to TypeScript as PURE FUNCTIONS.
             Same logic, same boundary values, same test cases.
           - expo-sqlite v14+ with executeSync for AKI baseline lookup.
           - TypeScript strict. No `any`.
           - Test protocol ports against same boundary cases as
             the Python originals (K+ 6.0 → false, K+ 6.1 → true, etc).

         AFTER last Day 1-2 task:
           - Report: which tasks done, test counts.
           - npx expo start must launch without errors.
           - STOP. "DAY 1-2 COMPLETE — awaiting review."

## Response snapshot

Executed T001–T009 in full:
- T001: Expo Router TypeScript scaffold via `npx create-expo-app@latest . --template default`
- T002: Installed expo-sqlite v16, expo-camera, expo-file-system, expo-crypto, expo-secure-store, @react-native-community/netinfo, expo-sharing
- T003: Created lib/db/schema.ts (5 tables), migrate.ts (runMigrations), index.ts (getDb singleton)
- T004: Ported hyperkalemia.py → hyperkalemia.ts (pure function, same AHA 2023 thresholds)
- T005: Ported dka.py → dka.ts (pure function, same ADA 2024 / WHO thresholds)
- T006: Ported aki_staging.py → aki_staging.ts (uses expo-sqlite v16 getFirstSync for 48h baseline lookup)
- T007: Created is_critical.ts (isLabCritical + isVitalCritical)
- T008: Created clinical_config.ts (CLINICAL_CONFIG const, typed thresholds, no env vars)
- T009: 46 Jest tests (ts-jest, node env, expo-sqlite mocked), all passing

Key insight: expo-sqlite v16 provides `getFirstSync<T>()` and `openDatabaseSync` — the plan §7 risk "verify version before T006" was resolved. AKI staging uses structural typing (`AkiDb` interface) so tests pass a jest mock without loading the native module. One test boundary corrected: pH 7.00 uses strict `<` in the Python source, so 7.00 is NOT severe (moderate boundary confirmed).

## Outcome

- ✅ Impact: Day 1-2 complete — Expo scaffold + SQLite schema + 5 protocol TypeScript ports + 46 tests green
- 🧪 Tests: 46 passed / 4 suites (hyperkalemia 8, dka 9, aki_staging 7, is_critical 22)
- 📁 Files: 16 new files created
- 🔁 Next prompts: Day 3 (T010–T014) — doctor-on-duty.json, protocol screens, calculators
- 🧠 Reflection: expo-sqlite v16 sync API confirmed. AkiDb interface pattern (structural typing for testability) is the clean approach. DKA boundary at pH 7.00 is exclusive — important clinical correctness note.

## Evaluation notes (flywheel)

- Failure modes observed: 1 test had wrong boundary assertion (pH 7.00 → severe; corrected to moderate per strict < in source)
- Graders run and results (PASS/FAIL): npx jest — 46/46 PASS; npx expo start — Metro launched on :8081 PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Day 3 tasks — T010 doctor-on-duty.json + protocol vault screens
