# 004-P1c — PWA Patient Board + Offline Protocols + Shadow Smoke

**Phase:** 1c | **Sprint:** 5 days | **Status:** Draft
**Depends on:** 002-P1a (patient data layer), 003-P1b (alerts + protocols)

---

## 1. Purpose

Ship the web UI that house officers actually use during a shift: a real-time patient board,
offline-capable protocol viewer, and a shadow-mode agent suggestion card. All four areas are
covered by a single PWA shell that installs on Android Chrome and works without internet for
read-only clinical use.

---

## 2. Functional Requirements

### 2.1 Patient Board (`/board`)

| ID | Requirement | Acceptance Criterion |
|---|---|---|
| FR-001 | Fetch `GET /api/v1/patients?status=admitted&sort=acuity` on page load | Board renders within 2s on localhost; spinner shown while loading |
| FR-002 | Cards color-coded by acuity | `critical`→red `#ef4444`, `urgent`→amber `#f59e0b`, `stable`→green `#22c55e`, `discharge_ready`→blue `#3b82f6` |
| FR-003 | Summary bar above cards | Displays total/critical/urgent/stable/discharge_ready counts from `summary` field |
| FR-004 | Critical patients appear first | Acuity sort order: critical → urgent → stable → discharge_ready |
| FR-005 | Tap/click card → expanded view | Slide-up panel or page; same route `/board?patient=<id>` |
| FR-006 | Expanded view shows vitals tab | Last 5 vitals from `GET /patients/{id}/vitals` (most recent first) |
| FR-007 | Expanded view shows labs tab | All labs from `GET /patients/{id}/labs` (most recent first) |
| FR-008 | Expanded view shows meds tab | `current_medications` array from patient object |
| FR-009 | Expanded view shows alerts tab | `GET /patients/{id}/alerts?acknowledged=false` |
| FR-010 | Alert banner — critical | Persistent top-bar; cannot dismiss without acknowledgment; shows message + [Acknowledge] button |
| FR-011 | Alert banner — warning | Dismissible (local state only); appears below critical bar |
| FR-012 | Acknowledge alert | `POST /api/v1/alerts/{id}/acknowledge` called on button tap; banner removed on 200 |

### 2.2 PWA Infrastructure

| ID | Requirement | Acceptance Criterion |
|---|---|---|
| FR-013 | Service worker registered | `next build` produces `sw.js` at root; Lighthouse PWA audit passes |
| FR-014 | `manifest.json` | name="Shift Buddy", short_name="ShiftBuddy", display=standalone, theme_color="#0a0a0f", background_color="#0a0a0f", icons 192+512 |
| FR-015 | Offline fallback page | When API is unreachable, `/offline` page rendered with "You are offline — patient data may be stale" message |
| FR-016 | Static asset cache | All JS/CSS/fonts pre-cached at SW install; served from cache-first |
| FR-017 | Patient data stale-while-revalidate | Last fetched `/patients` response stored in Cache API; board renders cached data while offline |
| FR-018 | Install prompt (Android Chrome) | `beforeinstallprompt` captured; [Install App] button shown in AppShell header; clicking triggers native prompt |

### 2.3 Offline Protocol Viewer (`/protocols`)

| ID | Requirement | Acceptance Criterion |
|---|---|---|
| FR-019 | List page shows 3 protocols | hyperkalemia, AKI staging, DKA — names + one-line descriptions |
| FR-020 | Detail page `/protocols/[name]` | Tiers table + actions list + escalation criteria rendered from static JSON |
| FR-021 | Works fully offline | Protocol JSON bundled as `public/protocols/*.json`; SW pre-caches; no API call needed |
| FR-022 | No `GET /protocols` API call | Static JSON only; `GET /api/v1/protocols` is NOT consumed here |

### 2.4 Shadow Mode Smoke Endpoint + UI

| ID | Requirement | Acceptance Criterion |
|---|---|---|
| FR-023 | `GET /api/v1/shadow/suggest` | Returns deterministic suggestion based on patient vitals + labs + protocol engine; no Gemma call |
| FR-024 | Shadow response schema | `{ suggestion: string, confidence: "deterministic", source: "protocol_engine", disclaimer: "SHADOW MODE — advisory only" }` |
| FR-025 | Shadow event logged | Every call writes one row to `shadow_events` via existing `ShadowEventService` |
| FR-026 | Feature-flagged | Endpoint active only when `FEATURE_SHADOW_SUGGEST=true`; returns 404 when flag off |
| FR-027 | Shadow card in expanded view | If flag on: "Agent suggests…" card rendered with `disclaimer` text in italic; acuity badge labeled "SHADOW" |
| FR-028 | Shadow card never on board | Shadow suggestion rendered ONLY in expanded patient view, not on board cards |

---

## 3. API Consumption Map

| UI Component | Method | Endpoint | Auth |
|---|---|---|---|
| Board page | GET | `/api/v1/patients?status=admitted&sort=acuity` | Bearer |
| Expanded patient | GET | `/api/v1/patients/{id}` | Bearer |
| Vitals tab | GET | `/api/v1/patients/{id}/vitals` | Bearer |
| Labs tab | GET | `/api/v1/patients/{id}/labs` | Bearer |
| Alerts tab | GET | `/api/v1/patients/{id}/alerts?acknowledged=false` | Bearer |
| Alert acknowledge | POST | `/api/v1/alerts/{id}/acknowledge` | Bearer |
| Shadow card | GET | `/api/v1/shadow/suggest?patient_id={id}&context=vitals` | Bearer |

---

## 4. PWA Checklist (Definition of Done)

- [ ] `web/public/manifest.json` present with all required fields
- [ ] `web/public/icons/icon-192.png` and `icon-512.png` present (placeholder OK)
- [ ] `sw.js` emitted to `web/public/` on `pnpm build`
- [ ] SW pre-caches: `/`, `/board`, `/protocols`, `/offline`, all static chunks
- [ ] Cache-first strategy for static; stale-while-revalidate for `/api/v1/patients`
- [ ] `beforeinstallprompt` handler wired in `web/src/app/layout.tsx`
- [ ] `/offline` fallback served when navigator.onLine = false and API fails
- [ ] Lighthouse PWA score ≥ 90 (local Chromium run acceptable)

---

## 5. Non-Functional Requirements

| NFR | Value |
|---|---|
| NFR-001 First-paint | < 1.5s on localhost fast-3G throttle |
| NFR-002 Board re-render | Polling interval 30s or on-focus; no WebSocket |
| NFR-003 PHI in SW cache | Patient name/MRN must not appear in SW log entries |
| NFR-004 Shadow endpoint latency | p95 < 200ms (deterministic path only) |
| NFR-005 Offline indicator | Visible degraded-mode banner when navigator.onLine = false (Principle XII) |

---

## 6. Out of Scope

- React Native / Expo (P4)
- Real-time WebSocket updates
- Gemma 4 model wiring (config swap, not code)
- Call briefing summary
- Theme toggle (dark only)
- Play Store / App Store deployment
- ACS and Sepsis protocol pages (static JSON — add in P1d)

---

## 7. Review Checklist

- [ ] All FRs have verifiable ACs
- [ ] No clinical thresholds hardcoded in UI (Principle XI)
- [ ] PHI redaction: patient name not logged in SW or console
- [ ] Shadow card disclaimer text present and verbatim (Principle XIII)
- [ ] Offline fallback renders correctly with no JS errors
- [ ] `tsc --noEmit` passes
- [ ] `pnpm lint` passes (no `any` types)
- [ ] Constitution Check I–XIV walked (see plan.md)
