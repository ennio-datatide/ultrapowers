# Smoke Test Scenarios — Anti-Confirmation Enforcement, Auto-Router, Autonomous Decisions

**Date:** 2026-05-05
**Plan:** `2026-05-05-anti-confirmation-and-auto-router.md`

These scenarios are run manually in a live Claude Code session after deploying the plugin changes. Pass criteria stated per scenario.

## Setup

1. Plugin installed with new hooks wired (`hooks/auto-router`, `hooks/enforce-no-permission-asks`, extended `hooks/session-start`).
2. `ANTHROPIC_API_KEY` set in environment (required for headless classifier).
3. `.claude/ultrapowers-preferences.json` contains the `autoRouter` block with defaults (or omits it — hook uses hardcoded defaults).

## Scenarios

### S1: Auto-invoke on task-shaped prompt
1. Open a fresh Claude Code session.
2. Type: `build a contact form with email validation`.

**Pass:** assistant invokes `ultrapowers:brainstorming` automatically. Look for the `<command-name>ultrapowers:brainstorming</command-name>` marker in the response.

### S2: Passthrough on chat-shaped prompt
1. Type: `what does hooks/auto-router do?`.

**Pass:** assistant answers directly. No skill invocation. No latency from the classifier (shape gate caught it).

### S3: Debug skill auto-invocation
1. Type: `fix the failing test in tests/hooks/test-auto-router.sh`.

**Pass:** assistant invokes `ultrapowers:systematic-debugging` automatically.

### S4: Slash command bypasses router
1. Type: `/ultrapowers:brainstorming foo`.

**Pass:** brainstorming runs (slash explicit). No classifier latency observed.

### S5: Mid-skill no double-route
1. Invoke brainstorming via slash or auto-route.
2. Mid-conversation, type a follow-up: `the architecture should use Postgres not MySQL`.

**Pass:** no second skill invocation. Brainstorming continues normally.

### S6: Stop hook blocks permission-ask
1. Coax the assistant into ending a turn with "Want me to continue?" mid-task (e.g., during a multi-step refactor).

**Pass:** Stop hook blocks the turn end. Assistant continues working without user input. Check `~/.claude/logs/enforce-no-permission-asks.log` for a "blocked on pattern" entry.

### S7: Stop hook respects skill checkpoint
1. Run brainstorming. Reach a section approval point ("Approve section 1?").

**Pass:** Stop fires normally; assistant pauses for user input. Look for `<skill-checkpoint>` marker in the assistant's last message.

### S8: Conversational opt-out
1. Type: `just answer directly: how does the auto-router work?`.

**Pass:** classifier detects opt-out and routes to passthrough at high confidence. If it suggests a skill, the main session honors the opt-out and answers directly.

### S9: Autonomous fast-path triage
1. Type: `fix the typo in skills/no-permission-asks/SKILL.md — "permision" should be "permission"`.

**Pass:** brainstorming triage decides simple-task fast-path autonomously. Skill announces the call ("trivial — proceeding") and proceeds without asking the user about complexity.

### S10: Auto-router disabled
1. Edit `.claude/ultrapowers-preferences.json`, set `autoRouter.enabled` to `false`.
2. Open a new session. Type: `build a contact form`.

**Pass:** no auto-invoke. Hook short-circuits to passthrough.

## Failure-Mode Scenarios

### F1: Network down
1. Disable network. Type a task-shaped prompt.

**Pass:** classifier times out within 10s. Hook fails-open to passthrough. Session continues.

### F2: ANTHROPIC_API_KEY unset
1. `unset ANTHROPIC_API_KEY`. Open new session. Type a task-shaped prompt.

**Pass:** hook detects missing key, logs, passthrough. No 401 error surfaced to user.

### F3: Malformed preferences
1. Corrupt `.claude/ultrapowers-preferences.json` (invalid JSON). Open new session.

**Pass:** hooks fall back to defaults (autoCommit/autoPush ON, autoRouter defaults from hardcoded fallback). No session crash.
