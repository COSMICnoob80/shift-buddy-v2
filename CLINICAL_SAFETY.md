# Clinical Safety Charter — Shift Buddy V2

> **STATUS: BINDING (Phase 1 onward)**
> **Activation: Phase 1b** — P1b merged deterministic protocols and alert engine.

---

## 1. LLM advisory-only policy (Constitution Principle I)

Dosing, thresholds, and protocol triggers are **deterministic code**.
MedGemma and any generative model are **advisory only**, clearly labeled as
such in every UI surface, and MUST cite their source. Hallucinated doses are
defects of the same severity class as security vulnerabilities.

**BINDING from P1b:**

**(a) No hallucinated doses.** Every numeric dose rendered to a clinician MUST
trace to a deterministic tier table in code (`api/app/protocols/`) — never to an
LLM completion. The complete lineage is: `ProtocolEvaluateResponse.recommendations[]`
→ protocol module tier constant → `source` citation string. Any route that
returns a dose without a traceable `source` field is a P1 defect.

**(b) Protocol source citations are mandatory.** Every `Recommendation` object
returned by any protocol evaluator MUST include a non-empty `source` string
(Principle IX). An empty or missing source is a CI-blocking defect.

**(c) MedGemma advisory-only boundary.** MedGemma (P2+) MUST NOT override a
protocol result. If MedGemma contradicts a deterministic protocol outcome, the
protocol result is authoritative and MedGemma's output is surfaced as a
secondary annotation with the label **"Advisory — not a prescription"**.

**(d) Renal dose check is mandatory.** Any advisory surface that presents a
dose MUST pass through a renal-dose-adjustment check wired against the
patient's most recent eGFR. Absence of eGFR MUST degrade to
"insufficient data — manual review" rather than silently skipping the check.
(P2+ implementation gate; violation blocks P2 merge.)

---

## 2. Deterministic protocol engine (P1b)

Three protocols are live in `api/app/protocols/`:
- `hyperkalemia.py` — AHA 2023 / KDIGO 2023 tier table
- `dka.py` — ADA 2024 / WHO severity classification
- `aki_staging.py` — KDIGO 2023 creatinine criteria (async DB baseline lookup)

All tier constants are **fixed clinical guidelines** — NOT configurable via
`clinical_config.py`. Hospital tuning of these constants requires a
constitution amendment (Principle XI, exception documented here).

---

## 3. MedGemma advisory-only boundary (P2+)

MedGemma outputs are rendered with:

1. a visible **"Advisory — not a prescription"** label,
2. a citation to the originating guideline or RAG chunk ID
   (Constitution Principle IX), and
3. a one-tap **"Request senior review"** escalation that bypasses the LLM
   entirely.

MedGemma MUST NOT be the final authority on any decision that reaches a patient.

---

## 4. Shadow-First deployment gate (Constitution Principle XIII)

No clinical agent ships in autonomous mode. Every agent feature runs in
shadow mode with telemetry captured in `shadow_events` until divergence vs.
House Officer ground-truth falls below a per-feature threshold documented in
its `plan.md`. Graduation to autonomous requires a constitution amendment.

P1b activates the `shadow_events` MEP hinge: every `POST /protocols/evaluate`
call writes one de-identified row (`event_type="protocol_evaluation"`,
`payload={protocol, severity, actions_count}`). Divergence scoring is deferred
to the P2+ agent layer.

---

## 5. Alert engine safety (P1b)

Alert thresholds are sourced exclusively from `clinical_config.py`
(Constitution Principle XI). Zero threshold literals in `alert_service.py`
or any router. Any direct threshold literal is a defect regardless of value.

Alert `message` is de-identified: it references `trigger_parameter` +
`trigger_value` + severity text only. It MUST NOT contain patient name,
bed number, or any PHI.

---

## Change log

- **2026-04-21** — Inert P0 scaffold created. No binding content until P1.
- **2026-05-01** — **STATUS updated to BINDING.** P1b rules activated: deterministic
  protocol engine live, alert engine live, shadow events wired, MedGemma boundary
  stated, mandatory source citations enforced, PHI-free alert messages confirmed.
  Sections 1–5 are now authoritative from P1b onward.
