<!--
SYNC IMPACT REPORT (v0.2.0)
==================
Version change: 0.1.0 → 0.2.0
Bump rationale: MINOR — added two new principles (XIII. Shadow-First
                Deployment, XIV. MEP over MVP). Pre-1.0 MINOR bumps are
                treated as potentially breaking per governance policy;
                amendment procedure followed.

Added principles:
  XIII. Shadow-First Deployment — agents observe/recommend only until
        divergence vs. HO ground-truth falls below a pre-set threshold
        over a pre-set number of real shifts; graduation per-feature
        requires a constitution amendment.
  XIV.  MEP over MVP — P0 deliverables ship evolution-ready: feature-
        flag hinges, event-logging tables, and directory/interface
        shapes that anticipate P1–P6 without implementing them.
        Retrofitting is a violation.

Templates alignment (v0.2.0 follow-ups):
  ⚠ .specify/templates/plan-template.md — Constitution Check gate MUST
    be extended to walk principles I–XIV.
  ⚠ specs/001-p0-foundation-auth/tasks.md — append T056–T060 covering
    `shadow_events` table scaffold, feature_flags loader, and an ADR
    for the Shadow-First + MEP doctrine.
  ✅ spec-template.md, phr-template.prompt.md — no mandated changes.

Previous sync impact report (v0.1.0) preserved below for history.

------------------------------------------------------------------
SYNC IMPACT REPORT (v0.1.0)
==================
Version change: 1.0.0 → 0.1.0
Bump rationale: Re-ratification under pre-1.0 numbering. The project has not yet
                shipped a production release; v1.0.0 was premature. Re-baselining
                at v0.1.0 to align constitution semver with product lifecycle.
                Breaking principle restructure (7 → 12 principles, new IDs I–XII)
                is captured by the major re-baseline rather than a 2.0.0 bump.

Principles (new set, 12 total):
  I.    Clinical Safety Supremacy (NON-NEGOTIABLE)
  II.   SDD Discipline (NON-NEGOTIABLE)
  III.  Scope Discipline (Phase-Gated)
  IV.   Privacy by Default
  V.    OSS-Only Runtime
  VI.   Type Safety
  VII.  Git Discipline
  VIII. Auth Hardening Floor
  IX.   Agent Accountability
  X.    Token Hygiene (Dev Workflow)
  XI.   Clinical Config Externalization
  XII.  Offline-First

