---
id: "0001"
title: Phase 0 foundation spec
stage: spec
date: 2026-04-18
surface: agent
model: claude-opus-4-7
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.specify
labels: [phase-0, auth, foundation, constitution-alignment]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-p0-foundation-auth/spec.md
  - specs/001-p0-foundation-auth/checklists/requirements.md
tests:
  - none (spec-only; tests land at /sp.tasks → /sp.implement red phase)
---

## Prompt

ACTOR:   Spec author for Shift Buddy V2 Phase 0.
         Bound by @.specify/memory/constitution.md (supreme law).
         Especially Principles I (Clinical Safety), III (Scope
         Discipline), IV (Privacy), V (OSS-Only), VIII (Auth
         Hardening), X (Token Hygiene), XI (Config Externalization),
         XII (Offline-First).

INPUT:   @SPEC.md (existing, mixed P0+P1 — DO NOT follow blindly)
         @.specify/memory/constitution.md
         Phase 0 audit scope (already in plan file).

         LOCKED P0 SCOPE — describe ONLY these, nothing else:
           1. GET  /api/v1/health  (liveness, unauthenticated)
           2. POST /api/v1/auth/register
           3. POST /api/v1/auth/login
           4. JWT middleware that 401s all other routes
           5. User model + migration (matches SPEC §1.5)
           6. Next.js App Router shell: /login, /register,
              empty /board placeholder; Inter self-hosted;
              dark-theme tokens only (light deferred).
           7. Typed API client stub (register/login/health).
           8. structlog RedactingProcessor (commit #1).
           9. api/app/core/clinical_config.py loader + schema test
              (NO protocol code — loader only).
          10. CLINICAL_SAFETY.md created with P1-activation header.

         LOCKED AUTH DEFAULTS (from ambiguity resolution):
           - JWT: HS256, 15-min access. Refresh DEFERRED to P1
             (ticket it, don't build).
           - PMDC regex: ^\d{4,6}-[A-Z]$
           - Password: >=12 chars, 3/4 char classes, bcrypt cost 12,
             top-10k breach check, 5-fail lockout 15min exp.
           - slowapi: 5/min/IP on /auth/login.
           - Error envelope: {"error": code, "message": human}.
             NEVER {"detail": ...}. NEVER reveal email existence.
           - Timezone: UTC server; PKT display-only on frontend.
           - JWT sub = user UUID only. No PHI in claims.

MISSION: Write the Phase 0 spec as a single file suitable for
         /sp.plan input. Focus on WHAT + WHY, not HOW (no stack
         decisions beyond what constitution pins).

         Structure:
           1. Purpose + non-goals (explicit exclusions).
           2. User stories (2-3 max: HO registers; HO logs in;
              HO sees empty board shell with correct theme).
           3. Functional requirements (the 10 items above, each
              with acceptance criteria).
           4. API contract (register + login + health — request/
              response shapes, error codes).
           5. Data model (User only — matches SPEC §1.5).
           6. Non-functional requirements (privacy, auth hardening,
              offline-first implications for P0).
           7. Review & Acceptance Checklist.

         NO clinical features. NO patient CRUD. NO alerts. NO
         protocols. If tempted to add any, stop and cite
         Principle III.

         Acceptance:
           - Spec <400 lines.
           - Zero [NEEDS CLARIFICATION] markers (all resolved).
           - Review checklist at end, ready for /sp.clarify sanity
             pass.

## Response snapshot

- Created branch `001-p0-foundation-auth` via `.specify/scripts/bash/create-new-feature.sh`.
- Wrote `specs/001-p0-foundation-auth/spec.md` (347 lines, <400 target).
- Structure: Purpose + explicit Non-Goals citing Principle III; three P1/P1/P2 user stories (register, login, empty board shell); 10 FRs mapping to the locked scope; 9 NFRs covering Privacy, Auth Hardening Floor (locked values verbatim from constitution), error envelope, UTC, offline-first, OSS-only, type safety, observability, and the router-allowlist CI gate; API contract for `/health`, `/auth/register`, `/auth/login` with exact error codes; User-only data model matching SPEC §1.5 plus `failed_login_count` / `locked_until` for NFR-002 lockout; dark-theme design tokens only; 9 measurable Success Criteria; Assumptions section; final Review & Acceptance Checklist with Constitutional Alignment rows.
- Zero unresolved `[NEEDS CLARIFICATION]` markers (one literal grep hit is the meta-line in the checklist itself).
- Wrote `checklists/requirements.md` with spec-quality + constitutional-alignment rows, all passing.

## Outcome

- ✅ Impact: P0 scope is now locked as a reviewable artifact; /sp.clarify can run a sanity pass, then /sp.plan.
- 🧪 Tests: none added at spec stage; Red tests land in /sp.tasks → /sp.implement.
- 📁 Files: specs/001-p0-foundation-auth/spec.md; specs/001-p0-foundation-auth/checklists/requirements.md.
- 🔁 Next prompts: /sp.clarify on this spec, then /sp.plan.
- 🧠 Reflection: Locked auth values from the user prompt were folded into NFR-002 verbatim to avoid drift; refresh tokens explicitly deferred to P1 with an issue-ticket note; clinical-config loader scoped to loader-only per Principle XI + III.

## Evaluation notes (flywheel)

- Failure modes observed: none (single-shot spec write; template placeholders fully resolved).
- Graders run and results (PASS/FAIL): line-count check PASS (347 < 400); NEEDS-CLARIFICATION grep PASS (only meta-mention in checklist).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): during /sp.clarify, probe for any residual ambiguity in error-timing guarantees (constant-time compare for login) before planning.
