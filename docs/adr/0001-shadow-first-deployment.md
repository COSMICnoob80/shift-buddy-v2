# ADR 0001: Shadow-First Deployment Doctrine

## Status

Accepted

## Date

2026-04-24

## Context

### Principle XIII — Shadow-First Deployment

Clinical agents operating in Shift Buddy cannot ship in autonomous mode. Every agent feature must first run in **shadow (observe-only) mode**, recording recommendations without taking any action on the schedule or clinical workflow. Shadow mode captures what the agent *would* have done alongside what the House Officer (HO) actually did, enabling divergence analysis before any autonomous authority is granted.

Skipping shadow observation means there is no telemetry baseline. Without baseline telemetry, a P1 graduation decision cannot be evidence-based — it becomes a guess. In a clinical rostering context, an incorrect autonomous decision can cascade into under-staffing, fatigue, or compliance violations. Principle XIII therefore makes shadow telemetry a hard prerequisite for autonomous graduation, not an optional enhancement.

### Principle XIV — MEP over MVP

P0 MUST ship the **Minimum Enablement Product (MEP)**: the scaffolding that makes future capability possible. Concretely, this means feature flags, event-logging tables, and interface shapes must exist in P0 even though no writers or autonomous agents exist yet. Retrofitting these hinges in P1 is a **constitution violation** — it forces risky schema migrations on a live system and breaks the divergence audit chain.

### Why This ADR Exists Now

Without the `shadow_events` table and flag loader in place before any agent feature lands, there is no place to write telemetry and no mechanism to gate autonomous behaviour. This ADR records the decision to create both artifacts in P0 so every subsequent feature can rely on them from day one.

## Decision

- Every clinical agent feature runs in shadow mode **exclusively** until its divergence rate against House Officer (HO) ground-truth falls below a pre-set threshold over a pre-set number of real shifts.
- Graduation from shadow to autonomous mode is **per-feature** and REQUIRES an explicit constitution amendment recording the threshold, sample size, and measured divergence.
- Feature flags (`shadow_mode_enabled`, `agent_autonomy_level`, `divergence_logging_enabled`) default **OFF** in P0 but the loader and wiring exist.
- The `shadow_events` table is created in P0 (migration `0002_shadow_events`) and sits empty; no writers exist yet.

## Divergence Threshold

`TBD (P1)` — Expected form: `divergence_rate < X%` over `N` real shifts. Exact values defined per-feature during P1 planning and recorded via constitution amendment.

## Graduation Process

1. Collect shadow telemetry into the `shadow_events` table.
2. Analyze per-agent divergence rate vs HO ground-truth.
3. Draft a constitution amendment PR citing measured data (threshold, sample size, divergence rate).
4. Project-owner approval of amendment.
5. Flip feature flag `agent_autonomy_level` from `0` to the authorized level.

## P0 Artifacts

- This ADR (`docs/adr/0001-shadow-first-deployment.md`)
- `api/app/core/feature_flags.py` — env-driven flags loader (all OFF by default)
- `api/alembic/versions/0002_shadow_events.py` — shadow_events table migration (inert in P0)

## Consequences

**Positive:**
- No clinical agent can accidentally ship in autonomous mode without a constitution amendment.
- Shadow telemetry is captured from day one; divergence analysis is possible from the first real shift.
- P1 graduation decisions are evidence-based, not speculative.

**Negative:**
- Small upfront cost to wire the table and flags before any agent exists; acceptable per Principle XIV.
- Developers must remember to write to `shadow_events` when implementing agent features in P1+.

## References

- Constitution Principle XIII — Shadow-First Deployment
- Constitution Principle XIV — MEP over MVP
- `plan.md` Constitution Check rows XIII and XIV
- `specs/001-p0-foundation-auth/tasks.md` Phase 14 (T056–T060)
