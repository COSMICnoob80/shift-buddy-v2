# SHIFT BUDDY — PROJECT SPINE

> Durable decision log. GitHub tracks *code*; this file tracks *state, decisions, and verification*.
> **Rule:** append a checkpoint entry at the end of every work session. Newest entries first in the log.

---

## Current State

| Field | Value |
|-------|-------|
| Version | v0.5.0-alpha.1 (versionCode 2) |
| APK artifact | **PUBLISHED** — [v0.5.0-alpha.1](https://github.com/COSMICnoob80/shift-buddy-v2/releases/tag/v0.5.0-alpha.1) (107 MB, debug-signed) · local copy at `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Source last edited | Sep 23 2026 |
| Last checkpoint | CP-004 |
| Next checkpoint | CP-005 — device baseline test at SIH MICU; log findings in `mobile/test-results.md` |
| Primary surface | `mobile/` (offline Android app) — web/PWA is deprecated as primary |
| Deploy target | Civilian teaching hospitals (AFMS is a dead end — no external HMS integration) |

## Branch / Release Policy

- `main` = polished showcase branch (external review, portfolio)
- Work happens on `dev` / `feature/*` / `fix/*`, PR'd into `dev`
- Non-fast-forward merges (`--no-ff`), annotated tags for releases
- **APKs ship via GitHub Releases** (2GB/file limit) — never committed to git (112MB > 100MB limit, `build/` is gitignored)

---

## Checkpoint Log

### CP-004 — 2026-09-23 — First published release; CI pipeline repaired

**Outcome:** `v0.5.0-alpha.1` published with an installable APK asset — the first downloadable build in the project's history.

**Two CI failures found and fixed (both workflow-only; never affected the app):**

1. `android-actions/setup-android@v3` requested the `tools` SDK package, which `sdkmanager` no longer provides → pinned explicit packages (`platform-tools`, `platforms;android-36`, `build-tools;36.0.0`, `ndk;27.1.12297006`) to match local Gradle resolution.
2. That fix used a **comma-separated** package string, but the action splits on **whitespace** → `Failed to find package 'platform-tools,'`. Switched to space separation.

**Verified, not assumed:**

- CI run `35873900381` — all steps green (SDK setup → typecheck → 97 tests → Gradle release → artifact → Release).
- Release asset: `app-release.apk`, 107 MB.
- **Signature compatibility confirmed** — CI APK SHA-1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625` is byte-identical to the local keystore's cert, so release builds install *over* prior local builds without an uninstall (data preserved).
- `versionCode` bumped 1 → 2 in `app.json` so the APK upgrades rather than conflicts with the Jun 19 install.

**Why this matters:** the "APK must be downloadable from the repo, versioned per iteration" requirement is now automated — pushing any `v*` tag rebuilds and republishes. No local build dependency.

**Not yet done:** the device baseline test (CP-005). Everything above is verified from source, CI logs, and APK metadata — none of it proves runtime behaviour on a real phone.

### CP-003 — 2026-09-23 — Build unblocked: root cause found, fresh APK produced

**🔴 Root cause of the stale APK — the build has been broken since v0.5.3:**

```
PluginError: Failed to resolve plugin for module "expo-secure-store"
relative to "/home/cosmicnoob/shift-buddy-v2/mobile"
  code: 'PLUGIN_NOT_FOUND'
```

`app.json` declared `"expo-secure-store"` in its `plugins` array, but:
- the package was **absent** from `package.json` dependencies
- it was **not installed** in `node_modules`
- **no source file imported it** (grep: only `app.json` + a stale `package-lock.json` reference)

The PIN feature it served was deleted in migration **v0.5.3** ("remove PIN feature: clean up stale `pin_hash`"). The dependency was removed at that time, but the `app.json` plugin entry was left behind.

**Consequence:** every `./gradlew assembleRelease` / `eas build` since v0.5.3 failed at `:expo-constants:createExpoConfig` and `:app:createBundleReleaseJsAndAssets`. **This is why no APK had been produced since Jun 19 — it was not possible to build one.**

**Fixed:**
- `mobile/app.json` — removed the orphaned `"expo-secure-store"` plugin entry (sqlite entry's trailing comma corrected)

**Result:**
```
BUILD SUCCESSFUL in 4m
523 actionable tasks: 70 executed, 453 up-to-date
APK: mobile/android/app/build/outputs/apk/release/app-release.apk  (108 MB)
Built: 2026-09-23 18:09  — now NEWER than the source (Aug 16)
```

**Verified:** `bash scripts/build-apk.sh` runs gate (typecheck ✓, 97 tests ✓) then builds clean.

**Still to do:** install the fresh APK on device and run `mobile/test-results.md` — the restart-persistence question remains unverified.

---

### CP-002 — 2026-09-23 — Automated APK release pipeline

**Added:**
- `.github/workflows/android-release.yml` — builds the APK on GitHub runners and attaches it to a GitHub Release. Triggers on `v*` tag push, plus `workflow_dispatch` for on-demand builds. Runs the quality gate (typecheck + tests) before building, so a red build can never be published
- `scripts/build-apk.sh` — local one-command build for the same artifact (runs the gate, then `./gradlew assembleRelease`)

**Key findings that shaped this:**
- `mobile/android/app/build.gradle:115` — **release builds are signed with the template debug keystore** (`debug.keystore`, alias `androiddebugkey`). No signing secrets are needed to produce an installable APK
- `mobile/` uses **npm** (`package-lock.json`), not pnpm — despite the repo's frontend convention
- Gradle wrapper is **8.14.3** → JDK 17 on CI
- The APK is ~112 MB → exceeds GitHub's 100 MB per-file git limit, so Releases (2 GB/file) is the correct distribution channel

**Why this matters:** the APK-vs-source staleness that caused every misdiagnosis in CP-000/CP-001 is now structurally prevented — every release tag produces a build from that exact commit.

**Still to do:** push the first tag (`v0.5.0-alpha.1`) to produce the first fresh APK, then install and run the device baseline test.

---

### CP-001 — 2026-09-23 — Phase 1.1 hardening (pre-rebuild)

**Changed:**
- `mobile/app/patients/index.tsx` — replaced `useEffect` with `useFocusEffect` so the list re-queries on focus (previously a patient added via the modal was invisible until pull-to-refresh or relaunch)
- `mobile/app/alerts/index.tsx` — same focus-refresh fix
- `mobile/lib/db/index.ts` — `getDb()` now resets `_dbPromise = null` on failure, so a transient migration error can no longer poison the singleton and blank every screen for the session
- `mobile/lib/db/schema.ts:21` — `patients.status` default aligned `'admitted'` → `'active'` (matches every insert path and the list filter `WHERE p.status = 'active'`)
- `mobile/app/patients/[id]/medications.tsx` — `saveMedications` converted to `useCallback([db, id])` and added to `handleAddMed` deps. **This fixed a real stale-closure path**: `handleAddMed` could capture a `saveMedications` whose `db` was still `null`, silently dropping the medication save
- `mobile/app/patients/[id]/labs.tsx` — removed unused `FlatList` import
- `mobile/__tests__/protocols/is_critical.test.ts` — updated stale assertions `message`→`instruction`, `protocol`→`protocolLink`, and Lactate `'resuscitation'`→`'sepsis'` (matches the implementation; no `resuscitation` engine exists)

**Verified:**
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 errors, 0 warnings
- `npx jest --no-color` → 8 suites, **97/97 tests pass**

**Not yet done:** APK rebuild + device test — the release pipeline is now automated (see CP-002), so a fresh APK is one tag-push away.

---

### CP-000 — 2026-09-23 — Baseline established

**Verified by reading source:**

| Feature | Reality |
|---------|---------|
| Mobile screens | 11 implemented, 2,377 lines total — **not** empty scaffolds |
| Alert pipeline | Vitals → `isVitalCritical()` → alert row; Labs → `isLabCritical()` → alert row; AKI staging auto-triggers on Creatinine. **Working** |
| Protocol invocation | Patient detail calls all 7 engines (hyperkalemia, DKA, AKI, hypoglycemia, ACS, anaphylaxis, respiratory). Triggers correctly |
| WhatsApp share | `generateSummary()` → `Linking.openURL('whatsapp://send?…')` with wa.me fallback. **Working**, but summary limited to K+/Na+/Creatinine/Hb |
| Patient CRUD | List (acuity-sorted), add/edit, discharge — working |

**Defects found:**

| Defect | Severity | Detail |
|--------|----------|--------|
| APK stale | 🔴 Critical | Built Jun 19; source edited Aug 16 — ~57 days of changes missing. **All observations of "blank data"/"broken OCR" came from this build** |
| No real OCR | 🔴 Critical | `camera.tsx` `mockExtract()` parses a **hardcoded string** `'Hb: 10.5, K+ 4.2, BP: 130/85, Cr 0.9, RBS 140'`. Photo URI passed but never read |
| Review bypasses alerts | 🔴 Critical | `review.tsx` writes to `lab_results` **without** `is_critical` and **without** generating alerts — safety gap vs `labs.tsx` |
| Calculators orphaned | 🟡 High | eGFR (CKD-EPI 2021), corrected Ca, anion gap, BMI, BSA are real + tested, but **no screen navigates to them** — deep-link only |
| Calculator scope | 🟡 High | 5 calcs vs MDCalc's 500+; only 4 hardcoded drug doses, not DB-backed |
| No scenario correlation | 🟡 High | Alerts are independent; no combined/pathology-aware guideline |
| No device test log | 🟡 High | Prior testing findings were never written down |
| No project spine | 🟢 Med | This file — created to fix that |

**Verified clean (no bug):**
- DB is file-backed (`openDatabaseAsync('shift_buddy.db')`), migrations are idempotent and non-destructive (only `DELETE` is legacy `pin_hash` cleanup)
- Save/load status keys match (`'active'`)

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Rebuild before patching | You cannot observe the current code through a 57-day-old APK |
| D2 | Delete the OCR mock; ship without it | Shipping fake extraction is a clinical safety hazard |
| D3 | Two-layer reasoning: objective core + scenario layer | Per-parameter deterministic rules stay non-negotiable; context/pathology awareness is added *above* them, never replacing them |
| D4 | Show individual **and** combined alerts simultaneously | Confirmed design intent |
| D5 | GitHub Releases for APKs, not git | 112MB > GitHub's 100MB file limit; `build/` is gitignored |
| D6 | PubMed/guideline retrieval = cache-online, serve-offline (Design A) | On-device LLM needs 0.5–1B params + ~2GB RAM; ward phones cannot carry that |
| D7 | Agentic features shadow-first, advisory-only | Constitution Principle XIII; deterministic dosing is non-negotiable |

---

## Release Runbook

```bash
# 1. Quality gate (must be green before any build)
cd mobile
npx tsc --noEmit          # 0 errors
npx expo lint             # 0 errors, 0 warnings
npx jest --no-color       # all tests pass

# 2. Build
eas build --platform android --profile preview
#    (or local: cd android && ./gradlew assembleRelease)

# 3. Publish
#    - Create GitHub Release + tag (e.g. v0.5.0-alpha.1)
#    - Attach the APK
#    - Update README download table
#    - Append a checkpoint to this SPINE
```

**Install on device:** enable "Install from unknown sources" → open the APK.

---

## Open Questions

1. Does data genuinely persist across a cold restart, in the **fresh** build? (unverified — needs CP-002 device test)
2. Which OCR engine: Google ML Kit (on-device, free) vs Tesseract? Handwriting accuracy on low-light ward photos is the risk
3. Calculator scope: expand to ~20 high-yield HO calcs, or position as "offline essentials"?
4. Licensing for Phase 5: NLM metadata + PMC-OA + WHO (non-commercial) only, or seek publisher agreements?

---

## Domain Constraints (unchanged)

- Offline-first is a hard guarantee — no spinner-waiting on network for any clinical action
- Dosing and protocols stay deterministic; no LLM decides a dose
- PHI never in logs; identifiers stripped before any cloud call
- Clinical output always cites its source
