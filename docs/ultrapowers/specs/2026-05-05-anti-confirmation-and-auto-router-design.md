# Anti-Confirmation Enforcement, Auto-Router, and Autonomous Decision Policy

**Date:** 2026-05-05
**Status:** Design — pending research
**Distribution:** Shipped in the `ultrapowers` plugin (default-on for all users)

## Problem

Recent Claude model behavior produces excessive mid-task permission-asks ("Want me to X?", "Shall I proceed?", "Crack on with Y?"). The user has not asked Claude to stop — they gave it a job. Asking permission mid-job breaks flow and adds friction.

Three coupled problems:

1. **Permission-ask drift.** Models end mid-task turns with confirmation requests instead of completing the work. The `using-ultrapowers` directive does not stop this on its own.
2. **Skill-invocation forgetfulness.** Users have to remember to type `/ultrapowers:brainstorming` (or similar) to engage the workflow. When they don't, the work degrades to vanilla model output.
3. **In-skill user-asks for things the model can decide.** Skills currently ask users about task complexity, fast-path eligibility, scope tier, plan granularity, and similar — decisions the model has enough signal to make autonomously.

The model also lacks a clear phase-based model-routing convention: opus, sonnet, and haiku are used interchangeably across design and execution, leaving cost and latency on the table.

## Goals

1. Eliminate mid-task permission-asks via harness-level enforcement that survives model upgrades.
2. Auto-engage the right ultrapowers skill from any user prompt, with confidence-tiered fallback to suggestions or passthrough.
3. Replace user-asks at in-skill decision points with autonomous decisions, falling back to a single targeted question only when confidence is below a low floor.
4. Establish phase-based model routing: opus for design (brainstorm → plan), sonnet for execution, haiku for raw lookups.
5. Ship as part of the ultrapowers plugin so all users benefit by default; provide conversational opt-out.

## Non-goals

- Overriding the user's main-session model in `~/.claude/settings.json` (recommend; do not modify).
- Routing every prompt through an LLM classifier (chat-shaped prompts skip the classifier entirely).
- Forcing skill invocation when the user explicitly opts out conversationally ("just answer").
- Replacing `using-ultrapowers`'s skill-invocation mandate; this design augments it.

## Architecture

Three coordinated pieces shipped inside the `ultrapowers` plugin:

1. **Anti-confirmation enforcement** — `SessionStart` hook injects a hard directive; `Stop` hook scans final assistant messages for banned-phrase patterns and blocks Stop on mid-task matches, feeding Claude back into the loop.
2. **Auto-router** — `UserPromptSubmit` hook runs a shape-gated, opus-backed classifier that emits a route decision. Confidence ≥ 0.7 auto-invokes the matching skill; 0.4–0.7 suggests it; < 0.4 passes through.
3. **Autonomous decision policy** — codified in a new skill (`ultrapowers:autonomous-decision`) and applied via content edits to existing skills that currently ask the user about complexity, scope, or strategy.

Phase-based model routing layers on top: design pipeline (`brainstorming` → `deep-research` → `skills-audit` → `skills-creation` → `writing-plans`) runs in the main opus session; execution (`subagent-driven-development`, `executing-plans`, all implementation subagents) runs on sonnet — either via subagent dispatch with explicit `model:` frontmatter or in a new sonnet-tier session. Lookup operations (`Explore`, web search/fetch) run on haiku.

## Components

### 1. SessionStart hook — `hooks/inject-no-permission-asks.sh`

Bash script that emits a JSON `additionalContext` block at session start. Content: the no-permission-asks rule, the banned-phrase list, the "treat each user request as one job" directive, and a pointer to `ultrapowers:no-permission-asks` for the full spec.

Idempotent: safe to re-run if the session restarts.

### 2. UserPromptSubmit hook — `hooks/auto-router.sh`

Shape-gated, dual-mode router. Pseudocode:

```
if prompt starts with "/" → passthrough
if env ULTRAPOWERS_AUTOROUTER_ACTIVE=1 → passthrough (recursion guard)
if transcript shows active skill flow (last N turns contain <command-name>) → passthrough
if shape regex marks prompt as chat-like (questions, greetings, sub-50-char) → passthrough

# Otherwise: opus classifier
result = claude -p --model opus --append-system-prompt CLASSIFIER_PROMPT
       --output-format json
       <recent-context + user-prompt>

if result.confidence ≥ 0.7:
  inject "AUTO-INVOKE: ultrapowers:<skill>. Reasoning: <one-line>."
elif 0.4 ≤ result.confidence < 0.7:
  inject "SUGGEST: ultrapowers:<skill> may apply. Reasoning: <one-line>."
else:
  passthrough
```

