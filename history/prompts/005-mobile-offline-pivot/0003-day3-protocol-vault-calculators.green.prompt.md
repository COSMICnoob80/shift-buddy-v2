---
id: "0003"
title: Day 3 — Protocol Vault + Calculators
stage: green
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 005-mobile-offline-pivot
branch: dev
user: COSMICnoob80
command: Day 3 sprint — T010-T014
labels: ["mobile","offline","protocols","calculators","expo-router"]
links:
  spec: specs/005-mobile-offline-pivot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - mobile/assets/doctor-on-duty.json
  - mobile/app/protocols/index.tsx
  - mobile/app/protocols/[id].tsx
  - mobile/lib/calculators.ts
  - mobile/app/protocols/calc/[type].tsx
  - mobile/__tests__/lib/calculators.test.ts
tests:
  - __tests__/lib/calculators.test.ts (12 tests — calcGFR, calcCorrectedCalcium, calcAnionGap)
---

## Prompt

ACTOR:   Implementation executor, Day 3 (T010-T014).
         Single agent. Sprint mode.

INPUT:   @specs/005-mobile-offline-pivot/tasks.md (T010-T014)
         @specs/005-mobile-offline-pivot/plan.md
         @mobile/src/lib/protocols/ (ported protocols from Day 1-2)

MISSION: Execute T010 through T014.
         Doctor On Duty vault (structured JSON skeleton),
         searchable protocol list screen, protocol detail screen,
         clinical calculators (GFR, corrected calcium, anion gap).
         All offline. Zero network calls.

         AFTER T014:
           - Test counts. npx expo start clean.
           - STOP. "DAY 3 COMPLETE."

## Response snapshot

Executed T010-T014 in full:
- T010: Created `mobile/assets/doctor-on-duty.json` with 5 chapters (Hyperkalemia, DKA, AKI, ACS/Chest Pain, Sepsis/SIRS), 17 topics total, clinical content authored from guidelines (AHA 2023, ADA 2024, KDIGO 2023, ESC 2023, SSC 2021).
- T011: Created `mobile/app/protocols/index.tsx` — FlatList with `useMemo` search filtering; no network; renders instantly from bundled JSON.
- T012: Created `mobile/app/protocols/[id].tsx` — detail screen reads topic from bundled JSON by ID; works fully offline.
- T013: Created `mobile/lib/calculators.ts` — three pure functions: `calcGFR` (CKD-EPI 2021 race-free), `calcCorrectedCalcium`, `calcAnionGap`.
- T014: Created `mobile/app/protocols/calc/[type].tsx` — single route handles `gfr`, `corrected-calcium`, `anion-gap` calc screens with live calculation on input change.

Bug found and fixed: initial test for CKD-EPI assumed female eGFR > male at same creatinine; corrected to match formula behaviour (male higher because female kappa=0.7 means same creatinine represents proportionally more impairment for females).

## Outcome

- ✅ Impact: T010-T014 complete. Doctor On Duty vault, protocol navigation screens, and three clinical calculators delivered fully offline.
- 🧪 Tests: 58 passed (46 Day1-2 protocols + 12 new calculator tests). 0 failing.
- 📁 Files: 6 new files created. 0 existing files modified.
- 🔁 Next prompts: Day 4 (T015-T020) — Patient CRUD, vitals entry, labs entry, camera.
- 🧠 Reflection: CKD-EPI 2021 sex coefficient behaviour is counter-intuitive: females get lower eGFR at the same creatinine because the formula accounts for lower baseline creatinine production in females — a raised creatinine is proportionally more abnormal for them. Worth noting for Day 4 labs screen integration.

## Evaluation notes (flywheel)

- Failure modes observed: One test assertion had clinically incorrect premise (female eGFR > male assumption); corrected before committing.
- Graders run and results (PASS/FAIL): npx jest — PASS (58/58)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
