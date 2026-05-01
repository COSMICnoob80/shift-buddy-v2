# 004-P1c — Tasks

**Feature:** 004-p1c-pwa-board | **Sprint:** 5 days
**Continues from:** P1b T126

---

## Legend

- 🔴 Red phase = test first (TDD)
- 🟢 Green phase = implementation
- ♻️ Refactor = post-green cleanup
- 🔵 Infra = build/config (no TDD required)

---

## Task List

### T127 — PWA: Install @serwist/next and configure 🔵

**Area:** Frontend infra
**Files:** `web/package.json`, `web/next.config.js`, `web/serwist.config.ts`

- [ ] `pnpm add @serwist/next serwist` in `web/`
- [ ] Wrap `next.config.js` with `withSerwist({ ... })` — disable in `NODE_ENV=test`
- [ ] Confirm `next build` emits `public/sw.js` without errors
- [ ] Add `swr` dep: `pnpm add swr`

**AC:** `pnpm build` succeeds; `public/sw.js` present in build output.

---

### T128 — PWA: manifest.json + icons 🔵

**Area:** Frontend infra
**Files:** `web/public/manifest.json`, `web/public/icons/`

- [ ] Create `manifest.json` per FR-014 (name, short_name, display, theme_color, icons)
- [ ] Create placeholder `icon-192.png` and `icon-512.png` (solid `#6366f1`)
- [ ] Link `<link rel="manifest">` in `web/src/app/layout.tsx`
- [ ] Add `<meta name="theme-color" content="#0a0a0f">` to layout

**AC:** `manifest.json` validates with zero errors in Chrome DevTools Application tab.

---

### T129 — PWA: Offline fallback page 🔵

**Area:** Frontend
**Files:** `web/src/app/offline/page.tsx`

- [ ] Create `/offline` page with "You are offline — patient data may be stale" message
- [ ] Style with dark theme tokens; show a WiFi-off icon (inline SVG or lucide-react)
- [ ] Register offline fallback in serwist config `fallbacks: { document: "/offline" }`

**AC:** Manually toggling DevTools → Offline causes navigation to `/board` to render `/offline` page.

---

### T130 — PWA: Service Worker caching strategies 🔵

**Area:** Frontend infra
**Files:** `web/serwist.config.ts`

- [ ] `CacheFirst` for JS/CSS chunks, fonts (7d / 30d TTL)
- [ ] `StaleWhileRevalidate` for `/api/v1/patients` and `/api/v1/patients/*` GET (5min)
- [ ] `additionalPrecacheEntries` includes `/protocols/hyperkalemia.json`, `/protocols/aki_staging.json`, `/protocols/dka.json`
- [ ] `precacheEntries` includes `/_next/static/**` (auto via serwist)

**AC:** DevTools → Application → Cache Storage shows all three protocol JSON files after first load.

---

### T131 — Board: Patient API types + fetch functions 🔴🟢

**Area:** Frontend lib
**Files:** `web/src/lib/api.ts`

- [ ] **RED:** Write unit tests for `listPatients()`, `getPatient()`, `listVitals()`, `listLabs()`, `listAlerts()`, `acknowledgeAlert()` (mock fetch)
- [ ] **GREEN:** Add typed interfaces: `Patient`, `PatientListResponse`, `PatientSummary`, `VitalSigns`, `LabResult`, `Alert` (mirror OpenAPI schemas from 002/003)
- [ ] Add functions: `listPatients(params)`, `getPatient(id)`, `listVitals(id)`, `listLabs(id, testName?)`, `listAlerts(id, acknowledged?)`, `acknowledgeAlert(id)`
- [ ] Strict types; no `any`

**AC:** All unit tests pass; `tsc --noEmit` passes.

---

### T132 — Board: Summary bar component 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/SummaryBar.tsx`

- [ ] **RED:** Vitest render test: summary bar shows correct counts from `PatientSummary` prop
- [ ] **GREEN:** Render `total | 🔴 critical | 🟡 urgent | 🟢 stable | 🔵 discharge`
- [ ] Color badges match design tokens from SPEC.md §5.1

**AC:** Test passes; renders correctly with zero patients (all counts 0).

---

### T133 — Board: PatientCard component 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/PatientCard.tsx`

- [ ] **RED:** Render test: card renders bed_number, name (truncated 20 chars), provisional_diagnosis; acuity border color matches token
- [ ] **GREEN:** Implement; `onClick` prop for expand; show last alert message if present
- [ ] Apply left-border color by acuity; background `#1a1a2e`

