# Research Brief — Advisor Pattern via Subagents

**Date:** 2026-05-06
**Spec:** `2026-05-06-advisor-pattern-via-subagents-design.md`
**Cutoff:** Findings verified 2026-05-06 against `docs.claude.com/en/docs/claude-code/*` and `github.com/anthropics/claude-code`.

## Context

The brainstorming session approved a design that replicates Anthropic's API advisor tool using Claude Code's subagent primitive. The advisor agent (opus) is dispatched by the executor at three strategic moments: after orientation, on difficulty, before declaring done. Research focused on harness-specific gaps: subagent dispatch behavior, sub-subagent dispatch enforcement, context inheritance, dispatch latency, and prompt-template file locations.

## Key Findings

### 1. CRITICAL: Subagents cannot dispatch other subagents — at all

This is structural, not a permissions toggle.

Direct quote from `docs.claude.com/en/docs/claude-code/sub-agents`:

> "**Subagents cannot spawn other subagents, so `Agent(agent_type)` has no effect in subagent definitions.**"

And in Limitations:

> "Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills or chain subagents from the main conversation."

Confirmed in three open GitHub issues:

- `anthropics/claude-code#19077` (2026-01-18) — "Sub-agents can't create sub-sub-agents, even with Task tool access"
- `anthropics/claude-code#46424` (2026-04-10) — "Agent tool not available to sub-agents — prevents orchestrator pattern"
- `anthropics/claude-code#50306` (2026-04-18) — feature request to opt subagents into nested-Agent capability; **still open, not implemented**

**Implication for the spec:** the design's SDD integration path is architecturally invalid. The spec says "implementer (sonnet) dispatches advisor (opus)." Implementers in `subagent-driven-development` ARE subagents themselves. They cannot dispatch the advisor.

**Required spec revision (Section 5 — Skill content edits, and the Subagent-driven-development data flow):**

