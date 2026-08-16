---
id: "0001"
title: P1c spec plan tasks PWA board
stage: spec
date: 2026-05-01
surface: agent
model: claude-sonnet-4-6
feature: 004-p1c-pwa-board
branch: dev
user: COSMICnoob80
command: manual (sprint planning pass)
labels: ["spec","plan","tasks","pwa","patient-board","shadow-mode","offline"]
links:
  spec: specs/004-p1c-pwa-board/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/004-p1c-pwa-board/spec.md
  - specs/004-p1c-pwa-board/plan.md
  - specs/004-p1c-pwa-board/tasks.md
tests:
  - (none run — authoring pass only)
---

## Prompt

ACTOR:   Spec author for P1c-PWA (Patient Board + PWA + Offline).
         Bound by @.specify/memory/constitution.md v0.2.0.
         Especially Principles I, III, XII (Offline-First),
         XIII (Shadow-First), XIV (MEP).
         Single agent. SPEED PRIORITY — spec can be shorter than
         previous phases. ~200 lines max.

INPUT:   @SPEC.md §5 (UI design tokens, patient board)
         @SPEC.md §6 (P1 acceptance criteria — patient board section)
         @.specify/memory/constitution.md
         @specs/002-p1a-patient-data-layer/contracts/openapi.yaml
         @specs/003-p1b-alerts-protocols/contracts/openapi.yaml
         @api/app/routers/ (existing endpoints)
         @web/src/ (existing shell)

         P1c-PWA SCOPE (combined — ship in 5 days):
           1. Patient board page (/board):
              - Fetch GET /patients, display as cards
              - Color-coded by acuity (red/amber/green/blue)
              - Critical patients sorted first
              - Summary bar: total/critical/urgent/stable/discharge
              - Tap card → expanded view: vitals, labs, meds, alerts
              - Alert banner: critical = persistent, warning = dismissible
              - Acknowledge alert from UI (POST /alerts/:id/acknowledge)

           2. PWA infrastructure:
              - next-pwa or @serwist/next for service worker
              - manifest.json (name, icons, theme_color, display: standalone)
              - Offline cache: static assets + last-fetched patient data
              - Install prompt on Android Chrome
              - Offline fallback page when API unreachable

           3. Offline protocol viewer:
              - /protocols page listing hyperkalemia, AKI, DKA
              - Pre-cached at install time (deterministic, no API needed)
              - Each protocol shows tiers, actions, escalation criteria
              - Works fully offline — cached as static JSON

           4. Shadow mode smoke endpoint (minimal, day 5):
              - GET /api/v1/shadow/suggest?patient_id=X&context=vitals
              - Returns: what the agent WOULD suggest based on current
                vitals + labs + active protocols
              - P0 implementation: deterministic (reuse protocol engine),
                NOT Gemma 4 yet — that's configuration, not code change
              - Response logged to shadow_events
              - UI: small "Agent suggests..." card on expanded patient
                view, clearly labeled "SHADOW MODE — advisory only"

         P1c-PWA EXPLICIT EXCLUSIONS:
           - NO Expo RN / native mobile (P4)
           - NO real-time WebSocket (future)
           - NO Gemma 4 integration in code (config swap later)
           - NO call briefing summary
           - NO theme toggle (dark only)
           - NO Play Store deployment

MISSION: Write specs/004-p1c-pwa-board/spec.md. <200 lines.
         Shortened structure: Purpose, FRs with acceptance criteria,
         API consumption map, PWA checklist, review checklist.
         Zero [NEEDS CLARIFICATION].
         Skip /sp.clarify — go straight to /sp.plan in the same
         pass if spec is clean.
         Save plan under specs/004-p1c-pwa-board/.
         Then immediately generate tasks.md (~20 tasks).
         ALL THREE ARTIFACTS IN ONE PASS (spec + plan + tasks).
         We are sprinting. No ceremony beyond what constitution
         requires.

## Response snapshot

Generated all three artifacts in one pass:

- **spec.md** (28 FRs across 4 areas: board, PWA, protocols, shadow): 170 lines with ACs, API consumption map, PWA checklist, review checklist.
- **plan.md**: Constitution Check I–XIV all passed; 4 architecture decisions (AD-001 @serwist/next, AD-002 SWR, AD-003 deterministic protocol engine for shadow, AD-004 static protocol JSON); component tree; SW caching strategy table; 3 risks with mitigations.
- **tasks.md**: 20 tasks T127–T146 with dependency graph. Covers PWA infra (T127-T130, T143), board UI (T131-T137), protocol pages (T138-T139), shadow backend (T140-T141), shadow UI (T142), offline indicator (T144), E2E (T145), CI (T146).

Key decisions noted: @serwist/next chosen over unmaintained next-pwa; shadow endpoint uses existing P1b ProtocolEngine + existing shadow_event_service (MEP payoff); protocol JSON pre-cached as static files — zero API round-trips offline.

## Outcome

- ✅ Impact: Three planning artifacts complete; sprint can begin at T127 immediately.
- 🧪 Tests: No tests run (authoring pass).
- 📁 Files: specs/004-p1c-pwa-board/spec.md, plan.md, tasks.md
- 🔁 Next prompts: /sp.implement T127 (PWA deps setup)
- 🧠 Reflection: Shadow section was the trickiest — needed to confirm existing shadow_event_service and feature_flags infrastructure from P1b before specifying the endpoint, to avoid duplicating wiring already done.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): not applicable (authoring pass)
- Prompt variant (if applicable): sprint-mode (combined spec+plan+tasks in one pass)
- Next experiment: verify @serwist/next compatibility with Next 14.2.x early in T127
