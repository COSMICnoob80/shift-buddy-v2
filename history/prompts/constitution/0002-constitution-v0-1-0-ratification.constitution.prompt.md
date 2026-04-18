---
id: "0002"
title: Constitution v0.1.0 ratification
stage: constitution
date: 2026-04-18
surface: agent
model: claude-opus-4-7
feature: none
branch: master
user: COSMICnoob80
command: /sp.constitution
labels: ["constitution", "governance", "phase-0", "aewacs"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - none (documentation artifact)
---

## Prompt

ACTOR:   Constitution author for Shift Buddy V2 (codename AEWACS).
         Output = supreme law. Every subsequent /sp.* command cites it.

INPUT:   @CLAUDE.md @AGENTS.md @SPEC.md
         Locked decisions from Phase 0 audit + ambiguity resolution:
         - P0 = auth + health + shell ONLY. Clinical deferred to P1.
         - SKILL.md INERT until P5. Binding safety rules move to
           CLINICAL_SAFETY.md (to be created in P0, binding from P1).
         - Runtime LLMs = OSS ONLY (Gemma 4 26B/E4B/E2B, MedGemma 1.5,
           Whisper). No proprietary/cloud models in shipped product.
         - JWT HS256, 15-min access, refresh deferred to P1 (ticketed).
         - PMDC regex ^\d{4,6}-[A-Z]$
         - Password >=12 chars, 3/4 classes, bcrypt cost 12,
           top-10k breached rejected, 5-fail lockout 15min exp,
           slowapi 5/min/IP on /auth/login.
         - UTC server; PKT conversion at display only.
         - structlog RedactingProcessor strips name/email/pmdc/mrn/
           dob/phone from commit #1. JWT sub = UUID only.
         - Self-host Inter .woff2.
         - /health = liveness only in P0; /ready in P1.
         - Clinical thresholds env-configurable via
           api/app/core/clinical_config.py from P0 (loader + schema
           test, no protocol code).

MISSION: Write memory/constitution.md. ~15 principles, each <=3 lines.

   I.    Clinical Safety Supremacy — dosing deterministic, never
         LLM-decided; MedGemma advisory only; no hallucinated doses.
   II.   SDD Discipline — no code without spec; failing test first.
   III.  Scope Discipline — P0 ships auth+health+shell. Clinical
         BLOCKED until P1 gate. CI fails if api/app/routers/ gains
         files beyond health.py + auth.py in P0.
   IV.   Privacy by Default — PHI redaction in ALL logs from day 1;
         de-identify before any AI call; offline-first.
   V.    OSS-Only Runtime — Gemma 4 family + MedGemma + Whisper.
         phi3:mini obsolete.
   VI.   Type Safety — strict Python types (Pydantic v2), TS strict,
         no `any`, no raw dicts for structured data.
   VII.  Git Discipline — feature branches; PR-gated to dev;
         dev->main via release/* only.
   VIII. Auth Hardening — the locked defaults above are FLOOR.
         Weakening requires constitution amendment.
   IX.   Agent Accountability — every AI output cites source
         (RAG chunk / guideline / "heuristic — unverified").
   X.    Token Hygiene (dev) — Plan Mode before writes; /clear
         between phases; @file over paste.
   XI.   Clinical Config Externalization — no clinical thresholds
         as literals in code. All load from clinical_config.py
         (env-driven). Hospitals tune without code changes.
   XII.  Offline-First — any feature that cannot degrade gracefully
         without internet is a bug.

         Append CLINICAL_SAFETY.md-creation task to the plan.
         Append empty AMENDMENTS section. Version v0.1.0.
         Acceptance: every principle testable or auditable.

## Response snapshot

Rewrote `.specify/memory/constitution.md` at v0.1.0 with all 12 locked
principles (I–XII), each ≤3 lines. Sync Impact Report prepended
documenting the 1.0.0 → 0.1.0 re-baseline, principle renames/merges,
and template follow-ups. Technology & Compliance trimmed to OSS-only
runtime (Gemma 4 / MedGemma / Whisper); proprietary models removed.
Governance updated with pre-1.0 versioning note. AMENDMENTS section
appended (empty). Plan addendum recorded: P0 task to create
`CLINICAL_SAFETY.md` (inert in P0, binding from P1). SKILL.md inert
until P5 recorded in workflow section.

## Outcome

- ✅ Impact: Supreme-law constitution ratified at v0.1.0; all subsequent /sp.* runs must cite principles I–XII.
- 🧪 Tests: none (documentation artifact); each principle acceptance-tagged as testable or auditable per governance section.
- 📁 Files: `.specify/memory/constitution.md` rewritten end-to-end.
- 🔁 Next prompts: `/sp.plan` for P0 foundation (auth + health + shell + clinical_config loader + CLINICAL_SAFETY.md stub); template updates flagged in Sync Impact Report.
- 🧠 Reflection: Version re-baselined to pre-1.0 to match product lifecycle. Clinical-config externalization (XI) and OSS-only runtime (V) are the two principles most likely to bite during implementation — CI gates for both should land in P0.

## Evaluation notes (flywheel)

- Failure modes observed: none (first-pass ratification with locked inputs).
- Graders run and results (PASS/FAIL): PASS — all placeholders resolved, dates ISO, version line matches Sync Impact Report.
- Prompt variant (if applicable): v1 (user-supplied locked decisions, no iteration).
- Next experiment (smallest change to try): update `.specify/templates/plan-template.md` Constitution Check to enumerate I–XII; verify `/sp.plan` cites them verbatim.
