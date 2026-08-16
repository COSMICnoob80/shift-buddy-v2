# 005-mobile-offline-pivot — PLAN.md

> **Branch:** `005-mobile-offline-pivot` | **Sprint:** 6 days
> **Constitution Check:** Principles I, XII, XIII, XIV, XV, XVI — all aligned (see §6)

---

## §1 Architecture Overview

```
mobile/
├── app/                        # Expo Router file-based navigation
│   ├── _layout.tsx             # Root layout — PIN gate + offline indicator
│   ├── index.tsx               # PIN lock screen
│   ├── patients/
│   │   ├── index.tsx           # Patient list
│   │   ├── add.tsx             # Add/edit patient
│   │   └── [id]/
│   │       ├── index.tsx       # Patient detail
│   │       ├── vitals.tsx      # Vitals entry
│   │       ├── labs.tsx        # Labs entry
│   │       └── camera.tsx      # Camera capture
│   ├── protocols/
│   │   ├── index.tsx           # Protocol list (searchable)
│   │   ├── [id].tsx            # Protocol detail
│   │   └── calc/[type].tsx     # Calculator screen
│   └── alerts/
│       └── index.tsx           # Alert list
├── lib/
│   ├── db/
│   │   ├── schema.ts           # CREATE TABLE statements
│   │   ├── migrate.ts          # Run-once migration on first open
│   │   └── index.ts            # DB singleton (expo-sqlite)
│   ├── protocols/
│   │   ├── hyperkalemia.ts     # Pure function — port of hyperkalemia.py
│   │   ├── dka.ts              # Pure function — port of dka.py
│   │   ├── aki_staging.ts      # Sync SQLite baseline — port of aki_staging.py
│   │   └── types.ts            # ProtocolResult, Recommendation (shared)
│   ├── clinical_config.ts      # Typed defaults (no env vars)
│   ├── is_critical.ts          # Lab + vital critical flag computation
│   ├── calculators.ts          # GFR (CKD-EPI), corrected calcium, anion gap
│   ├── summary.ts              # Patient summary text generator
│   └── pin.ts                  # PIN hash/verify (SHA-256 via expo-crypto)
├── assets/
│   └── doctor-on-duty.json     # Bundled protocol vault
└── components/
    ├── OfflineIndicator.tsx
    ├── PatientCard.tsx
    ├── AlertBanner.tsx
    └── ProtocolCard.tsx
```

---

## §2 Key Decisions

### D1: Expo Router (file-based) over React Navigation
**Rationale:** Reduces nav boilerplate, aligns with web muscle memory (App Router),
type-safe params with `expo-router/typed-routes`. No meaningful tradeoff vs RN CLI.
**Alternative rejected:** React Navigation — more flexible but more ceremony.

### D2: expo-sqlite (built-in) over WatermelonDB / SQLite via bare workflow
**Rationale:** Ships with Expo managed workflow, no native build config needed for P1.
WatermelonDB is better for large reactive datasets but adds JSI bridging complexity.
**Alternative rejected:** AsyncStorage — not relational, can't do baseline creatinine lookup.

### D3: Protocol ports as pure TypeScript functions
**Rationale:** Same logic as the Python originals, identical test cases (SPEC §4).
No class hierarchy — functions compose better and test trivially with Jest.
`aki_staging.ts` is the exception: it takes a `db: SQLiteDatabase` parameter for the
48-hour baseline lookup (mirrors the Python `AsyncSession` parameter).

### D4: doctor-on-duty.json bundled in assets (not server-fetched)
**Rationale:** Principle XVI tier 1 — deterministic, offline, instant. The JSON scaffold
is created by the dev; user fills content from the book. Copyright-safe (no verbatim AKU
Manual text; structure + our authored summaries only).

### D5: SHA-256 for PIN hashing (expo-crypto) rather than bcrypt
**Rationale:** bcrypt is not available in the Expo managed runtime. SHA-256 with a
per-device salt stored in `expo-secure-store` is sufficient for a 4-digit PIN used as
a quick-resume lock (not authentication). If threat model changes, migrate to P2 biometrics.

