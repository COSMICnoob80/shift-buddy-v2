---
id: "0002"
title: Enable Agent Teams Env Var
stage: general
date: 2026-04-24
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-p0-foundation-auth
user: COSMICnoob80
command: update-config
labels: ["settings","env","agent-teams","config"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - ~/.claude/settings.json
tests:
  - none
---

## Prompt

Add this to Claude Code settings {
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}

## Response snapshot

Read `~/.claude/settings.json` and found `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` already present at line 3. No change was required — the setting is already active.

## Outcome

- ✅ Impact: No-op — env var was already set; confirmed feature is active for all sessions
- 🧪 Tests: none
- 📁 Files: ~/.claude/settings.json (read-only; already correct)
- 🔁 Next prompts: none anticipated
- 🧠 Reflection: Always read before write — caught a duplicate before making a redundant edit

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
