# 004-P1c — Implementation Plan

**Status:** Draft | **Date:** 2026-05-01 | **Author:** SDD agent

---

## Constitution Check (v0.2.0 — Principles I–XIV)

| # | Principle | Status | Note |
|---|---|---|---|
| I | Clinical Safety Supremacy | ✅ | Shadow card is advisory-only, labeled per spec. No dosing in UI. |
| II | SDD Discipline | ✅ | Spec written first; tasks derive from spec FRs. |
| III | Scope Discipline | ✅ | P1c only; no new clinical write paths. |
| IV | Privacy by Default | ✅ | SW cache stores API responses (JSON) — PHI controlled; no logging of names. |
| V | OSS-Only Runtime | ✅ | @serwist/next is MIT. No cloud inference. |
| VI | Type Safety | ✅ | All new TS files strict; no `any`. |
| VII | Git Discipline | ✅ | Feature branch `feature/004-p1c-pwa-board`. |
| VIII | Auth Hardening Floor | ✅ | No auth changes. Bearer token already wired. |
| IX | Agent Accountability | ✅ | Shadow card cites `source: "protocol_engine"` and disclaimer verbatim. |
| X | Token Hygiene | ✅ | No new env secrets. |
| XI | Clinical Config Externalization | ✅ | No thresholds in UI code. |
| XII | Offline-First | ✅ | Entire PWA section is offline-first. |
| XIII | Shadow-First Deployment | ✅ | `/shadow/suggest` flag-gated; advisory label mandatory. |
| XIV | MEP over MVP | ✅ | Shadow endpoint + feature flag written; Gemma slot reserved but not wired. |

---

## Architecture Decisions

### AD-001 — PWA Library: @serwist/next

**Options considered:**
- `next-pwa` (zachwildblair fork) — unmaintained, webpack-only, limited Next 14 support
- `@serwist/next` — active fork of Workbox-based next-pwa; supports App Router; Vite+webpack; MIT

**Decision:** `@serwist/next` v9.x.

**Rationale:** App Router compatibility, active maintenance, Workbox strategies (`CacheFirst`, `StaleWhileRevalidate`) configurable per route, TypeScript-native.

### AD-002 — Data Fetching: SWR

**Options considered:**
- React Query / TanStack Query — excellent but larger bundle (45kb min+gz)
- SWR — 8kb, built-in stale-while-revalidate, simple deduplication
- Plain `fetch` in `useEffect` — no deduplication, no cache

**Decision:** SWR for board data. PWA SW handles offline fallback independently.

**Rationale:** Smallest viable dep; pairs naturally with the `stale-while-revalidate` SW strategy.

### AD-003 — Shadow Endpoint: Deterministic Protocol Engine Only

**Decision:** `/api/v1/shadow/suggest` delegates to the existing `ProtocolEngine` (P1b) with all three protocol evaluators. Returns the highest-severity recommendation found. No Gemma call in P1c.

**Rationale:** Shadow-First principle (XIII) requires logging telemetry before autonomous action. P1c establishes the data collection surface; Gemma wiring is a config change (model router) not a code change.

### AD-004 — Protocol Static JSON Location

**Decision:** `web/public/protocols/{hyperkalemia,aki_staging,dka}.json`. SW pre-caches via `@serwist/next` `additionalPrecacheEntries`.

**Rationale:** Zero API round-trips when offline. Content is deterministic and versioned with the app.

---

## Component Tree

```
web/src/app/
  board/
    page.tsx                  # Board shell, SWR fetch, summary bar
    _components/
      PatientCard.tsx          # Acuity-colored card
      PatientGrid.tsx          # Responsive grid
      ExpandedPatient.tsx      # Slide-up detail panel with tabs
      VitalsTab.tsx
      LabsTab.tsx
      MedsTab.tsx
      AlertsTab.tsx
      CriticalAlertBanner.tsx  # Persistent, requires ack
      WarningAlertBanner.tsx   # Dismissible
      ShadowCard.tsx           # Advisory only, flag-gated
  protocols/
    page.tsx                   # Static list from JSON
    [name]/
      page.tsx                 # Protocol detail from JSON
  offline/
    page.tsx                   # Offline fallback
web/src/lib/
  api.ts                       # Extended with new fetch functions
  protocols.ts                 # Typed loader for public JSON files
web/public/
  manifest.json
  icons/
    icon-192.png
    icon-512.png
  protocols/
    hyperkalemia.json
    aki_staging.json
    dka.json
  sw.js                        # Emitted by @serwist/next at build time
```

---

## Backend: Shadow Router

```
api/app/routers/shadow.py      # GET /shadow/suggest (new)
api/app/models/shadow_suggest.py  # ShadowSuggestResponse Pydantic model
```

`shadow.py` flow:
1. Validate `patient_id` exists (404 if not).
2. Check `FEATURE_SHADOW_SUGGEST` flag (404 if off).
3. Fetch patient's latest vitals + labs (last 24h).
4. Run all three protocol evaluators from P1b `ProtocolEngine`.
5. Return highest-severity recommendation as `ShadowSuggestResponse`.
6. Fire-and-forget: `await shadow_event_service.log(...)` — non-blocking.

---

## Service Worker Strategy

| Resource | Strategy | TTL |
|---|---|---|
| JS/CSS chunks | CacheFirst | 7 days |
| Fonts (.woff2) | CacheFirst | 30 days |
| `/api/v1/patients` | StaleWhileRevalidate | 5 min |
| `/api/v1/patients/*` (GET) | StaleWhileRevalidate | 5 min |
| Protocol JSON (`/protocols/*.json`) | CacheFirst | app version |
| Navigation fallback | Offline page | — |

---

## Risks

1. **@serwist/next build integration** — first-time setup may need `next.config.js` adjustments; mitigate by testing `next build` early in T128.
2. **SW caching PHI** — patient JSON stored in Cache API is accessible to JS on the page. Acceptable (same origin, auth token already in memory), but must not log names to SW `console.log`. Covered by NFR-003.
3. **Shadow endpoint latency** — if patient has many labs, all three evaluators run synchronously. Mitigate: cap lab lookup to last 5 records per evaluator.

---

## Definition of Done

- All 20 tasks green
- `tsc --noEmit` passes
- `pnpm lint` passes
- `pytest api/tests/ -k p1c` passes (shadow endpoint tests)
- Lighthouse PWA ≥ 90 (local)
- PHR written under `history/prompts/004-p1c-pwa-board/`