Renamed / merged from v1.0.0:
  - "Patient Safety First" → I. Clinical Safety Supremacy (sharpened: LLMs never
    decide doses; MedGemma advisory only).
  - "Offline-First Resilience" → XII. Offline-First.
  - "Spec-Driven & Phase-Gated Development" → II. SDD Discipline + III. Scope
    Discipline (split; P0 CI gate added).
  - "Privacy by Default" → IV. Privacy by Default (commit-#1 redactor mandate).
  - "Test-First for Clinical Logic" absorbed into I + II.
  - "Smallest Viable Diff, Cited Code" retained implicitly via VII + X; dropped
    as standalone principle (enforced by review, not constitution).
  - "Agentic State, Not Stateless Chat" dropped from constitution (product
    architecture concern; belongs in plan.md, not supreme law).

Added sections:
  - AMENDMENTS (empty, ready for future use).
  - Plan addendum task: create CLINICAL_SAFETY.md during P0 (inert until P1 gate).

Removed sections: none structurally; Technology & Compliance Constraints
  trimmed to reflect OSS-only runtime (Gemma 4 / MedGemma / Whisper);
  proprietary models (Claude, Gemini) removed from shipped runtime surface.

Templates alignment:
  ⚠ .specify/templates/plan-template.md — Constitution Check gate references I–VII;
    MUST be updated to reference I–XII. Flagged for follow-up.
  ✅ .specify/templates/spec-template.md — no principle-mandated section changes.
  ⚠ .specify/templates/tasks-template.md — add CLINICAL_SAFETY.md-creation task
    row for P0 features; flagged for follow-up.
  ✅ .specify/templates/phr-template.prompt.md — unchanged.
  ⚠ CLAUDE.md / AGENTS.md — informal guidance; reconcile model-router section
    (legacy local candidates → Gemma 4 / MedGemma / Whisper) in next doc pass.
  ⚠ SKILL.md — INERT until P5; add banner at file top in P0 doc pass.

Deferred / follow-up TODOs:
  - TODO(plan-template): update Constitution Check to principles I–XII.
  - TODO(tasks-template): add CLINICAL_SAFETY.md creation as a standing P0 task.
  - TODO(docs): reconcile CLAUDE.md / AGENTS.md model-router language with
    Principle V.
-->

# Shift Buddy V2 (AEWACS) Constitution

## Core Principles

### I. Clinical Safety Supremacy (NON-NEGOTIABLE)

Dosing, thresholds, and protocol triggers MUST be deterministic code, never LLM-decided.
MedGemma and any generative model are advisory only, clearly labeled, and MUST cite source.
Hallucinated doses are defects of the same class as security vulnerabilities.

### II. SDD Discipline (NON-NEGOTIABLE)

No code is written without a spec and a failing test. Red-Green-Refactor is mandatory for
any clinical or security-sensitive path. Code that contradicts `SPEC.md` is a bug; specs
that contradict user needs are a spec revision — not a silent code change.

### III. Scope Discipline (Phase-Gated)

Phase 0 ships auth + `/health` + shell ONLY. Clinical routes are BLOCKED until the Phase 1
gate is opened. CI MUST fail if `api/app/routers/` in P0 contains any file other than
`health.py` and `auth.py`. Clinical-config schema loader is permitted (no protocol code).

### IV. Privacy by Default

PHI redaction ships in commit #1 via a `structlog` RedactingProcessor stripping name, email,
PMDC, MRN, DOB, and phone. JWT `sub` is a UUID — never an email or PMDC. Patient data MUST
be de-identified before any AI call; offline-first is the default posture.

### V. OSS-Only Runtime

Shipped runtime uses open-source models only: Gemma 4 (26B / E4B / E2B), MedGemma 1.5, and
Whisper. Proprietary or cloud-hosted inference MUST NOT be reachable from production code
paths. Any prior local-model candidate outside this list is obsolete and MUST be removed
from router config by end of P0.

### VI. Type Safety

Python uses strict type hints and Pydantic v2 models — no raw dicts for structured data.
TypeScript runs in `strict` mode with no `any` (use `unknown` and narrow). Violations fail
CI; `mypy --strict` and `tsc --noEmit` are required checks on every PR.

### VII. Git Discipline

Work lives on `feature/*`, `fix/*`, or `chore/*` branches. PRs target `dev` and require
green CI plus human review. `dev → main` happens only via `release/*` branches with a
tagged version. No direct commits to `main` or `dev`; no force-push to shared branches.

### VIII. Auth Hardening Floor

Locked defaults are the FLOOR, not the ceiling: JWT HS256 with 15-min access tokens;
PMDC regex `^\d{4,6}-[A-Z]$`; password ≥12 chars / 3-of-4 classes / bcrypt cost 12 /
top-10k breached rejected; 5-fail 15-min lockout; slowapi 5/min/IP on `/auth/login`.
Any weakening requires a constitution amendment.

### IX. Agent Accountability

Every AI-surfaced output MUST cite its source: a RAG chunk ID, a named guideline, or the
literal string `heuristic — unverified`. Unsourced clinical claims are rejected at review.
UI MUST render the citation alongside the suggestion, not buried in logs.

### X. Token Hygiene (Dev Workflow)

Enter Plan Mode before any multi-file write. Run `/clear` between phases to reset context.
Prefer `@file` references over pasted content. Long-running agent runs MUST checkpoint to
PHRs; abandoned conversations MUST NOT accrue hidden state that re-enters future sessions.

### XI. Clinical Config Externalization

No clinical threshold appears as a literal in application code. All thresholds load from
`api/app/core/clinical_config.py`, which is env-driven and schema-validated. Hospitals
tune thresholds by changing environment, never by patching code. P0 ships the loader and
a schema test — no protocol code.

### XII. Offline-First

Any feature that cannot degrade gracefully without internet is a bug. Core workflows
(patient board, protocols, vitals/labs entry, alert evaluation) MUST run against local
state. Cloud-only paths MUST surface a visible degraded-mode indicator and queue writes
for later sync.

### XIII. Shadow-First Deployment

No clinical agent ships in autonomous mode. Every agent feature runs in shadow mode —
observing state and recording recommendations — and MUST NOT take action on patient
care until its divergence rate against House Officer (HO) ground-truth decisions falls
below a pre-set threshold over a pre-set number of real shifts, both defined in the
feature's plan.md. Graduation from shadow to autonomous is per-feature and REQUIRES
an explicit constitution amendment recording the threshold, sample size, and measured
divergence. Shadow-mode telemetry MUST be captured in a durable event log (see
Principle XIV) from day one.

### XIV. MEP over MVP

Every P0 deliverable is a Minimum Evolvable Product, not a Minimum Viable Product.
This means P0 MUST ship:
  - feature-flag hinges for future capabilities (flags default OFF in P0, but the
    wiring, loader, and check-sites exist);
  - event-logging tables (e.g., `shadow_events`) for future divergence analysis,
    created and migrated in P0 even if no rows are written yet;
  - directory and interface shapes that anticipate P1–P6 surfaces (routers, agent
    slots, config namespaces) without implementing their logic.
Retrofitting these hinges in a later phase is a constitution violation. "We'll add
the table later" is not an acceptable plan.md entry.

## Technology & Compliance Constraints

- **Stack**: FastAPI (Python 3.12+, strict types) for API; Next.js 14+ (TS strict, App
  Router) for web; React Native for mobile; LangGraph for agent orchestration;
  PostgreSQL, Redis, ChromaDB for data; Docker Compose for local dev.
- **Runtime Models**: OSS only — Gemma 4 (26B / E4B / E2B), MedGemma 1.5, Whisper.
  Proprietary/cloud inference is BANNED from shipped paths (see Principle V).
- **Time**: Server operates in UTC; PKT conversion happens at display only.
- **Typography**: Inter font family, self-hosted as `.woff2` (no Google Fonts CDN).
- **Health**: `/health` is liveness only in P0; `/ready` is deferred to P1 (readiness
  probes gate dependency wiring when clinical services land).
- **Refresh Tokens**: Deferred to P1 and ticketed; P0 ships access-token-only auth.
- **Secrets**: `.env` files and Docker secrets only. Pre-commit secret-scan MUST pass.
- **Regulatory Posture**: "Clinical decision SUPPORT," not a diagnostic device. All
  surfaces render a disclaimer to that effect.

## Development Workflow & Quality Gates

- **Branching**: `main` (prod), `dev` (integration), `feature/*`, `fix/*`, `chore/*`,
  `release/*`. Direct commits to `main`/`dev` rejected by branch protection.
- **CI Gates**: `ruff check`, `ruff format --check`, `mypy --strict`, `pnpm lint`,
  `tsc --noEmit`, `pytest`, `vitest`, secret scan, P0 router-file-allowlist check
  (Principle III).
- **PR Review**: passing CI + Constitution Check note in description + updated
  spec/plan/tasks when scope shifts + one human reviewer.
- **PHR**: every user prompt that produces artifacts MUST have a PHR under
  `history/prompts/` per the routing rules in `AGENTS.md` / `CLAUDE.md`.
- **ADR**: architecturally significant decisions trigger the ADR suggestion prompt;
  ADRs are created only with user consent via `/sp.adr`.
- **Observability**: structured logs for every model call (model id, latency, token
  counts, route reason) — never payloads. All logs flow through the RedactingProcessor.
- **Plan Addendum (P0)**: the P0 plan MUST include a task to create `CLINICAL_SAFETY.md`.
  That file is INERT in P0 and becomes BINDING from P1 onward. `SKILL.md` remains INERT
  until P5; its header MUST say so.
- **Definition of Done**: acceptance criteria met; tests pass; specs/plans/tasks
  updated; PHR written; redaction verified; Constitution Check recorded in the PR.

## Governance

This constitution supersedes ad-hoc practice and informal guidance in `CLAUDE.md` /
`AGENTS.md` where the two conflict. Those files remain operational runbooks; this file
is the authority on principles.

- **Amendment procedure**: propose the change as a PR to
  `.specify/memory/constitution.md` with a Sync Impact Report, updated version, and
  updated dependent templates. Merge requires explicit project-owner approval.
- **Versioning policy**: Semantic. MAJOR for backward-incompatible principle changes
  or removals; MINOR for new principles or materially expanded guidance; PATCH for
  clarifications and typos. Pre-1.0 versions (0.Y.Z) treat MINOR bumps as potentially
  breaking — changes still require the amendment procedure.
- **Compliance review**: every `/sp.plan` run MUST include a Constitution Check
  section walking principles I–XIV and either confirming alignment or recording a
  justified deviation in the Complexity Tracking table.
- **Acceptance**: every principle in this document MUST be testable (via a CI check or
  automated test) or auditable (via a reviewable artifact such as a PR template entry,
  log field, or CI report).

## Amendments

New entries MUST append below with: version, date, summary, and Sync Impact
Report link (top-of-file header).

- **v0.2.0 — 2026-04-19** — Added Principle XIII (Shadow-First Deployment) and
  Principle XIV (MEP over MVP). Rationale: MEP + Shadow Mode are project
  invariants, not framing language. Discovered during `/sp.tasks` review for
  feature `001-p0-foundation-auth`. Sync Impact Report: see header block
  "SYNC IMPACT REPORT (v0.2.0)" at top of this file.

**Version**: 0.2.0 | **Ratified**: 2026-04-18 | **Last Amended**: 2026-04-19
