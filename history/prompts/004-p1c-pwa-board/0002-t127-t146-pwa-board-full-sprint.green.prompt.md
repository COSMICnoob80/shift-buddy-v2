---
id: "0002"
title: T127-T146 PWA Board Full Sprint Green
stage: green
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 004-p1c-pwa-board
branch: 004-p1c-pwa-board
user: COSMICnoob80
command: "Execute T127–T146 in one pass"
labels: ["pwa","service-worker","serwist","swr","patient-board","shadow-mode","vitest","playwright","pytest","contract-tests"]
links:
  spec: specs/004-p1c-pwa-board/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - api/app/core/feature_flags.py
  - api/app/main.py
  - api/app/models/shadow_suggest.py
  - api/app/routers/shadow.py
  - api/tests/contract/test_shadow_suggest.py
  - api/tests/unit/test_shadow_suggest_model.py
  - api/tests/integration/test_router_allowlist.py
  - web/next.config.mjs
  - web/public/manifest.json
  - web/public/icons/icon-192.png
  - web/public/icons/icon-512.png
  - web/public/protocols/hyperkalemia.json
  - web/public/protocols/aki_staging.json
  - web/public/protocols/dka.json
  - web/src/sw.ts
  - web/src/app/offline/page.tsx
  - web/src/app/protocols/page.tsx
  - web/src/app/protocols/[name]/page.tsx
  - web/src/app/board/page.tsx
  - web/src/app/board/_components/SummaryBar.tsx
  - web/src/app/board/_components/PatientCard.tsx
  - web/src/app/board/_components/PatientGrid.tsx
  - web/src/app/board/_components/ExpandedPatient.tsx
  - web/src/app/board/_components/VitalsTab.tsx
  - web/src/app/board/_components/LabsTab.tsx
  - web/src/app/board/_components/MedsTab.tsx
  - web/src/app/board/_components/AlertsTab.tsx
  - web/src/app/board/_components/CriticalAlertBanner.tsx
  - web/src/app/board/_components/WarningAlertBanner.tsx
  - web/src/app/board/_components/ShadowCard.tsx
  - web/src/app/layout.tsx
  - web/src/components/AppShell.tsx
  - web/src/lib/api.ts
  - web/src/lib/protocols.ts
  - web/vitest.config.mts
  - web/tests/setup.ts
  - web/.eslintrc.json
  - web/tests/e2e/board.spec.ts
  - web/tests/unit/api.spec.ts
  - web/tests/unit/SummaryBar.spec.tsx
  - web/tests/unit/PatientCard.spec.tsx
  - web/tests/unit/CriticalAlertBanner.spec.tsx
  - web/tests/unit/ShadowCard.spec.tsx
  - web/tests/unit/AppShellOffline.spec.tsx
  - web/playwright.config.ts
tests:
  - api/tests/unit/test_shadow_suggest_model.py (5 tests — Pydantic Literal enforcement)
  - api/tests/contract/test_shadow_suggest.py (4 tests — flag gate, patient_not_found, K+6.2→severe, shadow_events write)
  - api/tests/integration/test_router_allowlist.py (allowlist updated for shadow.py)
  - web/tests/unit/PatientCard.spec.tsx (4 tests)
  - web/tests/unit/SummaryBar.spec.tsx (3 tests)
  - web/tests/unit/CriticalAlertBanner.spec.tsx (5 tests)
  - web/tests/unit/ShadowCard.spec.tsx (4 tests)
  - web/tests/unit/AppShellOffline.spec.tsx (2 tests)
  - web/tests/unit/api.spec.ts (8 tests)
  - web/tests/e2e/board.spec.ts (5 Playwright scenarios)
---

## Prompt

Execute T127–T146 for feature 004-p1c-pwa-board in one pass.

