# Research Brief — Anti-Confirmation Enforcement, Auto-Router, Autonomous Decisions

**Date:** 2026-05-05
**Spec:** `2026-05-05-anti-confirmation-and-auto-router-design.md`
**Cutoff:** Findings verified 2026-05-05 against `code.claude.com/docs/en/*` and `github.com/anthropics/claude-code`.

## Context

The spec proposes three plugin-shipped mechanisms (SessionStart directive, UserPromptSubmit auto-router, Stop-hook enforcement) plus phase-based model routing. Research focused on (a) verified hook event semantics, (b) headless `claude -p` for the classifier, (c) plugin shipping mechanics, (d) the existing ultrapowers plugin layout.

## Key Findings

### 1. The existing `ultrapowers` plugin already ships hooks — extend, don't rebuild

`hooks/hooks.json` is wired with 4 hooks today:

| Existing hook | Event | Pattern to copy |
|---|---|---|
| `session-start` | SessionStart (matcher: `startup\|clear\|compact`, async: false) | Multi-platform JSON output (Claude Code uses `hookSpecificOutput.additionalContext`) |
| `config-protection` | PreToolUse (matcher: `Bash`) | Exit-code-2 blocking |
| `auto-format` | PostToolUse (matcher: `Edit\|Write`, async: true) | Silent side-effect |
| `compaction-suggestion` | PostToolUse + TaskCompleted | `hookSpecificOutput.additionalContext` injection |

**Implication for spec:**
- The new SessionStart directive piggy-backs on the existing `session-start` hook (extend its injected content) rather than adding a new hook to the same event.
- The new `auto-router.sh` and `enforce-no-permission-asks.sh` get added to `hooks/hooks.json` alongside the existing entries.
- Plugin manifest at `.claude-plugin/plugin.json` does NOT declare hooks — they're auto-discovered from `hooks/hooks.json`. No manifest edit needed.

The single existing agent (`agents/code-reviewer.md`) currently has `model: "inherit"`. Spec calls for opus on this agent; that's a one-line frontmatter edit.

### 2. Hook event payloads — what the scripts actually receive

Verified against `code.claude.com/docs/en/hooks`:

- **UserPromptSubmit** input contains only `prompt`, plus the universal fields (`session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`). **No transcript window in the payload** — to detect "active skill flow", the auto-router must read `transcript_path` itself.
- **Stop** input contains `last_assistant_message` (Claude's final response, ready to regex-scan) AND `stop_hook_active` (boolean — true when Stop was already blocked once, prevents infinite loops). **No transcript parsing needed** for the enforcement hook.
- **SessionStart** input contains `source` ("startup" | "resume" | "clear" | "compact"), `model` — the existing `session-start` hook already uses these.

**Implication for spec:**
- Update Stop-hook design: `last_assistant_message` is a payload field (not transcript-derived). Simpler than spec implied.
- Update auto-router design: include a "read transcript_path, scan last N messages for `<command-name>` markers" implementation note. The transcript file is JSON-Lines; cheap to tail.
- Add `stop_hook_active` short-circuit to Stop hook: if true, allow Stop unconditionally (we already blocked once, prevent loops).

### 3. Hook output: choose JSON or exit code, not both

Verified pattern for **blocking Stop and forcing continuation** (the core enforcement primitive):

```json
{
  "decision": "block",
  "reason": "You ended on a permission-ask mid-job. Continue."
}
```

Shape is identical for SubagentStop. The `reason` field is fed back to Claude as the continuation prompt.

**Critical: known plugin bug** (`anthropics/claude-code#10412`, still open as of 2026-05-05): Stop hooks shipped inside plugins **fail with `exit code 2`** even when the equivalent local-hook config works. Workaround verified: **always use `exit 0` + the JSON `{"decision": "block", ...}` form** for plugin-shipped Stop hooks.

For **inject-only** outputs (SessionStart, UserPromptSubmit) wrap in `hookSpecificOutput`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "AUTO-INVOKE: ultrapowers:brainstorming. Reasoning: <one line>."
  }
}
```

**`additionalContext` is capped at 10,000 chars** — overflow spills to a side file with a preview. Classifier output stays well under this limit.

### 4. Recursion guard — the canonical mechanism is `CLAUDECODE`, not a custom env var

Officially undocumented but verified across multiple GitHub issues (`claude-agent-sdk-python#573`, `danielmiessler#931`):

- Claude Code sets `CLAUDECODE=1` and additional `CLAUDE_CODE_*` env vars in every subprocess.
- A nested `claude -p` invocation **detects this and refuses to start** with: *"Claude Code cannot be launched inside another Claude Code session… To bypass this check, unset the CLAUDECODE environment variable."*
- v2.1.71+ also requires unsetting `CLAUDE_CODE_SSE_PORT` and `CLAUDE_CODE_ENTRYPOINT` to avoid hangs.