### D6: EAS Build (managed workflow) for Android APK
**Rationale:** Internal distribution via EAS is the fastest path to an installable APK
without Play Store submission. `eas build --profile preview --platform android`.

---

## §3 Data Flow

```
User enters lab value
  → labs.tsx validates input
  → insert into lab_results (SQLite)
  → is_critical.ts checks against clinical_config.ts thresholds
  → if critical: insert into alerts (SQLite)
  → alert banner renders from alerts table query
  → optional: evaluate protocol (hyperkalemia.ts / dka.ts)
  → protocol result shown on screen
  → share button → summary.ts → WhatsApp deep link
```

No network involved at any step. `shadow_events` table is created but never written (P1).

---

## §4 Protocol Port Strategy

Python → TypeScript mapping:

| Python | TypeScript | Notes |
|---|---|---|
| `ProtocolResult` dataclass | `ProtocolResult` interface | Same fields |
| `Recommendation` Pydantic model | `Recommendation` interface | Same fields |
| `evaluate(potassium, ecg_changes)` | `evaluate(potassium, ecgChanges)` | Same logic, camelCase |
| `AsyncSession` in aki_staging | `SQLiteDatabase` from expo-sqlite | Sync query |
| `lru_cache(maxsize=1)` on config | Module-level const object | No caching needed |

All threshold constants are copied verbatim from the Python files (same guidelines,
same clinical basis — AHA 2023, KDIGO 2023, ADA 2024).

---

## §5 WhatsApp Share Format

```
*[Patient Name]* — Bed [X]
*Dx:* [diagnosis]
*Vitals:* HR [x] | BP [x]/[x] | SpO2 [x]% | Temp [x]°C | RR [x]
*Labs:* K+ [x] | Na+ [x] | Cr [x] | Hb [x]
*⚠ Alert:* [message if any, else "None"]
*Protocol:* [severity + top recommendation if evaluated, else "—"]
— Sent via Shift Buddy
```

URL: `whatsapp://send?text=<encoded>` (iOS: `whatsapp://send`, Android: same).
Fallback: `https://wa.me/?text=<encoded>` if app not installed.

---

## §6 Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Clinical Safety | ✅ | Deterministic code only. No LLM on clinical path. |
| II. SDD Discipline | ✅ | Spec → plan → tasks before code. |
| III. Scope Discipline | ✅ | No clinical routes beyond P1 protocols. |
| IV. Privacy by Default | ✅ | Data never leaves device in P1. No logs with PHI. |
| V. OSS-Only Runtime | ✅ | No proprietary inference in P1. |
| VI. Type Safety | ✅ | TypeScript strict mode. Pydantic → interfaces. |
| VII. Git Discipline | ✅ | Feature branch `005-mobile-offline-pivot`. |
| VIII. Auth Hardening | ✅ | PIN + SHA-256 + per-device salt (floor for P1). |
| IX. Agent Accountability | ✅ | Protocols cite source in `Recommendation.source`. |
| X. Token Hygiene | ✅ | Clear between phases. PHR per session. |
| XI. Clinical Config | ✅ | `clinical_config.ts` — no literals in logic files. |
| XII. Offline-First | ✅ | 100% on-device. Hard requirement met. |
| XIII. Shadow-First | ✅ | `shadow_events` table scaffold present. No writes P1. |
| XIV. MEP over MVP | ✅ | shadow_events, feature-flag shape, agent slot dirs. |
| XV. Delivery-First | ✅ | Delivery Context table in §0. All ACs traced. |
| XVI. Model Selection | ✅ | Tier 1 (deterministic) only in P1. Tier 2 deferred to P2. |

---

## §7 Risks

1. **expo-sqlite sync API vs async** — `aki_staging.ts` needs a synchronous DB call for
   the baseline creatinine. `expo-sqlite` v14+ exposes `useSQLiteContext()` and sync
   `executeSync()`. Verify version before T006.
2. **WhatsApp deep link on iOS** — `whatsapp://send` requires WhatsApp installed; the
   `https://wa.me/` fallback covers this. Test both paths.
3. **EAS Build first-run setup** — EAS credentials, Android keystore generation, and
   `eas.json` profile config can take 30–60 min on first attempt. Allocate Day 6 morning.