**Classifier prompt** outputs strict JSON:

```json
{
  "route": "brainstorm | debug | plan-execution | research | ui | passthrough",
  "confidence": 0.0,
  "reasoning": "one short line"
}
```

Routes map to skills:

| Route | Skill |
|---|---|
| `brainstorm` | `ultrapowers:brainstorming` |
| `debug` | `ultrapowers:systematic-debugging` |
| `plan-execution` | `ultrapowers:executing-plans` |
| `research` | `ultrapowers:deep-research` |
| `ui` | `ultrapowers:paper-mcp-ui` |
| `passthrough` | (no skill; let main session handle directly) |

**Recursion guard:** the hook sets `ULTRAPOWERS_AUTOROUTER_ACTIVE=1` before invoking `claude -p` and uses a parent-PID check as a secondary guard.

**Conversational opt-out:** the inject is a directive to the main session, not a force-execute. The main session honors user-stated opt-outs ("just answer", "skip the workflow") because user instructions outrank ultrapowers skills per the priority order in `using-ultrapowers`.

### 3. Stop hook — `hooks/enforce-no-permission-asks.sh`

Scans the assistant's final message in the transcript for banned-phrase regex. If matched and:

- the user's most recent prompt was not itself a question, AND
- no `<skill-checkpoint>` marker exists in the assistant message,

then the hook blocks Stop and returns a continuation directive: *"You ended on a permission-ask mid-job. The user gave you a job — finish it. Continue."*

**Banned-phrase regex (case-insensitive, word-boundary-anchored):**

```
\b(want me to|shall i|should i (proceed|continue|go ahead)|crack on with|do you want me to|let me know if you('| wa)nt|ready (when|for) you|just (let me know|say the word))\b
```

**Sanctioned exemption:** skills that legitimately need to checkpoint with the user (brainstorming section approvals, writing-plans review gates) emit a `<skill-checkpoint>` context marker in the assistant message. The Stop hook respects the marker and allows Stop.

### 4. New skill — `ultrapowers:no-permission-asks`

Codifies the rule. Sections:

- The rule (one job per user request; no mid-task permission-asks).
- Banned phrases with examples.
- Allowed clarifying questions (before work starts; when genuinely blocked; at sanctioned skill checkpoints).
- Cross-reference from `using-ultrapowers`.

### 5. New skill — `ultrapowers:autonomous-decision`

Codifies the in-skill decision policy. Sections:

- The rule (decide autonomously from conversation signals; ask only when truly ambiguous).
- Confidence calibration table (≥ 0.7 silent; 0.4–0.7 announce; < 0.4 ask).
- Three triggers for asking the user:
  1. Two contradictory signals that cannot be reconciled by reading the codebase.
  2. The decision changes the user's stated goal (not just the path).
  3. The action is hard to reverse and the cost of being wrong is high.
- Cross-reference from `using-ultrapowers`.

### 6. Subagent model frontmatter

Plugin ships agent definitions (or updates existing ones) with explicit `model:` fields in their frontmatter:

| Agent | Model | Purpose |
|---|---|---|
| `Plan` | opus | Architecture and planning |
| `code-reviewer` | opus | Independent design review |
| `general-purpose` (execution variants) | sonnet | Implementation work |
| `Explore` | haiku | Fast read-only lookups |
| (new) `research-fetch` | haiku | Web search / fetch operations |

Agent frontmatter overrides the parent session's model for that subagent invocation. The user's main-session model is untouched.

### 7. Skill content edits — replacing user-asks with autonomous decisions