**Canonical pattern for the auto-router:**

```bash
env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT \
    claude --bare -p "$prompt" \
    --model opus \
    --append-system-prompt "$CLASSIFIER_PROMPT" \
    --output-format json \
    --max-turns 1 \
    --disallowedTools "Bash,Edit,Write,Read"
```

For **Stop self-loops**, the documented guard is the `stop_hook_active` field on the input payload — early-exit when true. Defense in depth: keep the spec's `ULTRAPOWERS_AUTOROUTER_ACTIVE` env-var sentinel as a secondary guard, but the primary mechanism is unsetting `CLAUDECODE`.

**Implication for spec:** update §2.2 (auto-router) to reflect both the `env -u` invocation pattern and the `stop_hook_active` short-circuit in §2.3.

### 5. Headless mode: `--bare` is the right mode for the classifier

Verified at `code.claude.com/docs/en/headless`. `--bare` is "the recommended mode for scripted and SDK calls" — skips hook/skill/plugin/MCP/CLAUDE.md auto-discovery. For our classifier:

```bash
claude --bare -p "<prompt>" \
  --model opus \
  --append-system-prompt "<classifier instructions>" \
  --output-format json \
  --json-schema '{"type":"object","required":["route","confidence","reasoning"],...}' \
  --max-turns 1 \
  --exclude-dynamic-system-prompt-sections \
  --max-budget-usd 0.05
```

- `--json-schema` enforces strict output shape (no parser fragility).
- `--exclude-dynamic-system-prompt-sections` improves cache reuse across invocations.
- `--max-budget-usd` caps spend per call as a hard backstop.
- `total_cost_usd` is returned in the JSON envelope for per-call cost logging.

Auth in `--bare` mode: **no OAuth / keychain reads**. Must rely on `ANTHROPIC_API_KEY` or an `apiKeyHelper` configured via `--settings`.

**Known issue** (`claude-code#28827`): OAuth tokens are not refreshed in headless mode and 401 after ~10–15 min. For users running ultrapowers via OAuth, the auto-router needs an `ANTHROPIC_API_KEY` fallback or a `claude setup-token`-derived long-lived token. Spec must document this requirement (and fail-soft to passthrough on 401, per the existing fail-open rule).

### 6. Model selection — `--model` aliases vs full IDs

Aliases supported: `default`, `best`, `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opus[1m]`, `opusplan`. Full IDs like `claude-opus-4-7` and `claude-sonnet-4-6` also accepted. Anthropic resolves `opus` → Opus 4.7, `sonnet` → Sonnet 4.6 currently.

**Uncertain:** whether dated IDs (e.g., `claude-haiku-4-5-20251001`) are valid for `--model`. Docs only show un-dated forms. **Recommendation: use aliases (`opus`, `sonnet`, `haiku`)** for portability across model upgrades.

### 7. Subagent model frontmatter — clean inheritance, no surprises

Resolution order (verbatim from `code.claude.com/docs/en/sub-agents`):
1. `CLAUDE_CODE_SUBAGENT_MODEL` env var
2. Per-invocation `model` parameter on the Agent tool call
3. Subagent definition's `model` frontmatter
4. Main conversation's model

Default: `inherit`. Plugin-shipped subagents IGNORE `hooks`, `mcpServers`, `permissionMode` for security — fine for our use case (we're only setting `model`).

**Implication for spec:** add new agent definitions in `agents/` (no manifest edit required); set `model: opus` on `Plan`, `model: sonnet` on a new `executor` (or use main session at sonnet), `model: haiku` on a new `research-fetch`. The existing `code-reviewer` flips from `inherit` to `opus` per spec §2.3.

### 8. Latency/cost — the opus classifier is the long pole

Community benchmarks (no first-party `claude -p` numbers):
- Haiku 4.5 TTFT ≈ 600 ms; total latency < 1 s for short prompts
- Sonnet ≈ 1.0–1.5 s
- Opus ≈ 1.5–3 s
- Plus Claude Code startup overhead (`--bare` minimizes this; estimate ~200–400 ms additional)

**Implication for spec:** the user explicitly chose opus for the classifier. With the shape-gate and confidence-tiered routing, classifier fires only on task-shaped prompts (~30% of turns) — the latency tax is acceptable on those turns. Document a `--model` config knob in `.claude/ultrapowers-preferences.json` so users can downgrade to haiku if they want more aggressive speed:

```json
{
  "autoRouter": {
    "enabled": true,
    "model": "opus",
    "invokeThreshold": 0.7,
    "suggestThreshold": 0.4
  }
}
```

### 9. Hook event matchers — UserPromptSubmit and Stop don't accept matchers

Verified: `matcher` field is **not supported** for UserPromptSubmit, Stop, PostToolBatch, TeammateIdle, TaskCreated/Completed, WorktreeCreate/Remove, CwdChanged. Wiring in `hooks/hooks.json`:

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
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-no-permission-asks.sh",
          "timeout": 10 } ] } ]
  }
}
```

**Critical:** plugin paths must use `${CLAUDE_PLUGIN_ROOT}`. Absolute paths fail validation.

### 10. Hook event inventory has expanded — opportunities flagged but out of scope

Beyond the events the spec uses, current event inventory now includes: `SubagentStart`, `TaskCreated`, `TaskCompleted`, `PermissionRequest`, `PermissionDenied`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`, `StopFailure`.

