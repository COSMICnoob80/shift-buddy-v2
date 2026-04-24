---
id: "0004"
title: P0 tasks dependency ordered TDD
stage: tasks
date: 2026-04-19
surface: agent
model: claude-opus-4-7
feature: 001-p0-foundation-auth
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: /sp.tasks
labels: [tasks, tdd, p0, auth, cve-guards, scope-discipline]
links:
  spec: specs/001-p0-foundation-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-p0-foundation-auth/tasks.md
tests:
  - (tasks.md enumerates tests to land; none executed in this pass)
---

## Prompt

ACTOR:   Task generator for 001-p0-foundation-auth.
         Bound by @.specify/memory/constitution.md.
         Especially Principles II (TDD — failing test first),
         III (Scope Discipline), VIII (Auth Hardening).

INPUT:   @specs/001-p0-foundation-auth/plan.md
         @specs/001-p0-foundation-auth/data-model.md
         @specs/001-p0-foundation-auth/contracts/openapi.yaml
         @specs/001-p0-foundation-auth/spec.md
         @.specify/memory/constitution.md

MISSION: Produce tasks.md — the dependency-ordered, TDD-enforced
         task list for /sp.implement to execute.

         STRUCTURE:
           - Follow the 10-step TDD sequence from plan.md verbatim.
             Each TDD step expands into 2+ tasks:
               a) Write failing test(s) — explicit test file paths,
                  explicit assertions.
               b) Implement minimum code to green.
               c) Refactor if needed (optional, only if code smells).
           - Every task: atomic, one concern, single commit-worthy.
           - Mark [P] for parallel-safe tasks (different files, no
             shared state).
           - Order reflects dependency graph — step N cannot start
             until step N-1's green tests land.

         REQUIRED CVE-GUARD TASKS (from research.md):
           - Test: JWT verifier rejects tokens with alg="none" and
             any algorithm NOT in ["HS256"]. (CVE-2024-33663/33664
             guard.)
           - Test: package.json pins next>=14.2.21.
             (CVE-2025-29927 guard.)
           - Test: passlib==1.7.4 + bcrypt==4.1.3 in requirements.
             Smoke test that bcrypt.hashpw runs without
             AttributeError.
           - Include these as first-class tasks, not footnotes.

         REQUIRED SCOPE-GUARD TASKS (NFR-009):
           - Task: Add CI step that greps api/app/routers/ and fails
             if any file other than health.py or auth.py exists.
             Test the CI step itself (negative case: add dummy file,
             assert CI fails).

         REQUIRED PHASE-0 DELIVERABLE TASKS:
           - Task: Create CLINICAL_SAFETY.md with
             "Activation: Phase 1" header. Body: placeholder.
             (Per plan.md + constitution Principle I.)
           - Task: Create api/app/core/clinical_config.py loader
             + schema test (NO protocol code — loader skeleton only).
           - Task: Create .env.example with every required env var
             documented.
           - Task: Self-host Inter — download .woff2 subsets,
             commit under web/public/fonts/, reference in layout.

         REQUIRED PRIVACY TASK (FR-008):
           - Task FIRST in implementation order: structlog
             RedactingProcessor with unit tests proving
             name/email/pmdc/mrn/dob/phone are stripped.
             This lands in commit #1 per plan.

         ACCEPTANCE:
           - tasks.md lists ~40-60 atomic tasks.
           - Each task has: ID (T001, T002...), [P] marker if
             parallel, file path(s) touched, one-line description,
             acceptance criterion (usually "test X passes").
           - Dependency graph implicit in ordering; explicit
             callouts for non-obvious deps.
           - First 5 tasks are setup (repo, tooling, CI skeleton,
             redactor, empty-suite green).
           - Tasks 6+ follow the 10-step TDD sequence.
           - Do NOT run /sp.implement. Just generate tasks.md.

## Response snapshot

Generated `specs/001-p0-foundation-auth/tasks.md` with 55 atomic tasks across 13 phases:

1. Setup (T001–T005) — scaffold, pyproject, package.json w/ next>=14.2.21, .env.example, CI skeleton.
2. PHI Redactor commit #1 (T006–T009) — RED/GREEN on `RedactingProcessor` + dep-pin CVE guards.
3. Clinical config loader (T010–T012) — loader-only, CLINICAL_SAFETY.md scaffold.
4. Liveness (T013–T015) — health endpoint + error envelope override.
5. Password policy (T016–T019) — PMDC regex, 3-of-4 classes, bcrypt 12, breach list.
6. User model + migration (T020–T023) — hand-written Alembic, roundtrip test.
7. JWT + CVE guards (T024–T027) — alg-none/HS512 rejection (CVE-2024-33663/33664).
8. Register (T028–T031) — Story 1 ACs + redaction check.
9. Login + lockout + rate-limit (T032–T037) — Story 2 ACs, timing-equalized.
10. Auth middleware (T038–T040).
11. Scope-guard CI (T041–T043) — in-process test, shell gate, NEGATIVE test.
12. Web shell (T044–T050) — self-hosted Inter, dark tokens only, Playwright smoke.
13. Compose/quickstart/polish (T051–T055).

Every (a) RED task has explicit file path + assertions; (b) GREEN task names the minimal module. Dependency callouts and parallel batches documented. Story coverage mapped to spec.md. MVP suggestion: T001–T043 minimum; T044–T050 required for Story 3 DoD.

## Outcome

- ✅ Impact: tasks.md ready for /sp.implement — TDD order enforced, CVE guards first-class, scope guard + negative test included.
- 🧪 Tests: none executed; tasks enumerate failing tests to write.
- 📁 Files: specs/001-p0-foundation-auth/tasks.md (rewritten).
- 🔁 Next prompts: `/sp.implement` to execute T001 onward, or `/sp.taskstoissues` to shard into GitHub issues.
- 🧠 Reflection: Principle III enforced by T041–T043 triplet (mirror test + shell gate + negative proof). Privacy commit-#1 rule encoded as hard ordering (T006–T007 precede T014 app factory).

## Evaluation notes (flywheel)

- Failure modes observed: none in this pass; risk = drift between tasks.md acceptance strings and eventual test names. Keep test paths verbatim.
- Graders run and results (PASS/FAIL): n/a (no code executed).
- Prompt variant (if applicable): baseline /sp.tasks with explicit CVE + scope-guard requirements.
- Next experiment (smallest change to try): after first 10 tasks implement, retro whether [P] markers matched actual parallel safety.
