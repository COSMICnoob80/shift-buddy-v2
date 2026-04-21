# Clinical Safety Charter — Shift Buddy V2

> **STATUS: INERT (Phase 0). This file becomes BINDING from Phase 1 onward.**
> **Activation: Phase 1** (when the first clinical route lands in `api/app/routers/`).

Phase 0 ships zero clinical logic. No route in this repo evaluates a dose,
threshold, or protocol. This document is a scaffolded placeholder so P1
reviewers land on an unambiguously owned surface. Its text MUST be expanded
before any P1 clinical route is merged.

---

## 1. LLM advisory-only policy (Constitution Principle I)

Dosing, thresholds, and protocol triggers are **deterministic code**.
MedGemma and any generative model are **advisory only**, clearly labeled as
such in every UI surface, and MUST cite their source. Hallucinated doses are
defects of the same severity class as security vulnerabilities.

- _Placeholder P1 rule:_ **No hallucinated doses.** Any numeric dose rendered
  to a clinician MUST trace to a deterministic table in code, not to an LLM
  completion. (TBD — P1 detail.)

## 2. Renal / hepatic dose-adjustment check

Any advisory surface that presents a dose MUST pass through a
renal-dose-adjustment check wired against the patient's most recent eGFR.
Absence of eGFR MUST degrade to "insufficient data — manual review" rather
than silently skipping the check.

- _Placeholder P1 rule:_ **Renal dose check is mandatory on every advisory
  dose surface.** (TBD — P1 detail.)

## 3. MedGemma advisory-only boundary

MedGemma outputs are rendered with:

1. a visible **"Advisory — not a prescription"** label,
2. a citation to the originating guideline or RAG chunk ID
   (Constitution Principle IX), and
3. a one-tap **"Request senior review"** escalation that bypasses the LLM
   entirely.

- _Placeholder P1 rule:_ **MedGemma MUST NOT be the final authority on any
  decision that reaches a patient.** (TBD — P1 detail.)

## 4. Shadow-First deployment gate (Constitution Principle XIII)

No clinical agent ships in autonomous mode. Every agent feature runs in
shadow mode with telemetry captured in `shadow_events` until divergence vs.
House Officer ground-truth falls below a per-feature threshold documented in
its `plan.md`. Graduation to autonomous requires a constitution amendment.

_P0 artifact scaffolding (Principle XIV):_ `shadow_events` table, feature
flag loader, and this ADR-style charter. Expansion lives in P1+ per-feature
plans.

---

## Change log

- **2026-04-21** — Inert P0 scaffold created. No binding content until P1.
