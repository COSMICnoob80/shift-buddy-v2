---
id: "0001"
title: "Constitution v0.3.0 + Mobile Offline Spec"
stage: spec
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 005-mobile-offline-pivot
branch: dev
user: COSMICnoob80
command: "chat (sprint mode — constitution amendment + spec/plan/tasks in one pass)"
labels: ["constitution","mobile","offline-first","expo","react-native","sqlite","protocol-port","delivery-context"]
links:
  spec: specs/005-mobile-offline-pivot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - SPEC.md
  - specs/005-mobile-offline-pivot/spec.md
  - specs/005-mobile-offline-pivot/plan.md
  - specs/005-mobile-offline-pivot/tasks.md
  - history/prompts/005-mobile-offline-pivot/0001-constitution-v030-mobile-spec.spec.prompt.md
tests:
  - "All SPEC §4 hyperkalemia test cases (5) — listed in T004"
  - "All SPEC §4 DKA test cases (4) — listed in T005"
  - "AKI staging test cases (5) — listed in T006"
  - "is_critical.ts unit tests — T007"
  - "Calculator reference-value tests — T013"
  - "Patient summary snapshot test — T021"
  - "PIN lock AC tests — T024"
---

## Prompt

ACTOR:   Mobile architect + implementation lead for Shift Buddy V2
         Android pivot. Bound by constitution v0.2.0 + NEW
         Principles XV (Delivery-First) and XVI (Model Selection).
         Single agent. Sprint mode.

INPUT:   @.specify/memory/constitution.md
         @api/app/protocols/hyperkalemia.py
         @api/app/protocols/dka.py
         @api/app/protocols/aki_staging.py
         @api/app/services/is_critical.py
         @api/app/core/clinical_config.py
         @SPEC.md §0 Delivery Context (new — answers below):

         DELIVERY CONTEXT (Principle XV):
         | Where used?    | Phone in hospital ward, one hand free     |
         | Network?       | Mobile data ONLY, metered. No WiFi.       |
         |                | MUST work FULLY OFFLINE. Cloud=enhancement |
         | Data source?   | Paper files → camera photo + manual entry  |
         | Output?        | Screen + WhatsApp share to senior group    |
         | User's hand?   | Holding phone, standing, between patients  |
         | Primary LLM?   | MedGemma on-device (P2). P1=deterministic  |
         | Offline req?   | HARD. App must NEVER show spinner waiting  |
         |                | for network to do its core job.            |

MISSION: Two deliverables in one pass.

  DELIVERABLE 1 — Amend constitution to v0.3.0:
    Add Principle XV (Delivery-First Validation) and
    XVI (Model Selection Hierarchy) from the text below.
    Add AMENDMENTS entry: "v0.3.0 — 2026-05-02 — Added XV + XVI.
    Rationale: v0.4.0 built server-dependent web app against
    offline-first requirement. Principle XV prevents recurrence."
    Add Delivery Context table to SPEC.md §0.

  DELIVERABLE 2 — New spec: specs/005-mobile-offline-pivot/spec.md
    Branch: 005-mobile-offline-pivot

    SCOPE (6-day sprint):
      Day 1-2: Expo RN scaffold + SQLite schema + protocol port
      Day 3: Doctor On Duty vault + protocol viewer
      Day 4: Patient management + camera
      Day 5: WhatsApp share + polish
      Day 6: Build + test

    [Full scope per original prompt — see spec.md for complete requirements]

    THEN immediately generate plan.md + tasks.md (~25 tasks).
    ALL THREE ARTIFACTS IN ONE PASS. Sprint mode.

## Response snapshot

Produced 5 artifacts in one pass:

1. **`.specify/memory/constitution.md` amended to v0.3.0**
   - SYNC IMPACT REPORT (v0.3.0) added to header block
   - Principle XV (Delivery-First Validation) added after XIV
   - Principle XVI (Model Selection Hierarchy) added after XV
   - AMENDMENTS entry added: v0.3.0 — 2026-05-02
   - Version line updated: 0.2.0 → 0.3.0, Last Amended: 2026-05-02

2. **`SPEC.md` §0 Delivery Context table inserted** before §1 Data Models
   (8-row Principle XV compliance table)

3. **`specs/005-mobile-offline-pivot/spec.md`** — ~170 lines
   §0 Delivery Context, §1 Purpose + exclusions, §2 FRs (FR-1 through FR-5),
   §3 SQLite schema (5 tables), §4 Screen Inventory (11 screens), §5 Acceptance Criteria (10 ACs)

4. **`specs/005-mobile-offline-pivot/plan.md`**
   §1 Directory layout, §2 Key decisions (D1–D6), §3 Data flow diagram,
   §4 Protocol port strategy table, §5 WhatsApp format, §6 Constitution Check (16 principles),
   §7 Risks (3 items)

5. **`specs/005-mobile-offline-pivot/tasks.md`** — 25 tasks across 6 days
   T001–T009 (infra + protocol ports + tests)
   T010–T014 (protocol vault + calculators)
   T015–T020 (patient CRUD + camera)
   T021–T024 (share + offline indicator + PIN)
   T025 (EAS build + tag)

## Outcome

- ✅ Impact: Constitution bumped to v0.3.0; SPEC.md has mandatory Delivery Context gate; complete 6-day sprint plan ready for execution
- 🧪 Tests: 7 test suites specified across T004–T009, T013, T021, T024
- 📁 Files: 5 files created/modified
- 🔁 Next prompts: `/sp.implement T001` to begin Expo scaffold; `/sp.adr expo-sqlite-vs-watermelondb` if D2 decision needs formal record
- 🧠 Reflection: Principle XV was the key insight — v0.4.0 built the wrong thing by skipping the Delivery Context gate. Embedding it in the constitution makes the check structural, not advisory.

## Evaluation notes (flywheel)

- Failure modes observed: none in this pass
- Graders run and results (PASS/FAIL): spec <200 lines ✅ (168 lines); 25 tasks exactly ✅; all 16 constitution principles checked ✅
- Prompt variant (if applicable): null
- Next experiment: test whether T006 (aki_staging.ts) sync SQLite API works with expo-sqlite v14 before committing to the approach