**AC:** Tests pass; `critical` card has `#ef4444` left border.

---

### T134 — Board: PatientGrid + board page 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/page.tsx`, `web/src/app/board/_components/PatientGrid.tsx`

- [ ] **RED:** Integration test: board fetches patients, renders grid, shows summary bar
- [ ] **GREEN:** Replace placeholder `page.tsx` with SWR-powered board; 30s poll; spinner on first load
- [ ] `PatientGrid` wraps cards in CSS grid (responsive: 2col mobile, 4col desktop)
- [ ] Redirect to `/login` if no token (preserve existing behavior)

**AC:** Test passes; board renders with cached SWR data when API is offline (mock SW response).

---

### T135 — Board: Expanded patient panel 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/ExpandedPatient.tsx`

- [ ] **RED:** Render test: panel shows patient name, 4 tabs (Vitals, Labs, Meds, Alerts)
- [ ] **GREEN:** Slide-up panel (CSS transform); URL param `?patient=<id>`; close on backdrop click or Escape key
- [ ] Load data for active tab lazily (SWR key changes on tab switch)

**AC:** Tests pass; URL updates when panel opens/closes; Escape closes.

---

### T136 — Board: VitalsTab + LabsTab + MedsTab 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/VitalsTab.tsx`, `LabsTab.tsx`, `MedsTab.tsx`

- [ ] **RED:** Render tests for each tab (snapshot or assertion-based)
- [ ] **GREEN:** VitalsTab: table of last 5 vitals (most recent first); LabsTab: table sorted by `recorded_at` desc; `is_critical=true` rows highlighted red; MedsTab: medication list with name, dose, route, frequency
- [ ] Empty states for all three

**AC:** All render tests pass; `is_critical` lab row has red text.

---

### T137 — Board: AlertsTab + CriticalAlertBanner 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/AlertsTab.tsx`, `CriticalAlertBanner.tsx`, `WarningAlertBanner.tsx`

- [ ] **RED:** Test: critical alert banner renders acknowledge button; warning banner renders dismiss button; acknowledge calls `acknowledgeAlert(id)`
- [ ] **GREEN:** `CriticalAlertBanner` — sticky top bar, red bg, message + [Acknowledge]; `WarningAlertBanner` — amber bar, [×] dismiss; `AlertsTab` — lists all unacked alerts for the patient
- [ ] On acknowledge 200: remove banner from DOM and refetch alerts tab

**AC:** Tests pass; banner cannot be dismissed without API call for critical; warning dismisses locally.

---

### T138 — Protocols: Static JSON files 🔵

**Area:** Frontend data
**Files:** `web/public/protocols/hyperkalemia.json`, `aki_staging.json`, `dka.json`

- [ ] Encode hyperkalemia tiers (5.5-5.9 Moderate, 6.0-6.4 Severe, ≥6.5 Emergency) as JSON with `{ tiers: [...], escalation: string }`
- [ ] Encode AKI staging (Stage 1/2/3 criteria + actions)
- [ ] Encode DKA (Mild/Moderate/Severe pH/HCO3/management)
- [ ] Add TypeScript type `ProtocolData` in `web/src/lib/protocols.ts`; loader reads from `/protocols/*.json`

**AC:** `JSON.parse(fs.readFileSync(...))` validates against `ProtocolData` type; no missing fields.

---

### T139 — Protocols: List + detail pages 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/protocols/page.tsx`, `web/src/app/protocols/[name]/page.tsx`

- [ ] **RED:** Render test: list shows 3 protocols with description; detail for `hyperkalemia` shows all 4 tiers
- [ ] **GREEN:** List: static — no fetch, just map over known names; Detail: read JSON via `protocols.ts` loader; render tiers table + escalation callout
- [ ] Static generation (`generateStaticParams`) for protocol detail pages (works offline)

**AC:** Tests pass; `next build` generates `/protocols/hyperkalemia` as static HTML.

---

### T140 — Backend: ShadowSuggestResponse model 🔴🟢

**Area:** Backend
**Files:** `api/app/models/shadow_suggest.py`

- [ ] **RED:** Unit test: `ShadowSuggestResponse` validates correct fields; rejects extra fields
- [ ] **GREEN:** Pydantic v2 model: `suggestion: str`, `confidence: Literal["deterministic"]`, `source: Literal["protocol_engine"]`, `disclaimer: Literal["SHADOW MODE — advisory only"]`, `protocol: str | None`, `severity: str | None`

**AC:** Test passes; `mypy --strict` passes on this file.

---

### T141 — Backend: shadow.py router 🔴🟢

