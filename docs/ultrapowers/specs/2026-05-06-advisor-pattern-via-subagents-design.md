# Advisor Pattern via Subagents — Design

**Date:** 2026-05-06
**Status:** Design — pending research
**Distribution:** Shipped in the `ultrapowers` plugin (default-on for sonnet/haiku sessions; per-repo disable available)

## Problem

Anthropic ships an [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) (beta header `advisor-tool-2026-03-01`) that pairs a fast executor model (haiku/sonnet/opus 4.6) with an opus 4.7 advisor consulted mid-generation. The executor decides when to call; the advisor sees the full transcript; returns a 400–700 token plan or course correction; the executor continues. This produces near-opus quality at near-sonnet cost on long-horizon coding/agent workloads where most turns are mechanical but planning is decisive.

The advisor tool is an **API-level feature** — it lives inside `messages.create`. Claude Code's main session uses one model fixed at session start; there is no built-in mid-turn model handoff. Users running through Claude Code (the harness) cannot directly access the advisor tool.

We want the same pattern's benefits — fast executor + strong-model strategic checkpoints — using only the harness primitives we already have: subagents, hooks, and skills.

## Goals

1. Replicate the advisor pattern's value props (fast execution, strong-model strategic consultation) using Claude Code subagents.
2. Codify the three Anthropic-recommended timings (after orientation, on difficulty, before declaring done) in a skill so executor sessions consult the advisor at the right moments.
3. Auto-engage the advisor directive at session start when the session model is sonnet or haiku; skip on opus (the executor is already advisor-class).
4. Integrate cleanly with `subagent-driven-development` and `executing-plans` so the existing pipelines benefit without rework.
5. Ship as part of the ultrapowers plugin; default-on for sonnet/haiku; per-repo disable knob.

## Non-goals

- Calling the Anthropic API directly. This design uses Claude Code's Agent tool for dispatch.
- Replicating the API advisor's literal-transcript view. Subagents receive a focused **brief** instead — often better because the executor controls what's relevant.
- Supporting opus sessions (the directive no-ops). Opus executors don't benefit from an opus advisor at meaningful margin.
- Auto-detecting "strategic checkpoints" via PreToolUse hooks (Approach 3 in brainstorming). Deferred to a future iteration.

## Architecture

Four coordinated pieces, all using existing ultrapowers primitives:

1. **`advisor` agent** — `model: opus`, read-only toolset, distinct identity from `planner` (pre-work design) and `code-reviewer` (post-step audit). Job: mid-task strategic checkpoint.
2. **`consulting-the-advisor` skill** — codifies the three timings, the brief format passed to the advisor, the conflict-resolution pattern, and when NOT to consult.
3. **SessionStart directive injection** — `hooks/lib/advisor-timing-directive.txt`, conditionally appended to the session-start `additionalContext` only when the session model is sonnet or haiku.
4. **Skill content edits** — `executing-plans` gets an "Advisor Consultation" paragraph in its inline execution loop. `subagent-driven-development` gets controller-level dispatch instructions plus an implementer prompt-template update for surfacing strategic concerns (see §2.5 — implementer subagents cannot dispatch advisor themselves). `using-ultrapowers` adds the new skill to the always-on directive set.

The advisor receives a focused brief, not the literal transcript. Brief shape: task description, current state, what's been tried, the specific question.

**Harness constraint (verified during research):** Claude Code subagents cannot dispatch other subagents — confirmed in docs and `anthropics/claude-code` issues #19077, #46424, #50306. This shapes integration: only main sessions and inline executors can dispatch advisor. SDD's implementer subagents cannot. SDD consultation moves to the **controller level** (the main session running SDD), with implementers reporting concerns the controller acts on.

**Latency caveat (verified during research):** subagent dispatch adds 5–15+ seconds per advisor call versus the API-native version (server-side sub-inference). For sub-minute tasks the overhead may not pay off; for multi-minute tasks it's negligible. No published Anthropic benchmarks exist; the figure is community-reported.