**Out of scope but worth flagging:**
- `Elicitation` / `ElicitationResult` — fires when Claude opens an interactive question prompt. Could be used as an additional anti-confirmation enforcement layer (block elicitation when not at a sanctioned checkpoint). Defer to v2.
- `SubagentStart` — useful for enforcing model routing (verify the subagent's model matches the phase). Defer.
- `PermissionRequest` / `PermissionDenied` — could automate "trust" decisions. Defer.

## Recommended Approach

The spec is broadly correct. Required edits before implementation planning:

1. **§2.1 SessionStart hook**: extend the existing `session-start` hook in `hooks/hooks.json` rather than adding a new hook. The new directive content gets concatenated into the existing `additionalContext` payload.
2. **§2.2 UserPromptSubmit hook**: switch from custom env-var recursion guard as primary to **`env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT`** before `claude --bare -p`. Keep `ULTRAPOWERS_AUTOROUTER_ACTIVE` as a defense-in-depth secondary guard. Clarify that "active skill flow" detection requires reading `transcript_path` from the payload (no built-in transcript window).
3. **§2.3 Stop hook**: read `last_assistant_message` from the payload (not transcript). Add `stop_hook_active` early-exit. Use exit-0 + JSON `{"decision":"block","reason":"..."}` form (NOT exit-2) due to plugin bug `#10412`.
4. **§2.6 Subagent model frontmatter**: agent definitions go in `agents/` directory, not manifest. Use aliases (`opus`/`sonnet`/`haiku`) not dated IDs for portability. Update existing `agents/code-reviewer.md` from `model: inherit` to `model: opus`.
5. **§9 Configuration schema**: add `autoRouter.model` field (default `"opus"`, accept any `--model` alias) so users can tune cost/latency without forking.
6. **New non-functional requirement**: document the `ANTHROPIC_API_KEY` requirement for `claude --bare -p` and add 401 handling (fail-soft to passthrough) per the existing fail-open rule.

## Implementation Notes

- **Classifier prompt**: use `--json-schema` (not just `--output-format json`) to guarantee parser-safe output. Schema enforces `route`, `confidence`, `reasoning`.
- **Active-skill-flow detection**: tail the last ~30 lines of `transcript_path` (JSONL) and grep for `<command-name>` blocks. Cheap, no LLM.
- **Conversational opt-out**: classifier prompt should be told to output `route: "passthrough"` when the user message contains opt-out language ("just answer", "skip", "no skill"). This shifts opt-out detection into the classifier rather than the main session.
- **Rollout**: add a `version` field to `autoRouter` config so future schema changes can migrate gracefully.

## Open Questions Resolved

- Q: Force vs suggest? → A: `decision: "block"` + `reason` is the canonical "force continuation" primitive; `additionalContext` is the canonical "suggest" primitive. Spec's dual-mode design maps cleanly.
- Q: Recursion guard? → A: `unset CLAUDECODE` (env-level), `stop_hook_active` (event-level). Both used.
- Q: Where do plugin agent definitions live? → A: `agents/` at plugin root, auto-discovered.

## Open Questions Still Open

- Whether to ship a `claude setup-token`-style long-lived token capture flow inside `project-setup` for users running ultrapowers via OAuth. Defer to implementation planning.
- Whether the auto-router should call out to `Elicitation`/`ElicitationResult` hooks as an additional permission-ask enforcement layer. Defer to v2.

## Sources

- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/agent-sdk/structured-outputs
- https://github.com/anthropics/claude-code/issues/10412 — plugin Stop-hook exit-2 bug
- https://github.com/anthropics/claude-code/issues/28827 — OAuth refresh in headless
- https://github.com/anthropics/claude-agent-sdk-python/issues/573 — CLAUDECODE recursion guard
- https://www.anthropic.com/claude/haiku — Haiku 4.5 latency
- Local repo inspection: `.claude-plugin/plugin.json`, `hooks/hooks.json`, `agents/code-reviewer.md`, `.claude/ultrapowers-preferences.json`, `skills/`
