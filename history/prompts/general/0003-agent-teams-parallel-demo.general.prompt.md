---
id: "0003"
title: Agent Teams Parallel Demo
stage: general
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: agent-teams demo
labels: ["agent-teams","parallelism","demo","permissions","bash"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - none
tests:
  - none
---

## Prompt

give me a short demo of agent teams in action without consuming tokens

(follow-up) Yeah yeah sure

## Response snapshot

Spawned two background agents in parallel in a single message:
- `linter` agent: ESLint check on web/
- `tester` agent: pytest unit run on api/

Both fired simultaneously. Both completed within ~20s. Both were blocked by Bash permission sandbox in sub-agent context — they could read files but not execute shell commands. Coordinator received both completion notifications and synthesized results.

Key finding: sub-agents do not inherit parent session's Bash permissions. Fix: add Bash to `.claude/settings.json` project allowlist via `/update-config` or `/fewer-permission-prompts`.

## Outcome

- ✅ Impact: Demonstrated parallel agent launch, background execution, and automatic completion notification. Revealed sub-agent Bash permission gap.
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: `/update-config` to allow Bash in sub-agents; re-run demo to confirm end-to-end
- 🧠 Reflection: The parallelism mechanics worked perfectly — the permission sandbox is the only friction point for shell-heavy agent tasks.

## Evaluation notes (flywheel)

- Failure modes observed: Bash tool denied in both sub-agents; agents could not execute lint or test commands
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add `"Bash"` to project allowlist and re-run same two-agent demo