Tasks in priority order:
- T127: Install @serwist/next + SWR
- T128: web app manifest + PWA meta tags
- T129: offline fallback page
- T130: service worker (sw.ts) with CacheFirst/StaleWhileRevalidate strategies
- T131: api.ts — Patient/Vitals/Labs/Alerts/ShadowSuggest types + fetchers
- T132: SummaryBar component
- T133: PatientCard component (acuity border colors, name truncation)
- T134: PatientGrid + board page (SWR 30s poll, Suspense, useSearchParams)
- T135: ExpandedPatient slide-up panel (4 tabs, lazy SWR)
- T136: VitalsTab, LabsTab (is_critical rows), MedsTab
- T137: AlertsTab + CriticalAlertBanner (sticky, acknowledge) + WarningAlertBanner (dismiss)
- T138: protocol JSON files + protocols.ts lib
- T139: /protocols list + /protocols/[name] detail pages (generateStaticParams)
- T140: ShadowSuggestResponse Pydantic model (RED → GREEN)
- T141: GET /shadow/suggest endpoint (RED → GREEN)
- T142: ShadowCard frontend component
- T143: PWA install prompt in AppShell (beforeinstallprompt) + offline banner
- T144: Protocols nav tab in AppShell
- T145: Playwright E2E smoke tests
- T146: vitest config + unit test suite (27 tests)

Execution rules:
- TDD where meaningful
- Tailwind-only, no shadcn/Radix
- Dark theme only using existing CSS vars
- Shadow card must show "SHADOW MODE — advisory only" (Principle XIII verbatim)
- Post-T146: pnpm build succeeds, pnpm typecheck clean, pytest 238+ tests 0 failures

## Response snapshot

All 20 tasks executed across 2+ sessions. Key implementation decisions and fixes:

1. **@serwist/next config**: Next.js 14 requires `.mjs` config (not `.ts`). `navigationFallback` was removed in serwist v9; replaced with `fallbacks: { entries: [{ url: "/offline", matcher({ request }) { return request.mode === "navigate"; } }] }`.

2. **Shadow router async fix**: Initial implementation used `asyncio.ensure_future(_log())` (fire-and-forget) to log shadow events. This caused `IllegalStateChangeError` because SQLAlchemy's request-scoped session was being closed by FastAPI before the background task ran. Fixed by logging inline with `await shadow_event_service.record_protocol_evaluation(...); await db.commit()`.

3. **Pydantic v2 mock patch**: `patch("app.core.feature_flags.FeatureFlags.shadow_suggest", new=True)` fails — Pydantic v2 model fields are descriptors, not plain class attributes. Correct approach: `patch("app.routers.shadow.get_feature_flags")` with `mock_flags.return_value.shadow_suggest = True`.

4. **Vitest config**: `vitest.config.ts` → `vitest.config.mts` (esbuild treated `.ts` as CJS). `@vitejs/plugin-react` downgraded from v6 to v4 (v6 requires Vite 6, project uses Vite 5). `globals: true` added to config for jest-dom `expect` access.

5. **jsdom color normalization**: PatientCard test expected hex `#ef4444` but jsdom normalizes to `rgb(239, 68, 68)`.

6. **Router allowlist**: `test_router_allowlist.py` extended to include `shadow.py` per P1c scope.

## Outcome

- ✅ Impact: Full P1c sprint complete — PWA-capable patient board with offline support, protocol viewer, shadow mode endpoint + UI, 27 frontend unit tests, 5 E2E smoke tests, 247 backend tests (0 failures)
- 🧪 Tests: pytest 247 passed 5 skipped; pnpm test 27/27; pnpm lint clean; pnpm typecheck clean; pnpm build succeeds with 3 SSG protocol pages + sw.js
- 📁 Files: 45+ files created/modified across api/ and web/
- 🔁 Next prompts: P2 features (real-time updates via WebSocket/SSE, LLM shadow integration, mobile gesture polish)
- 🧠 Reflection: Serwist v9 API surface changed significantly from next-pwa — the fallbacks API is the main gotcha. SQLAlchemy async session lifecycle with FastAPI requires careful attention: never fire-and-forget with a request-scoped session.

## Evaluation notes (flywheel)

- Failure modes observed: (1) serwist API mismatch — `navigationFallback` removed in v9; (2) asyncio fire-and-forget with shared session causes `IllegalStateChangeError`; (3) Pydantic v2 fields not mockable as class attrs; (4) vitest ESM config with plugin-react version mismatch; (5) jsdom hex→rgb normalization in color assertions
- Graders run and results (PASS/FAIL): pytest 247/247 PASS; vitest 27/27 PASS; tsc --noEmit PASS; next lint PASS; next build PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add PatientGrid responsive CSS (2col mobile → 4col desktop) per spec note
