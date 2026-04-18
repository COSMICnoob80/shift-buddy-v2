# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*Reference: `.specify/memory/constitution.md` v0.1.0. Each check is PASS / FAIL / JUSTIFIED-DEVIATION. Deviations MUST be recorded in the Complexity Tracking table below.*

- [ ] **I. Clinical Safety Supremacy** — dosing/thresholds/triggers are deterministic code; no LLM decides clinical values; generative outputs labeled advisory and cite source.
- [ ] **II. SDD Discipline** — spec exists before code; failing tests written first for clinical/security paths (Red-Green-Refactor).
- [ ] **III. Scope Discipline (Phase-Gated)** — feature scope honors the current phase gate; in P0, `api/app/routers/` remains limited to `health.py` + `auth.py`.
- [ ] **IV. Privacy by Default** — PHI redaction active in all log paths from commit #1; JWT `sub` is UUID; de-identification runs before any AI call.
- [ ] **V. OSS-Only Runtime** — shipped runtime uses Gemma 4 / MedGemma 1.5 / Whisper only; no proprietary/cloud inference reachable from production paths.
- [ ] **VI. Type Safety** — strict Python typing + Pydantic v2; TypeScript `strict` with no `any`; `mypy --strict` and `tsc --noEmit` green.
- [ ] **VII. Git Discipline** — work on `feature/*`/`fix/*`/`chore/*`; PR targets `dev`; `main` only via tagged `release/*`.
- [ ] **VIII. Auth Hardening Floor** — JWT HS256 15-min, PMDC regex, ≥12-char passwords, bcrypt cost 12, 5/15 lockout, slowapi 5/min/IP on login — any weakening requires a constitution amendment.
- [ ] **IX. Agent Accountability** — every AI-surfaced output cites RAG chunk / named guideline / `heuristic — unverified`; citation rendered in UI.
- [ ] **X. Token Hygiene (Dev Workflow)** — Plan Mode before multi-file writes; `/clear` between phases; `@file` over pasted content; long runs checkpoint to PHRs.
- [ ] **XI. Clinical Config Externalization** — no clinical threshold literals in code; all values load from `api/app/core/clinical_config.py` (env-driven, schema-validated).
- [ ] **XII. Offline-First** — core workflows function without network; cloud-only paths show degraded-mode indicator and queue writes for later sync.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
