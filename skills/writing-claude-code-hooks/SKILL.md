---
name: writing-claude-code-hooks
description: Use when authoring Claude Code hooks (SessionStart, UserPromptSubmit, Stop, PreToolUse, PostToolUse, SubagentStop) or when a hook script needs to invoke headless `claude -p` for in-hook classification, blocking, or context injection
---

# Writing Claude Code Hooks

## Overview

Claude Code hooks are shell commands the harness invokes on lifecycle events. They receive JSON on stdin, write JSON or text to stdout, and signal blocking via exit codes or JSON fields. This skill captures the verified payload shapes, output schemas, plugin-shipped quirks, and recursion guards needed to author production hooks — including hooks that call headless `claude -p` for in-hook reasoning.

**Sources:** `code.claude.com/docs/en/hooks`, `code.claude.com/docs/en/headless`, `code.claude.com/docs/en/sub-agents`, plus GitHub issues `anthropics/claude-code#10412` (plugin Stop-hook bug) and `#28827` (OAuth headless 401).

## When to Use

- Writing any hook script for Claude Code (any event)
- Shipping hooks inside a plugin (vs `~/.claude/settings.json`)
- A hook needs to call `claude -p` for classification, summarization, or routing
- Debugging "Stop hook prevented continuation" errors after plugin install
- Debugging headless 401 errors after ~10 minutes
- Designing a recursion guard for a hook that recursively invokes Claude

## Hook Event Payloads

Every event payload includes universal fields: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`. Inside subagents: `agent_id`, `agent_type`. Event-specific fields:

| Event | Adds |
|---|---|
| `UserPromptSubmit` | `prompt` (raw user text) — **no transcript window**; tail `transcript_path` if you need recent turns |
| `Stop` | `last_assistant_message`, `stop_hook_active` (true when already blocked once — early-exit to prevent loops) |
| `SubagentStop` | `last_assistant_message`, `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path` |
| `SessionStart` | `source` (`startup`/`resume`/`clear`/`compact`), `model` |
| `PreToolUse` | `tool_name`, `tool_input` |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_response` |

`matcher` is **not supported** for `UserPromptSubmit`, `Stop`, `PostToolBatch`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`.

## Hook Output Formats

**Choose one approach per hook: JSON or exit code. Not both.**

### Inject context (SessionStart, UserPromptSubmit, PostToolUse)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "AUTO-INVOKE: ultrapowers:brainstorming. Reasoning: feature build."
  }
}
```

`additionalContext` is capped at **10,000 chars**; overflow spills to a side file with a preview.

### Block an event and force continuation (Stop, SubagentStop, UserPromptSubmit, PostToolUse, ConfigChange, PreCompact)

```json
{
  "decision": "block",
  "reason": "You ended on a permission-ask mid-job. Continue."
}
```

The `reason` field is fed back to Claude as the continuation prompt.

### Allow / deny / ask (PreToolUse, PermissionRequest)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "blocked by config-protection"
  }
}
```

### Universal fields (any event)

`continue` (false stops Claude entirely), `stopReason`, `suppressOutput`, `systemMessage`.

### Exit-code semantics (when you choose this path)

- `0` → success; stdout JSON parsed, plain stdout appended to context for inject events
- `2` → blocking; stderr fed to Claude as feedback; **stdout JSON ignored**
- other → non-blocking error logged

## Plugin-Shipped Hook Gotchas

### Path resolution

Plugin hook commands **must** use `${CLAUDE_PLUGIN_ROOT}`. Absolute paths fail validation:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/auto-router.sh",
          "timeout": 15 } ] } ]
  }
}
```

### Plugin Stop-hook exit-2 bug (`anthropics/claude-code#10412`)

Plugin-shipped Stop hooks that return exit-2 fail with *"Stop hook prevented continuation"* even when the equivalent local-hook config works. **Workaround:** always use `exit 0` + JSON `{"decision": "block", "reason": "..."}` for plugin-shipped Stop hooks. Never use exit-2 inside a plugin.

## Recursion Guards

Two layers:

### Env-level (for hooks that invoke `claude -p`)

Claude Code sets `CLAUDECODE=1`, `CLAUDE_CODE_SSE_PORT`, `CLAUDE_CODE_ENTRYPOINT` in subprocess environments. A nested `claude -p` detects `CLAUDECODE` and refuses to start. Unset all three before invoking:

```bash
env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT \
  claude --bare -p "$prompt" \
  --model haiku \
  --output-format json
```

### Payload-level (for Stop self-loops)

```bash
if [ "$(jq -r '.stop_hook_active' <<< "$payload")" = "true" ]; then
  exit 0  # already blocked once, allow Stop now
fi
```

Use both. They protect against different failure modes.

## Headless `claude --bare -p` for In-Hook Classification

`--bare` skips hook/skill/plugin/MCP/CLAUDE.md auto-discovery — fast, deterministic, recursion-safe.

```bash
result=$(env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT \
  claude --bare -p "$user_prompt" \
  --model opus \
  --append-system-prompt "$CLASSIFIER_INSTRUCTIONS" \
  --output-format json \
  --json-schema "$SCHEMA_JSON" \
  --max-turns 1 \
  --max-budget-usd 0.05 \
  --exclude-dynamic-system-prompt-sections \
  --disallowedTools "Bash,Edit,Write,Read" \
  2>/dev/null)
```

Key flags:

- `--bare` — skip auto-discovery
- `--json-schema` — enforce strict output shape (use over `--output-format json` alone)
- `--max-turns 1` — single-turn classifier
- `--max-budget-usd` — hard cost ceiling per call
- `--exclude-dynamic-system-prompt-sections` — improve cache reuse across invocations
- `--disallowedTools` — drop tool descriptions from system prompt for cheaper calls

`--model` accepts aliases (`opus`, `sonnet`, `haiku`, `default`, `best`, `opusplan`) or full IDs (`claude-opus-4-7`). **Prefer aliases** for portability across model upgrades.

### Auth in `--bare` mode

`--bare` skips OAuth / keychain reads. Set `ANTHROPIC_API_KEY` or use `claude setup-token` for a long-lived token. **OAuth tokens are not refreshed in headless mode** (`anthropics/claude-code#28827`) — they 401 after ~10–15 min. Always have an `ANTHROPIC_API_KEY` fallback.

### JSON output envelope

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 1234,
  "num_turns": 1,
  "result": "<assistant text>",
  "structured_output": { /* present when --json-schema set */ },
  "session_id": "...",
  "total_cost_usd": 0.0012,
  "usage": { "input_tokens": ..., "output_tokens": ... }
}
```

`subtype` values include `success`, `error_max_turns`, `error_budget`, `error_max_structured_output_retries`.

## Active-Skill-Flow Detection

The `UserPromptSubmit` payload has no transcript window. To detect "we're already inside a skill flow," tail the transcript file:

```bash
transcript_path=$(jq -r '.transcript_path' <<< "$payload")
recent=$(tail -n 30 "$transcript_path" 2>/dev/null)
if grep -q '<command-name>ultrapowers:' <<< "$recent"; then
  exit 0  # active skill, passthrough
fi
```

Cheap (no LLM call), specific (matches the harness's actual skill-invocation marker).

## Model-Conditional Injection

When a SessionStart hook should inject different context depending on the session model (e.g., inject directive A only on sonnet/haiku sessions, skip on opus), read `model` from the payload and substring-match against alias forms:

```bash
session_model=$(jq -r '.model // ""' <<< "$payload")
case "$session_model" in
  *sonnet*|*haiku*)
    additional_context+=$'\n\n'"$(cat "${PLUGIN_ROOT}/hooks/lib/sonnet-haiku-directive.txt")"
    ;;
esac
```

Substring matching handles aliases (`opus`/`sonnet`/`haiku`) AND full IDs (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) AND future dated variants — no enumeration of model IDs needed.

**Failure mode:** if `model` is missing or empty, default conservative — do NOT inject. Treat unknown like opus (the strongest tier; safest default for "skip the lower-tier-only directive").

This pattern is how ultrapowers' SessionStart hook ships model-tier-conditional directives without hardcoding a model registry.

## Fail-Open Pattern

Any hook failure must not break the session. Wrap risk:

```bash
set +e
result=$(call_classifier 2>>"$LOG" || echo "")
set -e

if [ -z "$result" ] || ! jq -e . <<< "$result" > /dev/null; then
  exit 0   # passthrough on any failure
fi
```

Failure modes that should fail-open: classifier timeout, malformed JSON, 401 / network error, missing `ANTHROPIC_API_KEY`, parser error.

## Wiring (settings.json or plugin `hooks/hooks.json`)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/auto-router.sh",
          "timeout": 15 } ] } ],
    "Stop": [
      { "hooks": [
        { "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce.sh",
          "timeout": 10 } ] } ]
  }
}
```

Hook `type` values: `command`, `http`, `mcp_tool`, `prompt`, `agent`. Set `"disableAllHooks": true` in user settings as a kill switch.

## Common Mistakes

| Mistake | Reality |
|---|---|
| Using exit-2 in a plugin-shipped Stop hook | Bug `#10412`: fails. Use exit-0 + `{"decision":"block","reason":"..."}` |
| Forgetting `${CLAUDE_PLUGIN_ROOT}` | Plugin validation fails. Never use absolute paths inside a plugin |
| Calling `claude -p` without `env -u CLAUDECODE` | Refuses to start: *"Cannot be launched inside another Claude Code session"* |
| Relying on OAuth in headless mode | 401 after ~15 min. Always set `ANTHROPIC_API_KEY` |
| Mixing exit code 2 + JSON output | Docs: choose one. Exit-2 makes JSON ignored |
| Putting >10K chars in `additionalContext` | Spills to file; users see only a preview |
| Using dated model IDs (`claude-haiku-4-5-20251001`) | Not confirmed valid for `--model`. Use aliases |
| Not handling `stop_hook_active=true` | Risk infinite block-loop on Stop hooks |
| Writing transcript-window logic for `UserPromptSubmit` | Payload has only `prompt`. Tail `transcript_path` instead |
| Skipping `--json-schema` and parsing free-text JSON | Brittle. `--json-schema` enforces strict shape |

## Sources

- https://code.claude.com/docs/en/hooks — event inventory, payloads, output schemas
- https://code.claude.com/docs/en/hooks-guide — practical patterns
- https://code.claude.com/docs/en/plugins-reference — plugin hook wiring
- https://code.claude.com/docs/en/headless — `claude -p`, `--bare`, structured outputs
- https://code.claude.com/docs/en/cli-reference — full CLI flag list
- https://code.claude.com/docs/en/model-config — model aliases and IDs
- https://github.com/anthropics/claude-code/issues/10412 — plugin Stop-hook exit-2 bug
- https://github.com/anthropics/claude-code/issues/28827 — OAuth refresh in headless
- https://github.com/anthropics/claude-agent-sdk-python/issues/573 — `CLAUDECODE` recursion guard