Specific files to edit (in this repo's `skills/` directory):

- `skills/brainstorming/SKILL.md` — current "simple-task fast-path triage" (commit `56b2b3b`) currently asks the user; replace with autonomous triage from prompt signals (verb, scope words, file count implied, keyword density).
- `skills/project-setup/SKILL.md` — autonomous detection of project type from `package.json`, `pyproject.toml`, `Cargo.toml`, etc., instead of asking.
- `skills/writing-plans/SKILL.md` — autonomous granularity decision from spec component count.
- `skills/executing-plans/SKILL.md` — autonomous subagent-strategy decision from plan structure (independent tasks → parallel; serial dependencies → sequential).
- `skills/subagent-driven-development/SKILL.md` — same.
- `skills/systematic-debugging/SKILL.md` — autonomous decision on hypothesis-vs-bisect strategy from error signal shape.

Each edit retains the option to fall back to a single targeted question when confidence is below 0.4, but defaults to deciding silently or with a one-line announcement.

### 8. Cross-references in `using-ultrapowers`

Add references to `ultrapowers:no-permission-asks` and `ultrapowers:autonomous-decision`. Both become part of the always-on directive set established at SessionStart.

### 9. Doc updates

- `skills/project-setup/SKILL.md` — recommend `"model": "claude-opus-4-7"` as the user-default in `~/.claude/settings.json` so the design pipeline runs on opus.
- `skills/executing-plans/SKILL.md` — explicit "switch session/subagent to sonnet at the execution boundary" directive.
- Plugin `README.md` and `INSTALL.md` — document the auto-router behavior, conversational opt-out, and confidence thresholds. Document how to disable per-repo via `.claude/ultrapowers-preferences.json` (extend the existing file with an `autoRouter: { enabled, invokeThreshold, suggestThreshold }` block).

## Data flow

### Per-turn (UserPromptSubmit)

```
user prompt
  │
  ▼
[auto-router.sh]
  ├─ "/" prefix? ────────────────► passthrough
  ├─ recursion env var set? ─────► passthrough
  ├─ active skill in transcript? ► passthrough
  ├─ shape regex says chat? ─────► passthrough
  │
  ▼
opus classifier → {route, confidence, reasoning}
  ├─ confidence ≥ 0.7  ──► inject AUTO-INVOKE
  ├─ 0.4 ≤ conf < 0.7 ──► inject SUGGEST
  └─ confidence < 0.4  ──► passthrough
  │
  ▼
main session sees prompt + injected directive
  │
  ▼
acts: invokes skill, suggests it, or proceeds normally
```

### Pipeline phases (model boundaries)

```
opus session (design phase)
  brainstorming → deep-research → skills-audit → skills-creation → writing-plans
                                                                     │
                                                                     ▼
                                                              plan written
                                                                     │
                  ┌──────────────────────────────────────────────────┴───────────────────┐
                  ▼                                                                      ▼
[same opus session: subagent-driven-development]                  [new sonnet session: executing-plans]
  dispatches sonnet subagents via Agent tool                       user prompted to start with sonnet model
                  │                                                                      │
                  ▼                                                                      ▼
                                              implementation runs on sonnet
                                                            │
                                                            ▼
                                       lookups (Explore, web) routed to haiku subagents
```

### Stop-hook (anti-confirmation)

```
assistant turn ends
  │
  ▼
[enforce-no-permission-asks.sh]
  ├─ user's last prompt was a question? ──► allow Stop
  ├─ <skill-checkpoint> marker present? ──► allow Stop
  │
  ▼
regex scan final assistant message
  ├─ matches banned phrases? ──► block Stop, feed continuation directive
  └─ no match            ──► allow Stop
```

## Error handling

Fail-open is the universal rule: a broken hook must never break a session.

| Failure mode | Behavior |
|---|---|
| Classifier `claude -p` call times out (>10s) | Passthrough; log to `~/.claude/logs/auto-router.log` |
| Classifier returns malformed JSON | Passthrough; log raw output |
| Classifier auth/network error | Passthrough; one-time stderr warning per session |
| Stop-hook regex throws | Allow Stop |
| SessionStart hook fails | Session continues without injected directive |
| Recursion sentinel missing | Hook double-guards via env var + parent-PID check |
| Confidence floor misconfigured | Hardcoded fallback: 0.7 invoke / 0.4 suggest |
| Agent frontmatter missing `model:` | Inherits parent session model; documented |

### Edge cases

- **Slash command + auto-router conflict** — slash always wins (early-exit before classifier).
- **Conversational opt-out** ("just answer", "skip the workflow") — main session honors user intent over hook suggestion; encoded in `using-ultrapowers` priority order.
- **Mid-skill double-route** — transcript scan looks for `<command-name>` markers from skill invocations in the last N turns; if present, passthrough.
- **Stop-hook false positive on legitimate clarifying questions** — skills emit `<skill-checkpoint>` markers; Stop hook respects them.
- **Model frontmatter conflict** — agent frontmatter wins for that subagent; main session model untouched.
- **Plugin disabled per-repo** — `.claude/ultrapowers-preferences.json` `autoRouter.enabled: false` short-circuits the hook.

## Testing

### Unit-level (hook scripts)

- `auto-router.sh` shape regex: corpus of 30+ task-shaped vs chat-shaped prompts; assert correct gating.
- `auto-router.sh` slash-prefix early-exit: assert immediate passthrough.
- `auto-router.sh` recursion guard: invoke with `ULTRAPOWERS_AUTOROUTER_ACTIVE=1`, assert immediate passthrough.
- `enforce-no-permission-asks.sh` regex: corpus of allowed phrasings (legitimate clarifying questions, skill checkpoints) vs banned phrasings; assert correct blocks vs passes.
- `enforce-no-permission-asks.sh` checkpoint exemption: assert presence of `<skill-checkpoint>` marker bypasses the regex check.

### Integration (live Claude Code session)

Smoke-test fixtures in `docs/ultrapowers/specs/2026-05-05-anti-confirmation-and-auto-router-smoke-tests.md` (matching the pattern of the existing `2026-04-23-workflow-defaults-and-sibling-integration-smoke-tests.md` spec).

Scenarios:

1. Type "build a contact form" → assert auto-invoke of `ultrapowers:brainstorming`.
2. Type "what does this file do?" → assert passthrough, no skill invoked, no classifier call.
3. Type "fix the failing test" → assert auto-invoke of `ultrapowers:systematic-debugging`.
4. Type `/ultrapowers:brainstorming foo` → assert passthrough (slash wins).
5. Mid-brainstorming, type follow-up → assert no double-route.
6. Have Claude end response with "Want me to continue?" mid-task → assert Stop hook blocks and feeds continuation prompt.
7. Have Claude end response with "Want me to continue?" *as a sanctioned skill checkpoint* → assert Stop hook allows.
8. Conversational opt-out: type "just answer directly: build X" → assert classifier still suggests but main session honors opt-out.
9. In-skill autonomous decision: invoke `brainstorming` with a small-scope prompt → assert fast-path triage decides silently, no user-ask.

### Classifier accuracy harness

- Static fixture file: 50 representative prompts × expected `{route, confidence-band}`.
- Run on-demand via headless `claude -p`; assert classifier output stays within bands.
- Tracks misroute rate over time; threshold-tuning data lives here.

### Failure-mode tests

- Kill the headless Claude process mid-call → assert passthrough fallback within 10s.
- Inject malformed JSON → assert passthrough.
- Boot session with no network → assert no hang; passthrough within 10s.

## Distribution

- Default-on for all ultrapowers users on plugin install.
- Per-repo disable via `.claude/ultrapowers-preferences.json`:
  ```json
  {
    "autoRouter": {
      "enabled": true,
      "invokeThreshold": 0.7,
      "suggestThreshold": 0.4
    }
  }
  ```
- Plugin `INSTALL.md` documents how to opt out, tune thresholds, and override the verb list used by the shape gate.

## Open questions

- Whether to expose the classifier prompt for user customization (e.g., add domain-specific routes for users with custom skills). Probably yes via a config file; details deferred to research phase.
- Whether the Stop-hook continuation directive should be configurable (some users may want a softer "please continue" vs the firm "finish the job"). Defer to research.
- Whether to ship a global "auto-router temporarily off" toggle keybinding (e.g., a meta key or slash command like `/raw`). Deferred.

## Referenced Skills

The following installed sibling-pack skills are directly relevant to implementation. The implementation plan should cross-reference them where applicable:

- `ultrapowers-dev:plugin-development` — shipping hooks, skills, and agent definitions inside the `ultrapowers` plugin: manifest structure, hook wiring, skill authoring conventions, multi-platform distribution.
- `ultrapowers-dev:orchestrator-workers` — the auto-router is an orchestrator pattern dispatching to skill workers; informs the classifier-decision-injection split.
- `ultrapowers-dev:multi-agent-handoffs` — phase-based opus → sonnet → haiku handoff at the design/execution boundary; informs subagent definitions and session-handoff prompts.
- `ultrapowers-dev:error-handling` — fail-open hook design and structured error logging across the three hook scripts.