## Components

### 1. `agents/advisor.md`

```markdown
---
name: advisor
description: Mid-task strategic checkpoint. Use when the executor needs course correction, a sanity check before substantive work, or a final review before declaring done. Distinct from `planner` (pre-work design) and `code-reviewer` (post-step audit).
tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]
model: opus
---
```

Body codifies: when called (the three timings), output format (≤100 words, enumerated steps, no prose), constraints (read-only, give executor evidence weight, surface conflicts, no follow-up questions). Anthropic's documented conciseness pattern.

**Tools deliberately excluded:** `Agent` (no recursive dispatch), `Edit`, `Write`, `NotebookEdit` (read-only). The advisor is a leaf node.

### 2. `skills/consulting-the-advisor/SKILL.md`

Frontmatter description (triggers only):

> Use when running an executor session (sonnet/haiku) on multi-step work — codifies when to dispatch the advisor agent (after orientation, on difficulty, before declaring done) and what brief to pass; do not use on opus sessions (the executor is already advisor-class).

Body covers:

- **Timing rules** — three Anthropic-derived moments; one-paragraph "when NOT to consult" (mechanical follow-up, tool output dictating next action, trivial fast-path tasks).
- **Brief template** — task / approach considering / files explored / specific question. Concrete example.
- **Acting on advice** — give it serious weight; if empirical evidence contradicts, surface explicitly via reconcile call rather than silent override.
- **Reconcile-call pattern** — second advisor invocation with the conflict explicit ("I found X, you suggested Y, which constraint breaks the tie?").
- **Anti-patterns** — asking the advisor to do orientation work for you; consulting on every tool call; using the advisor as a permission-ask substitute.
- **Cross-reference** to `no-permission-asks` (advisor consultation is not a permission-ask — the executor already has authority to act; the advisor accelerates good decisions, doesn't gate them).

### 3. `hooks/lib/advisor-timing-directive.txt`

New directive file mirroring `hooks/lib/no-permission-asks-directive.txt`. Content paraphrases Anthropic's recommended advisor system prompt, adapted for subagent dispatch. Final block injected into `additionalContext`:

```
=== ADVISOR TIMING (sonnet/haiku sessions) ===
You are running on a fast executor model. For multi-step tasks, dispatch the `advisor` agent (opus, read-only) at three moments:

1. After orientation (a few file reads), BEFORE substantive work — review your proposed approach.
2. When stuck — errors recurring, approach not converging, results that don't fit.
3. Before declaring done. Write the durable result first (file, commit, tool output), THEN call the advisor.

Brief format: "Task: <X>. Approach considering: <Y>. Files explored: <Z>. Question: <Q>."

Treat the advice with serious weight. If your empirical evidence contradicts the advice, do not silently switch — dispatch a reconcile call surfacing the conflict.

Do NOT consult on:
- Mechanical follow-up dictated by tool output you just read
- Trivial fast-path tasks (typo fix, rename, single-file edit with known pattern)
- Permission-asks (the advisor accelerates decisions, it does not gate them)

Full skill: ultrapowers:consulting-the-advisor
```

### 4. `hooks/session-start` extension

Add a model-detection step. Pseudocode:

```bash
# After existing using-ultrapowers + no-permission-asks injection
session_model=$(echo "$payload" | jq -r '.model // ""')
case "$session_model" in
  *sonnet*|*haiku*)
    advisor_directive=$(cat "${PLUGIN_ROOT}/hooks/lib/advisor-timing-directive.txt" 2>/dev/null || echo "")
    if [ -n "$advisor_directive" ]; then
      using_ultrapowers_content+=$'\n\n'"$advisor_directive"
    fi
    ;;
esac
```

Substring match handles `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, plain aliases (`sonnet`, `haiku`), and any future dated variants. Opus sessions skip.

If `model` is missing or empty: fail conservative — don't inject. (Treat unknown like opus.)

### 5. Skill content edits

#### `skills/subagent-driven-development/SKILL.md` (controller-level dispatch)

The harness prohibits subagents from dispatching subagents (verified in research brief). Implementer subagents in SDD therefore CANNOT dispatch the advisor. Consultation moves to the **controller level** — the main session running SDD.

Two coordinated edits:

1. **Add a "Controller-Level Advisor Consultation" section to `SKILL.md`.** When the controller's session model is sonnet/haiku and the plan has multi-step tasks, the controller dispatches advisor:
   - **Before dispatching the implementer for a task** with the plan excerpt + context — to check the approach.
   - **Optionally, before dispatching reviewers** if the implementer's report flags strategic concerns (`DONE_WITH_CONCERNS`).
   The controller skips advisor dispatch when its session model is opus (no benefit; the controller is already advisor-class).

2. **Update `skills/subagent-driven-development/implementer-prompt.md`** with a new "Surfacing Strategic Concerns" paragraph. Insertion points: extend the existing escalation section (around lines 66–82) and the report format (around lines 109–122). The implementer is instructed to:
   - Surface strategic doubts in its report (e.g., "I implemented X but I'm uncertain whether Y is the right invariant — controller may want to consult advisor before reviewers run").
   - Use `DONE_WITH_CONCERNS` status when concerns are non-blocking but advisor input would help.
   - **NOT** attempt to dispatch advisor itself (it cannot — harness restriction).

#### `skills/executing-plans/SKILL.md` (inline executor dispatches directly)

`executing-plans` is the inline path; the executor IS the main session and CAN dispatch subagents. Add an "Advisor Consultation" paragraph in the execution-loop section (around line 46–54 per the current structure). When the inline executor is on sonnet/haiku, it consults the advisor at the three moments documented in the new skill: after orientation, on difficulty, before declaring done.

#### `skills/using-ultrapowers/SKILL.md`

Add `consulting-the-advisor` to the "Always-On Directive Set" alongside `no-permission-asks` and `autonomous-decision`. Note the model-conditional nature ("active for sonnet/haiku sessions; in SDD, applies to the controller, not implementer subagents").

### 6. Configuration

`.claude/ultrapowers-preferences.json` extends with optional `advisor` block:

```json
{
  "advisor": {
    "enabled": true,
    "model": "opus"
  }
}
```

If the block is absent, defaults apply (enabled, opus). Per-repo disable knob: `advisor.enabled: false` makes the SessionStart hook skip the directive injection and the skill short-circuits at the dispatch point.

`model` field is intentionally a knob (not hardcoded) so users can experiment with `claude-opus-4-7`, future opus versions, or any opus-tier alias. Documented in the skill that anything below opus defeats the purpose.

## Data flow

### Session lifecycle (sonnet executor)

```
SessionStart payload arrives
  │
  ▼
[hooks/session-start]
  ├─ existing: inject using-ultrapowers content
  ├─ existing: inject no-permission-asks-directive
  └─ NEW: if model =~ sonnet|haiku → inject advisor-timing-directive
  │
  ▼
session running on sonnet
  │
  ▼
user task arrives (or auto-router invokes a skill)
  │
  ▼
executor reads orientation files (Read/Grep/Glob)
  │
  ▼
[per consulting-the-advisor + injected directive]
  ▼
executor dispatches `advisor` subagent with brief
  │
  ▼
advisor (opus) returns ≤100-word enumerated plan
  │
  ▼
executor proceeds with implementation
  │
  ▼
[on difficulty / error / approach change]
  ▼
executor dispatches advisor again
  │
  ▼
[before declaring done — write durable result first]
  ▼
executor dispatches advisor for final check
  │
  ▼
final code-reviewer fires (existing pipeline)
```

### Subagent-driven-development integration (controller-level)

Subagents cannot dispatch subagents (harness restriction). The implementer therefore does NOT dispatch advisor; the controller does, at task boundaries.

```
controller (main session; if model is sonnet/haiku, advisor is meaningful)
  │
  ▼
[per consulting-the-advisor: before substantive work]
  ▼
controller dispatches advisor (opus) with task brief + plan excerpt
  │
  ▼
advisor returns ≤100-word enumerated approach
  │
  ▼
controller dispatches implementer subagent (sonnet) for Task N
  │  — implementer prompt now carries advisor's approach in its context
  │
  ▼
implementer reads context + plan excerpt
  │
  ▼
implementer implements per TDD discipline
  │  — implementer CANNOT dispatch advisor itself
  │  — surfaces strategic concerns in its report instead
  │
  ▼
implementer reports DONE / DONE_WITH_CONCERNS to controller
  │
  ▼
[if DONE_WITH_CONCERNS or report flags strategic doubt]
  ▼
controller dispatches advisor again with implementer's report + concerns
  │
  ▼
advisor returns guidance / proceed / change-approach
  │
  ▼
controller dispatches spec compliance reviewer (opus)
  │
  ▼
controller dispatches code quality reviewer (opus)
  │
  ▼
controller marks Task N complete
```

Controller's transcript captures advisor calls (visible to spec compliance reviewer). When the controller's session model is opus, the skill short-circuits and skips advisor dispatch — opus controllers are already advisor-class.

### Conflict resolution (reconcile call)

```
executor receives advisor advice → recommends approach Y
  │
  ▼
executor's prior file reads show approach X (conflict)
  │
  ▼
executor does NOT silently switch
  │
  ▼
executor dispatches advisor again with brief:
  "I found <X> in <file>:<line>, you suggested <Y>. Which constraint breaks the tie?"
  │
  ▼
advisor returns reconciliation
  │
  ▼
executor proceeds with reconciled approach
```

## Error handling

Fail-open universally. Advisor is advisory, not gating.

| Failure mode | Behavior |
|---|---|
| Advisor subagent dispatch fails (Agent tool error) | Executor logs, proceeds without advice. One retry on next strategic moment. |
| Advisor times out / no response | Executor logs, proceeds. One retry policy. |
| Advisor returns empty or malformed output (>100 words, no enumeration) | Executor reads what's there, treats best-effort, proceeds. |
| `advisor` agent file missing (incomplete plugin install) | Executor logs once at session start, switches to "advisor unavailable" mode silently for the rest of the session. |
| User has `advisor.enabled: false` | Skill short-circuits at the dispatch point; consultation is a no-op. SessionStart hook skips directive injection. |
| SessionStart hook can't read `model` from payload | Default to NOT injecting the advisor directive (conservative). Existing hook fail-open applies. |
| Advisor's advice contradicts user's stated goal | Per `autonomous-decision`: this triggers an ask, not silent compliance. Executor surfaces conflict to user. |
| Recursion (advisor dispatching advisor) | Subagents cannot dispatch subagents (harness restriction). Advisor agent's tool list also excludes `Agent` for clarity, but the harness enforces this regardless. Belt + suspenders. |
| Implementer attempts to dispatch advisor (incorrect prompt template) | Harness ignores the call (Agent tool unavailable to subagents). Implementer should fall back to surfacing concerns in its report — that's what the corrected prompt template instructs. |

### Edge cases

- **Opus main session spawning sonnet subagent (SDD).** Implementer subagent has fresh context; does not see SessionStart-injected directive (verified in research brief — subagents don't inherit SessionStart context; that's why `SubagentStart` exists as a separate event). Implementer's prompt template instead carries the "surface strategic concerns" instruction. Controller (opus) skips advisor dispatch since opus controllers are already advisor-class. End result: opus controller + sonnet implementers + no advisor calls in this configuration. The user gets the same behavior they have today.
- **Sonnet main session running SDD.** Controller (sonnet) dispatches advisor before/after each implementer task. Advisor pattern fully active.
- **Opus session running `executing-plans` on itself.** Skill no-ops; documented in "When NOT to consult." No dispatch.
- **Sonnet session running `executing-plans` (inline).** Inline executor (the main session) dispatches advisor at the three moments. Same as the documented `executing-plans` flow.
- **Trivial fast-path tasks** (per brainstorming triage). Skill says don't consult. Adds latency for no quality gain.
- **Sonnet session where user wants opus-only behavior.** Set `advisor.enabled: false` in prefs, or call advisor manually via Agent tool when desired.

## Testing

### Unit-level

- `agents/advisor.md` parses; frontmatter has `model: opus`, `tools` excludes `Agent`/`Edit`/`Write`/`NotebookEdit`.
- `skills/consulting-the-advisor/SKILL.md` frontmatter validates; description is triggers-only per `writing-skills` discipline.
- `hooks/lib/advisor-timing-directive.txt` exists, readable, contains expected section markers.
- `hooks/session-start` model-detection logic — feed payloads with `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-opus-4-7`, plain `opus`, `sonnet`, `haiku`, missing-model. Assert directive injected on sonnet/haiku matches; absent on opus and missing.

### Integration smoke (live session)

New `docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-smoke-tests.md`:

1. Sonnet session injects directive (assert `additionalContext` contains "ADVISOR TIMING").
2. Opus session skips directive (assert absent).
3. First-call dispatch — multi-step task on sonnet, observe advisor dispatch after orientation.
4. Mid-task dispatch on error — inject test failure, observe advisor dispatch.
5. Final-call dispatch — observe advisor dispatch before final report (after durable write).
6. Reconcile-call on conflict — provide context contradicting advisor advice, observe second advisor call.
7. `advisor.enabled: false` short-circuits — disable in prefs, observe no dispatches.
8. Implementer subagent in SDD dispatches advisor — run a task via subagent-driven-development, implementer's transcript shows advisor calls.

### Regression / interaction tests

- Existing 18-case Stop-hook test (enforce-no-permission-asks) still passes.
- Existing 22-case auto-router test still passes.
- `hooks.json` validates as JSON after the hook script edit (no JSON wiring change — the change is internal to `hooks/session-start`).

### Cost observation harness (deferred)

Spot-check: 5 representative SDD tasks on sonnet+advisor vs sonnet-only. Compare wall time, total tokens, quality of final output. Document in smoke-test doc. Defer to v1.1.

## Distribution

- Default-on for sonnet/haiku sessions on plugin install. Opus sessions unaffected.
- Per-repo disable: `.claude/ultrapowers-preferences.json` → `advisor.enabled: false`.
- Plugin `INSTALL.md` and `README.md` document the pattern, requirements (none beyond existing), bypass options, troubleshooting.

## Open questions

- Whether to expose the brief template format as user-customizable (some users may want different brief shapes per project). Defer to research; default to the documented template.
- Whether the implementer prompt template (in `subagent-driven-development`) should be split into separate "with advisor" and "without advisor" variants, or single template with conditional language. Defer to writing-plans.
- Whether to add a `~/.claude/logs/advisor.log` for cost tracking similar to `auto-router.log`. Defer; the implementer's transcript already captures advisor calls.

## Referenced Skills

The following installed sibling-pack skills are directly relevant. The implementation plan should cross-reference them where applicable:

- `ultrapowers-dev:multi-agent-handoffs` — phase-based opus/sonnet/haiku routing; advisor pattern is a handoff at strategic moments
- `ultrapowers-dev:orchestrator-workers` — advisor as orchestrator-style supervisor of a worker (executor)
- `ultrapowers-dev:agent-loop` — advisor injects strategic checkpoints into the executor's autonomous loop
- `ultrapowers-dev:tool-calling` — advisor dispatched as a tool call (Agent tool) by the executor
- `ultrapowers-dev:plugin-development` — shipping new agent + skill + hook lib file inside the plugin

Local skills:

- `writing-claude-code-hooks` — touching `hooks/session-start` model-detection logic; defines the JSON output and recursion-guard patterns
- `autonomous-decision` — referenced by `consulting-the-advisor` for "when NOT to consult" (truly ambiguous → ask user, not advisor)
- `no-permission-asks` — sibling in the always-on directive set; advisor consultation is not a permission-ask