- Remove the implementer-side advisor dispatch.
- Move advisor consultation to the **controller** level. The controller (the main session running SDD) dispatches advisor at **task boundaries** — before dispatching the implementer for a new task (to check approach), and after the implementer reports DONE but before dispatching reviewers (to review the implementer's report).
- The implementer prompt template still gets a paragraph, but it instructs the implementer to **return with structured concerns** that signal "advisor consultation needed" (e.g., `DONE_WITH_CONCERNS` flagging strategic doubts) — the controller decides whether to dispatch advisor based on the report.
- The controller dispatches advisor only when **the controller's session model is sonnet or haiku**. If the controller is on opus, advisor is the same model — no benefit. The skill says when NOT to consult.

### 2. Subagent context inheritance: fresh context, no SessionStart propagation

From the docs:

> "Context: Fresh context with the prompt you pass" (sub-agents table)

And the existence of a separate `SubagentStart` hook event with its own `additionalContext` field confirms that parent SessionStart context does NOT propagate. From the hooks doc:

> "**SubagentStart**: Runs when a Claude Code subagent is spawned via the Agent tool... `additionalContext`: String added to **the subagent's** context at the start of its conversation, before its first prompt."

If SessionStart context already carried over, this hook would be redundant.

**Implication for the spec:** the SessionStart-injected `advisor-timing-directive.txt` reaches the **main session only**. Subagents (incl. SDD's implementer) don't see it. This was already partially anticipated in the spec's edge cases ("Solution: implementer prompt template carries the advisor directive directly. Belt + suspenders") — but combined with Finding 1, the prompt template can no longer instruct the implementer to dispatch advisor (they can't). The directive content needs to change to "report concerns; controller will consult advisor."

### 3. Subagent dispatch latency: substantial and unverified

No official benchmarks exist (`anthropics/claude-code#53706` requested them; closed without numeric data). Indirect signals from issues:

- `#54514` — each subagent dispatch pays a full model round-trip; parent's `/fast` mode does not propagate.
- `#46421` — parallel subagent dispatch creates a fresh prompt-cache entry per dispatch (no shared cache with parent).
- Forks doc explicitly contrasts forks (cache-shared) with named-subagent dispatch (cold-cache).

**Rough order-of-magnitude (unverified):** 5–15+ seconds for a "few Reads + short response" subagent dispatch on Opus, plus harness round-trip overhead. The API-native advisor tool (server-side sub-inference within a single `/v1/messages` call) avoids harness boundaries; expect a 2–5x latency advantage there.

**Implication for the spec:** the cost section should be honest. Subagent-based advisor adds substantial latency vs the API version. The trade-off is now: higher latency, harness-only (no SDK code), per-dispatch transparency in the transcript. Document this honestly so users with latency-sensitive workloads know the comparison.

### 4. Tool restriction: `tools` allowlist OR `disallowedTools` denylist; both work

Both fields exist. Direct quote:

> "If both are set, **`disallowedTools` is applied first, then `tools` is resolved against the remaining pool.** A tool listed in both is removed."

The advisor agent definition uses `tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]` (allowlist) per the spec. This is fine. `Agent` is omitted, but per Finding 1 the omission is **belt-and-suspenders** — the harness already filters Agent/Task from every subagent's tool registry regardless of what the frontmatter says. No code change to the spec on this; just note it's redundant.

**Footgun (separate from this design but worth flagging):** in JS/Python SDK contexts, `disallowedTools` (camelCase) vs `disallowed_tools` (snake_case) wrong-casing is silently ignored. Markdown frontmatter is camelCase. Confirm casing if any plan step uses `disallowedTools`.

### 5. SessionStart payload model field: present, not currently parsed

The current `hooks/session-start` script does not parse `model` from stdin. Adding it is a one-line change:

```bash
session_model=$(echo "$payload" | jq -r '.model // ""')
```

Where `$payload` is the stdin already captured for other fields. No new dependency; `jq` already required by existing hooks.

**Substring matching:** the docs accept aliases (`opus`/`sonnet`/`haiku`) AND full IDs (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`). The spec's `*sonnet*|*haiku*` substring match works for both forms.

### 6. Implementer prompt template location: confirmed

`skills/subagent-driven-development/implementer-prompt.md` exists in the local repo (not in the cached plugin install). Structure:

- Header + template intro (lines 1–5)
- YAML-wrapped Task-tool dispatch prompt (lines 6–122)
- Pre-implementation question phase (lines 8–27)
- Required First Step: Invoke TDD Skill (lines 29–35)
- Core job + TDD cycle (lines 37–51)
- Code organization (lines 53–65)
- Escalation paths (lines 66–82)
- Self-review checklist (lines 83–107)
- Report format (lines 109–122)

**Implication for spec (revised per Finding 1):** the prompt template gets a paragraph instructing implementer to **report concerns surfacing strategic doubts**, NOT to dispatch advisor. Insertion point: extend the existing escalation section (lines 66–82) and the report format (lines 109–122).

### 7. Executing-plans lacks separate prompt template files

`skills/executing-plans/SKILL.md` is self-contained (no `implementer-prompt.md` equivalent). Implementer logic is inline.

**Implication for the spec:** the advisor-consultation paragraph for executing-plans embeds directly into `SKILL.md`'s execution-loop section. The main session running executing-plans IS the executor; it can dispatch subagents directly (no harness restriction at the main-session level). This integration path remains valid as designed.

### 8. SubagentStart hook: a complementary primitive

Not in the original spec. Worth flagging as a future enhancement: `SubagentStart` could inject directives into specific subagent types (e.g., the implementer) without editing prompt templates. Given Finding 1, the directive content for implementer subagents would still be "report concerns" not "dispatch advisor." Defer to v1.1.

## Recommended Approach

The advisor pattern is viable, but the SDD integration must be at the **controller** level, not the implementer level. Specifically:

1. **Main-session integration (unchanged from spec):** sonnet main session dispatches advisor subagent at strategic moments. Works as designed.
2. **`executing-plans` integration (unchanged from spec):** inline executor (the main session) dispatches advisor. Works as designed.
3. **`subagent-driven-development` integration (REVISED):** controller (main session) dispatches advisor between tasks — once before dispatching the implementer (approach review), optionally once before dispatching the reviewers (post-implementation review). Implementer subagents do NOT dispatch advisor; they report concerns the controller can use to decide whether to consult.

The spec edits required:
- §2.5 Skill content edits — implementer prompt template gets "report concerns" paragraph, not "dispatch advisor"
- §3 Data flow / SDD integration — controller dispatches, not implementer
- §4 Error handling — drop the "implementer dispatching advisor" recursion edge case (impossible)
- §1 Goals / §3 Architecture — clarify "executor" applies to main session and inline executors only

## Implementation Notes

- **Restrict advisor's tools:** `tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]`. `Agent` is structurally unavailable to subagents anyway, but explicit allowlist is clearer than relying on the harness.
- **Brief format:** keep concise per Anthropic's documented advisor-output discipline. Brief in: task / approach / files explored / question. Advice out: ≤100 words, enumerated.
- **Latency expectation:** document honestly. Subagent dispatch adds 5–15+ s per advisor call. For long tasks (multi-minute), this is fine; for sub-minute tasks, may not be worth it. Skill should say so.
- **Controller-level dispatch in SDD:** the controller is typically the main session running on the user's default model. If that model is opus, advisor is no-op (skill detects and short-circuits). If sonnet/haiku, advisor adds value.
- **Cost observation:** defer to v1.1 unless the user specifically asks. Subagent dispatch costs are visible in the transcript; users can self-measure.

## Open Questions Resolved

- Q: Can implementers dispatch advisor? → A: No. Harness restriction. Move to controller level.
- Q: Does SessionStart context propagate to subagents? → A: No. Use SubagentStart hook or prompt template instead.
- Q: Where do SDD prompt templates live? → A: `skills/subagent-driven-development/implementer-prompt.md` (local repo).
- Q: Latency vs API advisor? → A: Substantially higher (5–15+ s per dispatch); unverified by official benchmarks.

## Open Questions Still Open

- Whether to ship SubagentStart-hook-based directive injection (lighter touch than editing prompt templates) as part of v1 or v1.1. Per autonomous-decision, defer to writing-plans.
- Whether `model` substring match (`*sonnet*|*haiku*`) is robust against future naming. Current models match; `claude-haiku-4-6` (hypothetical future) would match. Documented in the spec.

## Sources

- https://docs.claude.com/en/docs/claude-code/sub-agents — subagent definition format, tool restrictions, sub-subagent prohibition
- https://docs.claude.com/en/docs/claude-code/hooks — SessionStart vs SubagentStart, additionalContext format
- https://github.com/anthropics/claude-code/issues/19077 — sub-subagent dispatch confirmed unavailable
- https://github.com/anthropics/claude-code/issues/46424 — Agent tool unavailable to subagents (community confirmation)
- https://github.com/anthropics/claude-code/issues/50306 — open feature request for nested Agent dispatch
- https://github.com/anthropics/claude-code/issues/53706 — subagent latency benchmarks requested, closed without data
- https://github.com/anthropics/claude-code/issues/54514 — subagent dispatch full model round-trip, no parent /fast propagation
- https://github.com/anthropics/claude-code/issues/50112 — disallowedTools casing footgun (SDK)
- Local repo inspection: `skills/subagent-driven-development/implementer-prompt.md`, `skills/executing-plans/SKILL.md`, `agents/`, `hooks/session-start`, `.claude/ultrapowers-preferences.json`
