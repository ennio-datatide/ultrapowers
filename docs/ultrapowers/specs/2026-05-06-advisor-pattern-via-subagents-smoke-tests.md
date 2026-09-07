# Smoke Test Scenarios — Advisor Pattern via Subagents

**Date:** 2026-05-06
**Plan:** `2026-05-06-advisor-pattern-via-subagents.md`

Run manually in a live Claude Code session after deploying changes.

## Setup

1. Plugin reloaded (`/reload-plugins`) so new agent + skill are visible.
2. `.claude/ultrapowers-preferences.json` contains the `advisor` block (or omits it — defaults apply).

## Scenarios

### S1: Sonnet session injects directive
Open a fresh session on sonnet (`claude --model sonnet` or set in settings.json). Inspect the session-start additionalContext (use a debug command or read `~/.claude/logs/` if you've enabled logging).
**Pass:** `additionalContext` contains "ADVISOR TIMING" block.

### S2: Opus session skips directive
Open a fresh session on opus.
**Pass:** `additionalContext` does NOT contain "ADVISOR TIMING" block. Other directives (no-permission-asks, autonomous-decision) ARE present.

### S3: First-call dispatch on multi-step task
On sonnet session, type a multi-step task: "build a small CLI that converts CSV to JSON, with a test."
**Pass:** assistant reads a few files (orientation), then dispatches `advisor` subagent before substantive code changes. Look for `<command-name>advisor</command-name>` or equivalent dispatch marker in the assistant's tool calls.

### S4: Final-call dispatch
After S3's task, observe the assistant's behavior near task completion.
**Pass:** assistant writes the durable result (file, commit), THEN dispatches advisor before reporting complete.

### S5: Mid-task dispatch on error
On sonnet session, give a task and inject a test failure mid-task ("the test fails with X — can you fix it?").
**Pass:** assistant dispatches advisor with the failure context.

### S6: Reconcile call on conflict
Provide context where advisor advice contradicts file evidence (e.g., advisor says "use library X" but the codebase explicitly forbids X in CLAUDE.md).
**Pass:** assistant dispatches advisor a second time with the conflict explicit, rather than silently switching.

### S7: Opus controller in SDD skips advisor
Run a SDD-driven plan execution from an opus controller session.
**Pass:** controller does NOT dispatch advisor between tasks (skipped per "controller is opus" rule).

### S8: Sonnet controller in SDD dispatches advisor
Run a SDD-driven plan execution from a sonnet controller session.
**Pass:** controller dispatches advisor before each implementer dispatch and on DONE_WITH_CONCERNS reports.

### S9: Implementer reports DONE_WITH_CONCERNS
Coax an implementer subagent (sonnet) to surface a strategic doubt (the implementer prompt now instructs this).
**Pass:** implementer report includes a `concerns:` field; controller acts on it (dispatches advisor or proceeds with reviewers based on concern severity).

### S10: `advisor.enabled: false` short-circuits
Set `advisor.enabled: false` in prefs. Open new sonnet session.
**Pass:** SessionStart hook does NOT inject the advisor-timing directive. Skill (if invoked manually) short-circuits at dispatch.

## Failure-Mode Scenarios

### F1: Advisor agent file missing
Rename `agents/advisor.md` to `agents/advisor.md.bak` temporarily.
**Pass:** Agent tool dispatch fails gracefully; executor logs and proceeds without advice. Session does not crash.

### F2: Network down during advisor dispatch
Disconnect network mid-task. Dispatch advisor.
**Pass:** dispatch fails or times out; executor proceeds without advice. No retry-loop hang.

### F3: Empty model in payload
(Synthetic test — covered by Task 5 unit test, but verify in live session if possible)
**Pass:** SessionStart treats unknown like opus; directive not injected. Session functions normally.
