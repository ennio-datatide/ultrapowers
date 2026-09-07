# Skills Audit — Advisor Pattern via Subagents

**Date:** 2026-05-06
**Spec:** `2026-05-06-advisor-pattern-via-subagents-design.md`
**Research brief:** `2026-05-06-advisor-pattern-via-subagents-research-brief.md`

## Stack

Bash (extending `hooks/session-start`), Markdown + YAML (new agent + skill files), JSON config (`.claude/ultrapowers-preferences.json`). Claude Code platform extension — same stack as the previous feature.

## Language Best Practices

| Language | Status | Skill | Action |
|---|---|---|---|
| Bash | Missing-deferred | — | Generic bash hygiene goes in implementation plan; not enough surface for a `bash-best-practices` skill in this project |

## Category Skills

| Category | Status | Skill | Action |
|---|---|---|---|
| Testing/TDD | External | `ultrapowers-dev:testing-tdd` | Reference for model-detection unit tests + integration smoke harness |
| Error handling | External | `ultrapowers-dev:error-handling` | Reference for fail-open dispatch pattern |
| Resilience | External | `ultrapowers-dev:resilience` | Reference for one-retry policy on advisor dispatch failure |
| Observability | External | `ultrapowers-dev:observability` | Reference if cost log is implemented (deferred to v1.1) |
| Architecture | External | `ultrapowers-dev:architecture` | Reference for multi-agent role separation rationale |
| Design patterns / Database / API design / Type safety / Background jobs / CI-CD / RAG-AI | N/A | — | Not in scope |

## Domain Competencies

| Competency | Status | Skill | Action |
|---|---|---|---|
| Plugin authoring (agent + skill + hook lib file) | External | `ultrapowers-dev:plugin-development` | Reference; covers manifest, distribution |
| Skill authoring meta-skill | External | `ultrapowers:writing-skills` | Reference when creating `consulting-the-advisor` |
| Multi-agent handoffs (phase routing) | External | `ultrapowers-dev:multi-agent-handoffs` | Reference for advisor/executor split |
| Orchestrator-workers pattern | External | `ultrapowers-dev:orchestrator-workers` | Reference for advisor-as-supervisor |
| Agent loop with strategic checkpoints | External | `ultrapowers-dev:agent-loop` | Reference for the three-timing pattern |
| Tool calling (Agent tool dispatch) | External | `ultrapowers-dev:tool-calling` | Reference for subagent dispatch mechanics |
| Claude Code hooks + headless mode | Stale | `writing-claude-code-hooks` (local, this repo) | **Small update** — add model-conditional injection pattern (5–8 lines) showing how SessionStart hooks can read `payload.model` and conditionally inject context. Used by the advisor feature; reusable for any future model-conditional hook work. |
| The advisor pattern itself | Deliverable | `consulting-the-advisor` (being created) | Not a gap — IS the feature being shipped |
| Subagent restrictions (no sub-subagent dispatch, no SessionStart context inheritance) | Captured in spec | — | Plan-level note in implementation steps; documented in spec §Architecture and §Error handling |

## Coverage Summary

- Covered: 0
- Stale: 1 (`writing-claude-code-hooks` needs a small addition)
- Missing: 0
- External: 9
- Plan-level: 1
- Deliverable: 1
- N/A: 7

## Skills to Update

### `skills/writing-claude-code-hooks/SKILL.md` — add Model-Conditional Injection pattern

The existing skill documents `SessionStart` payload includes the `model` field but does not show how to use it for conditional context injection. The advisor feature uses exactly this pattern (inject directive only when session model is sonnet/haiku). Add a new section between the existing "Hook event payloads" and "Hook output formats" sections, or under "Active-skill-flow detection" as a parallel pattern.

Content (under 200 words):

- Read `model` from the payload via `jq -r '.model // ""'`
- Substring-match against alias forms (`*sonnet*`, `*haiku*`, `*opus*`) — handles dated IDs (`claude-sonnet-4-6`) AND plain aliases (`sonnet`)
- Conditionally append context to `additionalContext`
- Failure mode: if `model` is missing or empty, default conservative (do not inject) — treats unknown like opus

Show one short bash example mirroring the advisor's session-start extension pattern.

## Skills to Reference in Plan

- `ultrapowers-dev:plugin-development` — base plugin structure for shipping new agent + skill + hook lib file
- `ultrapowers-dev:multi-agent-handoffs` — informs the advisor/executor role split
- `ultrapowers-dev:orchestrator-workers` — informs advisor-as-supervisor design
- `ultrapowers-dev:agent-loop` — informs the three-timing strategic-checkpoint pattern
- `ultrapowers-dev:tool-calling` — informs subagent dispatch mechanics
- `ultrapowers-dev:error-handling` — fail-open semantics
- `ultrapowers-dev:resilience` — one-retry policy
- `ultrapowers-dev:testing-tdd` — model-detection unit tests + smoke scenarios
- `ultrapowers:writing-skills` — for creating `consulting-the-advisor`
- `writing-claude-code-hooks` (local, after the update above) — model-conditional injection pattern

## Decision

One small skill update needed (not creation). Hand off to `skills-creation` to apply the targeted addition to `writing-claude-code-hooks`. Then writing-plans can reference it.
