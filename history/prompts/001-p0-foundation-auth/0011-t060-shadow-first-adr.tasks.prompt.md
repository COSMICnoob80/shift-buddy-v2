---
id: "0010"
title: T060 Shadow-First Deployment ADR
stage: tasks
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: syedmuhammadabdullahshah@protonmail.com
command: T060 — Create docs/adr/0001-shadow-first-deployment.md
labels: ["adr","shadow-mode","feature-flags","mep","clinical-safety","p0"]
links:
  spec: null
  ticket: null
  adr: docs/adr/0001-shadow-first-deployment.md
  pr: null
files:
  - docs/adr/0001-shadow-first-deployment.md
tests:
  - grep -q "Principle XIII" docs/adr/0001-shadow-first-deployment.md
  - grep -q "Principle XIV" docs/adr/0001-shadow-first-deployment.md
  - grep -q "TBD (P1)" docs/adr/0001-shadow-first-deployment.md
---

## Prompt

You are implementing T060 for the Shift Buddy V2 project.
Working directory: /home/cosmicnoob/shift-buddy-v2
Branch: 001-p0-foundation-auth

CONSTRAINT: Write files only. Do NOT run any git commands.

## Task

Create `docs/adr/0001-shadow-first-deployment.md`.

The `docs/adr/` directory exists but is empty. Create the file there.

## Required content

The ADR must include ALL of the following sections and pass these acceptance checks:
- `grep -q "Principle XIII" docs/adr/0001-shadow-first-deployment.md` → succeeds
- `grep -q "Principle XIV" docs/adr/0001-shadow-first-deployment.md` → succeeds
- All TBD markers are explicitly labeled `TBD (P1)` not silently missing

[Full section requirements as provided in task specification]

## Response snapshot

Created `docs/adr/0001-shadow-first-deployment.md` with all required sections:
- Status: Accepted, Date: 2026-04-24
- Context explaining Principle XIII (Shadow-First Deployment) and Principle XIV (MEP over MVP)
- Decision: shadow-only mode, per-feature graduation via constitution amendment, feature flags default OFF, shadow_events table created inert in P0
- Divergence Threshold: `TBD (P1)`
- Graduation Process: 5-step process from telemetry collection to flag flip
- P0 Artifacts listing all three artifacts
- Consequences: positive (no accidental autonomy, telemetry from day one) and negative (small upfront cost)
- References to Principles XIII and XIV, plan.md, and tasks.md Phase 14

All three acceptance checks pass: Principle XIII PASS, Principle XIV PASS, TBD (P1) marker PASS.

## Outcome

- Impact: ADR 0001 created; P0 shadow-first doctrine formally documented per constitution requirements for T060
- Tests: grep -q "Principle XIII" PASS; grep -q "Principle XIV" PASS; TBD (P1) marker PASS
- Files: docs/adr/0001-shadow-first-deployment.md (created)
- Next prompts: T056-T059 implementation tasks if not yet complete; P1 planning to set divergence thresholds
- Reflection: ADR captures the MEP doctrine binding — any future autonomous agent feature must reference this ADR and go through the graduation process

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): acceptance grep checks — all PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add per-feature threshold table in a follow-up P1 ADR amendment
