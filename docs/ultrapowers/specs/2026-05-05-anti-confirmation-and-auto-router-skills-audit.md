# Skills Audit — Anti-Confirmation Enforcement, Auto-Router, Autonomous Decisions

**Date:** 2026-05-05
**Spec:** `2026-05-05-anti-confirmation-and-auto-router-design.md`
**Research brief:** `2026-05-05-anti-confirmation-and-auto-router-research-brief.md`

## Stack

Bash (hook scripts), JSON (config + plugin manifests), Markdown (skill + agent definitions), `claude --bare -p` headless invocations. Claude Code platform extension work — no traditional application language.

## Language Best Practices

| Language | Status | Skill | Action |
|---|---|---|---|
| Bash | Missing-deferred | — | Generic bash hygiene (`set -euo pipefail`, signal traps, JSON output without `jq` dependency) goes in implementation plan. Not enough surface to justify a `bash-best-practices` skill in this project. |

## Category Skills

| Category | Status | Skill | Action |
|---|---|---|---|
| Testing/TDD | External | `ultrapowers-dev:testing-tdd` | Reference for hook regex test corpora and classifier accuracy harness |
| Error handling | External | `ultrapowers-dev:error-handling` | Reference for fail-open hook design |
| Resilience | External | `ultrapowers-dev:resilience` | Reference for timeouts, classifier fallback, retry semantics |
| Observability | External | `ultrapowers-dev:observability` | Reference for hook logging to `~/.claude/logs/auto-router.log` |
| Auth/Security | External | `ultrapowers-dev:auth-security` | Reference for `ANTHROPIC_API_KEY` handling, env-var hygiene |
| Architecture | External | `ultrapowers-dev:architecture` | Minimal application; reference if needed |
| Design patterns | N/A | — | Not directly relevant for short hook scripts |
| Database / API design / Type safety / Background jobs / CI-CD / RAG-AI | N/A | — | Not in scope |

## Domain Competencies

| Competency | Status | Skill | Action |
|---|---|---|---|
| Plugin authoring (manifest, marketplace, multi-platform) | External | `ultrapowers-dev:plugin-development` | Reference; covers structure but light on hook-specific operational details |
| Skill authoring meta-skill | External | `ultrapowers:writing-skills` | Reference when creating the new `no-permission-asks` and `autonomous-decision` skills the spec mandates |
| Orchestrator-workers pattern | External | `ultrapowers-dev:orchestrator-workers` | Reference for auto-router-as-orchestrator design |
| Multi-agent handoffs (opus → sonnet → haiku phase boundary) | External | `ultrapowers-dev:multi-agent-handoffs` | Reference for model-routing implementation |
| Claude Code hook event semantics (payloads, outputs, blocking) | Missing | — | **Create** `writing-claude-code-hooks` (bundle below) |
| Headless `claude --bare -p` patterns | Missing | — | Bundle into same skill |
| Recursion guard mechanisms (`CLAUDECODE`, `stop_hook_active`) | Missing | — | Bundle into same skill |
| Plugin-specific hook bugs and workarounds (`#10412`, `${CLAUDE_PLUGIN_ROOT}`) | Missing | — | Bundle into same skill |
| Conversational opt-out classification (prompt-engineering heuristics) | Plan-level | — | One-off; spec the classifier prompt directly in the implementation plan |

## Coverage Summary

- Covered: 0
- Stale: 0
- Missing: 1 (bundled — see below)
- External: 9
- N/A: 7
- Plan-level: 1

## Skills to Create

### 1. `writing-claude-code-hooks` (new, in this repo at `skills/writing-claude-code-hooks/`)

Operational knowledge for authoring Claude Code hooks and headless invocations. Bundles four related Missing competencies into one focused skill since they're tightly coupled in practice.

**Sections:**

1. **Hook event payload schemas** — universal input fields plus event-specific fields (UserPromptSubmit `prompt`, Stop `last_assistant_message` + `stop_hook_active`, SessionStart `source`/`model`).
2. **Hook output formats** — `hookSpecificOutput.additionalContext` for context injection (10,000-char cap), top-level `decision: "block"` + `reason` for blocking events. Exit-code semantics (0 = JSON-driven, 2 = blocking via stderr, others = non-blocking error). Crucial: choose JSON or exit-code, not both.
3. **Plugin-shipped hook quirks** — `${CLAUDE_PLUGIN_ROOT}` is mandatory (absolute paths fail validation). Stop-hook exit-2 bug (`anthropics/claude-code#10412`): plugin-shipped Stop hooks must use `exit 0` + JSON `{"decision": "block", "reason": "..."}` instead of exit-2.
4. **Recursion guards** — `CLAUDECODE` env var must be unset before invoking `claude -p` from inside a hook (`env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT`). For Stop self-loops, use `stop_hook_active` short-circuit. Defense in depth: combine env-level + payload-level guards.
5. **Headless `claude --bare -p` patterns** — `--bare` skips hooks/skills/plugins/MCP/CLAUDE.md auto-discovery. Use `--json-schema` for parser-safe output (over `--output-format json` alone). `--max-turns 1`, `--max-budget-usd <n>`, `--disallowedTools` for tight, cheap classifier calls. `--exclude-dynamic-system-prompt-sections` for cache reuse.
6. **Auth & failure modes** — OAuth 401 issue in headless mode (`anthropics/claude-code#28827`): tokens not refreshed, 401 after ~10–15 min. Use `ANTHROPIC_API_KEY` or `claude setup-token`-derived long-lived token. Fail-open pattern: any failure (timeout, malformed JSON, 401, network) returns passthrough.
7. **Active-skill-flow detection** — read `transcript_path` from the hook payload, tail the last N lines (JSONL), grep for `<command-name>` markers from skill invocations. Cheap; no LLM.

**Why bundle**: all four Missing items are operational knowledge needed to author production-grade Claude Code hooks. Splitting would produce four shallow skills that always travel together. One focused skill is more useful and matches the ultrapowers naming convention (`writing-skills`, `writing-plans`).

## Skills to Reference in Plan

- `ultrapowers-dev:plugin-development` — base plugin structure, manifest, distribution
- `ultrapowers-dev:orchestrator-workers` — auto-router design pattern
- `ultrapowers-dev:multi-agent-handoffs` — phase-based model routing
- `ultrapowers-dev:error-handling` — fail-open semantics for hooks
- `ultrapowers-dev:resilience` — timeouts, retries, classifier fallback
- `ultrapowers-dev:observability` — hook logging
- `ultrapowers-dev:auth-security` — credential handling for headless mode
- `ultrapowers-dev:testing-tdd` — hook regex test corpora, classifier accuracy harness
- `ultrapowers:writing-skills` — for creating the two new ultrapowers skills (`no-permission-asks`, `autonomous-decision`) that the spec mandates as deliverables

## Decision

Gap exists. Hand off to `skills-creation` to create `writing-claude-code-hooks`. After it's written, the implementation plan can reference it alongside the External skills above.
