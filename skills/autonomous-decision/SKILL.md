---
name: autonomous-decision
description: Use at any in-skill decision point — task complexity, scope tier, fast-path eligibility, audit depth, plan granularity, debugging strategy — to decide autonomously from conversation signals rather than asking the user; only fall back to a single targeted question when confidence is below 0.4 or signals are contradictory
---

# Autonomous Decision

## Overview

Skills hit decision points: is this task simple or complex? Does this project need a deep audit or a fast-path? Should the plan be coarse or fine-grained? Should debugging start with a hypothesis or a bisect?

**Decide autonomously.** The conversation almost always contains enough signal — the user's prompt, the spec, the codebase, the file count, the verb tense. Reading those signals is your job. Asking the user blocks them on something they implicitly delegated.

**The only exceptions:** truly contradictory signals you cannot reconcile, decisions that change the user's stated goal (not just the path), or decisions whose blast radius is high and irreversible.

## When to Use

- Always — this rule is active across all ultrapowers skills
- Cross-referenced from `using-ultrapowers` so it's part of the always-on directive set

## Confidence Calibration

| Confidence | Behavior |
|---|---|
| ≥ 0.7 | Decide silently, proceed |
| 0.4 – 0.7 | Decide, but announce the call in one line ("treating this as a small-scope task — fast-path through brainstorming"), then proceed |
| < 0.4 | Ask the user — but only with a single targeted question, not a menu |

## Three Triggers for Asking the User

Only ask if at least one applies:

1. **Contradictory signals.** Two or more strong signals point to different choices and you cannot reconcile them by reading code/docs.
2. **Goal shift.** The decision would change *what* you build, not just *how* you build it.
3. **High blast radius + irreversible.** Action affects shared state (force push, drop table, send message) and cannot be undone.

## Decision Examples

**Brainstorming fast-path triage** — signals: prompt length, verb specificity, scope keywords, codebase size, framework constraints. Decide silently in most cases.

**Plan granularity** — signals: spec component count, dependency density, file-touch surface area. Coarse for ≤3 components and tight coupling; fine-grained for ≥5 components or cross-cutting concerns.

**Debug strategy** — signals: error reproducibility, stack-trace depth, recent commit churn. Hypothesis-first when stack trace is informative; bisect-first when symptom is intermittent and recent.

**Subagent dispatch strategy** — signals: task independence, shared state. Parallel for independent tasks; sequential for dependency chains; serial for tasks that mutate shared state.

## How to Announce

When confidence is in the 0.4–0.7 band, announce in one line and proceed. Pattern:

> "<one-sentence call> — proceeding."

Examples:
- "Treating this as a small-scope task — fast-path through brainstorming. Proceeding."
- "Plan looks coarse-grain — three tasks, tight coupling. Proceeding."
- "Hypothesis-first: stack trace points clearly at the cache layer. Proceeding."

Don't elaborate. The user redirects in flight if wrong.

## Common Mistakes

- "I'll ask the user just to be safe." → That's the trap. Asking is not free; it costs flow. Decide.
- "I'll list options and let them pick." → Menu-asks fragment the work. Pick the most-likely-correct option and announce.
- "Confidence is exactly 0.5, what do I do?" → Treat as 0.4–0.7 band: announce + proceed. Round up.

## Why This Skill Exists

In-skill user-asks are an anti-pattern: they delegate decisions back to the user that the model is well-positioned to make. The auto-router (UserPromptSubmit hook) handles the cross-skill routing axis; this skill handles the within-skill axis.