**Area:** Backend
**Files:** `api/app/routers/shadow.py`, `api/app/main.py` (include router)

- [ ] **RED:** Integration tests: (a) `FEATURE_SHADOW_SUGGEST=false` → 404; (b) unknown patient → 404; (c) valid patient with K+=6.2 lab → returns `severity="severe"`; (d) shadow_events row written
- [ ] **GREEN:** `GET /api/v1/shadow/suggest?patient_id=&context=vitals`; fetches patient, latest vitals+labs, runs `ProtocolEngine` evaluators, returns `ShadowSuggestResponse`; logs `await shadow_event_service.log(...)` fire-and-forget
- [ ] Include router in `main.py` under prefix `/api/v1`

**AC:** All 4 integration tests pass; `ruff check` and `mypy --strict` pass.

---

### T142 — Board: Shadow card in expanded view 🔴🟢

**Area:** Frontend
**Files:** `web/src/app/board/_components/ShadowCard.tsx`

- [ ] **RED:** Test: shadow card renders disclaimer in italic; hidden when `NEXT_PUBLIC_FEATURE_SHADOW_SUGGEST=false`
- [ ] **GREEN:** Fetch `GET /api/v1/shadow/suggest?patient_id={id}&context=vitals`; render card with indigo left-border, "Agent suggests…" label, suggestion text, disclaimer in italic gray; "SHADOW" badge
- [ ] If fetch fails (flag off / error): render nothing silently

**AC:** Tests pass; disclaimer text matches verbatim: "SHADOW MODE — advisory only".

---

### T143 — PWA: Install prompt handler 🔵

**Area:** Frontend
**Files:** `web/src/app/layout.tsx` (or `AppShell.tsx`)

- [ ] Listen for `beforeinstallprompt` event; stash `deferredPrompt`
- [ ] Show [Install App] button in `AppShell` header when prompt available; hide after install or dismiss
- [ ] `userChoice` result logged to `console.info` only (no PHI)

**AC:** Button appears in Chrome DevTools → Application → Manifest → "Add to homescreen" flow triggers.

---

### T144 — Offline: Degraded-mode indicator 🔴🟢

**Area:** Frontend
**Files:** `web/src/components/AppShell.tsx`

- [ ] **RED:** Test: AppShell renders offline banner when `navigator.onLine = false` (mock)
- [ ] **GREEN:** Listen to `online`/`offline` window events; show amber banner "Offline — showing cached data" when offline; hide when online restored

**AC:** Test passes; banner toggles correctly in Playwright with `context.setOffline(true)`.

---

### T145 — Integration: Playwright E2E smoke tests 🔴🟢

**Area:** E2E tests
**Files:** `web/tests/e2e/board.spec.ts`

- [ ] **RED:** Write E2E tests: (a) board loads with ≥1 patient card; (b) click card → expanded view opens; (c) Alerts tab shows alert; (d) click Acknowledge → alert disappears
- [ ] **GREEN:** Ensure tests pass against `docker compose up` stack
- [ ] Add test for offline: `context.setOffline(true)` → board shows cached data or `/offline` page

**AC:** All 4 E2E scenarios green in local Playwright run.

---

### T146 — CI + lint + mypy 🔵

**Area:** CI / quality
**Files:** `.github/workflows/ci.yml` (if exists) or local `Makefile`

- [ ] `pnpm lint` passes (no `any` in new files)
- [ ] `tsc --noEmit` passes
- [ ] `mypy --strict api/app/routers/shadow.py api/app/models/shadow_suggest.py` passes
- [ ] `ruff check api/` passes
- [ ] `pytest api/tests/ -k "shadow"` passes (T141 tests)
- [ ] `pnpm build` succeeds (produces `sw.js`, static protocol pages)

**AC:** All checks green; no new CI failures introduced.

---

## Dependency Order

```
T127 (pwa deps)
  → T128 (manifest)
    → T129 (offline page)
      → T130 (SW strategies) → T143 (install prompt)
T131 (api types)
  → T132 (summary bar)
  → T133 (patient card)
    → T134 (board page + grid)
      → T135 (expanded panel)
        → T136 (vitals/labs/meds tabs)
        → T137 (alerts + banners)
          → T140 (shadow model)
            → T141 (shadow router)
              → T142 (shadow card)
T138 (protocol JSON) → T139 (protocols pages)
T127+T128+T129+T130+T134+T137+T139+T141+T142+T144 → T145 (E2E)
All → T146 (CI)
```

**Total tasks:** 20 (T127–T146)
