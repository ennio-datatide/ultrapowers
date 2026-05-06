# Ultrapowers Installation & Configuration

This guide covers installation across supported harnesses and configuration for the auto-router and anti-confirmation hooks introduced in 1.3.

## Quick Install

### Claude Code (via Marketplace)

```bash
/plugin marketplace add ennio-datatide/ultrapowers
/plugin install ultrapowers@ultrapowers
```

### Claude Code (from source)

```bash
git clone https://github.com/ennio-datatide/ultrapowers ~/.claude/plugins/ultrapowers
```

### Other Harnesses

See `README.md` "Other Harnesses" section for Cursor, Copilot CLI, Codex, OpenCode, and Gemini CLI instructions.

## Auto-Router and Anti-Confirmation Hooks

After installing ultrapowers, three hooks become active automatically:

1. **SessionStart** — injects the `no-permission-asks` and `autonomous-decision` directives at every session start, alongside the existing `using-ultrapowers` skill content.
2. **UserPromptSubmit (auto-router)** — classifies each task-shaped prompt with opus and auto-invokes the matching ultrapowers skill at high confidence; suggests at medium confidence; passes through at low confidence or for chat-shaped prompts.
3. **Stop** — blocks turn-end if the assistant ended on a mid-task permission-ask, forcing it to continue working until the user's job is finished.

### Requirements

- `ANTHROPIC_API_KEY` must be set in your environment for the auto-router classifier. OAuth tokens are not refreshed in headless mode and 401 after ~10–15 minutes ([claude-code#28827](https://github.com/anthropics/claude-code/issues/28827)).
- `jq` must be installed (`brew install jq` on macOS, `apt install jq` on Debian/Ubuntu).

### Configuration

Edit `.claude/ultrapowers-preferences.json` in your project (or copy the defaults):

```json
{
  "autoRouter": {
    "version": 1,
    "enabled": true,
    "model": "opus",
    "invokeThreshold": 0.7,
    "suggestThreshold": 0.4
  }
}
```

| Field | Effect |
|---|---|
| `enabled: false` | Disable the auto-router for this project |
| `model: "haiku"` | Use cheaper/faster classifier (lower accuracy) |
| `invokeThreshold` | Confidence ≥ this triggers AUTO-INVOKE injection (default 0.7) |
| `suggestThreshold` | Confidence ≥ this triggers SUGGEST injection (default 0.4) |

If the block is missing, the hook uses these hardcoded defaults.

### Bypass options

- **Slash command**: any prompt starting with `/` skips the router (e.g., `/ultrapowers:brainstorming foo`).
- **Conversational opt-out**: phrases like "just answer", "skip the workflow", "no skill" — the classifier routes to passthrough at high confidence.
- **Disable globally**: set `autoRouter.enabled: false`.

## Advisor Pattern (sonnet/haiku sessions)

When your session runs on sonnet or haiku, ultrapowers automatically:

1. Injects an "advisor timing" directive at SessionStart instructing you to consult an `advisor` agent (opus) at strategic moments — after orientation, on difficulty, before declaring done.
2. Ships an `advisor` agent definition (`agents/advisor.md`) that runs on opus with read-only tools.
3. Documents the brief format and reconcile-call pattern in `skills/consulting-the-advisor/SKILL.md`.

This replicates Anthropic's [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) using Claude Code subagents — no SDK code required.

### Configuration

Edit `.claude/ultrapowers-preferences.json`:

```json
{
  "advisor": {
    "version": 1,
    "enabled": true,
    "model": "opus"
  }
}
```

| Field | Effect |
|---|---|
| `enabled: false` | Disable advisor for this project (skips directive injection + skill consultation) |
| `model` | Model passed to the advisor subagent. Defaults to `opus`. Anything below opus defeats the pattern |

### When advisor activates

- Main session runs on sonnet or haiku → directive injected, executor calls advisor at strategic moments
- Main session runs on opus → directive NOT injected (executor is already advisor-class)
- `subagent-driven-development` controller on sonnet/haiku → controller dispatches advisor at task boundaries
- `subagent-driven-development` controller on opus → skipped (controller already advisor-class)
- Implementer subagents in SDD → never dispatch advisor (harness prohibits sub-subagent dispatch); surface concerns via DONE_WITH_CONCERNS instead

### Latency note

Subagent dispatch adds ~5–15 seconds per advisor call (vs the API-native advisor's ~1–2s server-side sub-inference). Worth it on multi-minute tasks; skip on sub-minute work via `advisor.enabled: false`.

### Workflow Preferences

The full `.claude/ultrapowers-preferences.json` schema:

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": {
    "dev": true,
    "business": true
  },
  "autoRouter": {
    "version": 1,
    "enabled": true,
    "model": "opus",
    "invokeThreshold": 0.7,
    "suggestThreshold": 0.4
  },
  "advisor": {
    "version": 1,
    "enabled": true,
    "model": "opus"
  }
}
```

| Field | Effect |
|---|---|
| `autoCommit` | Commit autonomously as tasks complete (default: ON) |
| `autoPush` | Push to remote after commits (default: ON) |
| `commitDesignDocs` | Include design specs in git commits (default: OFF — design docs stay local) |
| `suggestSiblingPacks.dev` | Suggest installing `ultrapowers-dev` when relevant and missing |
| `suggestSiblingPacks.business` | Suggest installing `ultrapowers-business` when relevant and missing |

### Troubleshooting

**Logs**

- `~/.claude/logs/auto-router.log` — auto-router decisions and failures
- `~/.claude/logs/enforce-no-permission-asks.log` — Stop-hook blocks

**Hooks fail-open** on any error — if something breaks, you'll get vanilla Claude behavior, not a broken session.

**"Stop hook prevented continuation" error after install**: ensure you have ultrapowers 1.3+. The plugin Stop-hook bug ([claude-code#10412](https://github.com/anthropics/claude-code/issues/10412)) is worked around in 1.3 via `exit 0 + JSON` form. Earlier versions used exit-2 and would fail on plugin-shipped Stop hooks.

**Auto-router not firing on task-shaped prompts**: check `~/.claude/logs/auto-router.log` for the failure mode. Most common: `ANTHROPIC_API_KEY not set` (auth), `classifier failed` (network or API error), `chat-shaped, passthrough` (shape gate caught it — fine).

**Auto-router adds latency on every prompt**: the shape gate eliminates classifier cost on chat-shaped prompts. If task-shaped prompts feel slow, downgrade to `"model": "haiku"` for the classifier (faster, cheaper, slightly less accurate).
