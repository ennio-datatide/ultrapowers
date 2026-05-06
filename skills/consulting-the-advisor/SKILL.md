---
name: consulting-the-advisor
description: Use when running an executor session (sonnet/haiku main session, or sonnet/haiku controller in subagent-driven-development) on multi-step work — codifies when to dispatch the `advisor` agent (after orientation, on difficulty, before declaring done) and what brief to pass; do not use on opus sessions (the executor is already advisor-class)
---

# Consulting The Advisor

## Overview

Pair a fast executor (sonnet/haiku) with an opus `advisor` consulted at strategic moments — Anthropic's advisor pattern, replicated using Claude Code subagents. The executor handles the bulk of mechanical work; the advisor reviews approach, diagnoses difficulty, and sanity-checks before declaring done.

**Core principle:** the advisor exists to make decisions you'd otherwise make worse alone. Call it when the cost of being wrong about an approach exceeds the cost of a 5–15 second subagent dispatch.

## When to Use

- Main session running on sonnet or haiku, on multi-step tasks (>2 steps or >5 minutes wall time)
- Controller in `subagent-driven-development` running on sonnet/haiku, between tasks
- Inline executor in `executing-plans` on sonnet/haiku, during the execution loop

## When NOT to Use

- Main session is opus (executor is already advisor-class — same model)
- Trivial fast-path tasks (typo fix, rename, single-file edit with known pattern) per `brainstorming` triage
- Mechanical follow-up dictated by tool output you just read (you don't need a strategist for "the test failed, run it again with -v")
- Permission-asks (the advisor accelerates decisions; it does not gate them — see `no-permission-asks`)

## The Three Timings

Anthropic's documented advisor pattern has three call sites. Use them.

### 1. After orientation, before substantive work

Read a few files (Read/Grep/Glob) to understand the task surface. Then dispatch advisor with a brief covering: what the task is, what approach you're considering, what files you've explored, and the specific question. Advisor reviews approach and returns a ≤100-word enumerated plan.

Orientation reads are NOT substantive work. Writing, editing, committing, declaring an answer ARE. The dividing line is "have I done something hard to undo?"

### 2. On difficulty, error, or approach change

When errors recur, the approach is not converging, or you find evidence that contradicts your assumption — dispatch advisor with the new evidence and your revised hypothesis. The advisor sees what you saw and reorients.

### 3. Before declaring done

After writing the durable result (file, commit, tool output), but before reporting DONE — dispatch advisor with the result and ask "is this complete? did I miss anything?" The advisor catches gaps before the controller dispatches reviewers.

**Order matters:** write the durable result FIRST, then call advisor. If the session ends during the advisor call, a written file persists; an unwritten one doesn't.

## Brief Format

Pass the advisor a focused brief, not the full conversation. The advisor sees only what you give it (subagents have fresh context — confirmed in research brief).

```
Task: <one-sentence description>
Approach considering: <the path you're about to take>
Files explored: <list of paths read so far, with one-line takeaways>
Question: <the specific decision the advisor should weigh in on>
```

Keep it under 200 words. The advisor returns ≤100-word enumerated steps; brief reciprocity matters.

### Example brief (good)

```
Task: Add a rate-limit middleware to the /api/checkout endpoint.
Approach considering: Use a token-bucket per-user counter in Redis, 5 req/min.
Files explored:
- src/middleware/auth.ts — existing middleware pattern, decorator-style
- src/lib/redis.ts — Redis client, no rate-limit utilities yet
- package.json — has ioredis but no rate-limit library
Question: Should I add a dependency (express-rate-limit, rate-limiter-flexible) or roll the token bucket inline given we have ioredis already?
```

## Acting on Advice

Give the advice serious weight. The advisor is a stronger model with the brief in front of it. But:

- If you have **primary-source evidence** that contradicts a specific claim ("the file says X, the docs state Y"), don't silently switch.
- Surface the conflict via a **reconcile call**: a second advisor dispatch with the conflict explicit ("I found X in src/auth.ts:42, you suggested Y, which constraint breaks the tie?").
- A passing self-test is not evidence the advice is wrong — it's evidence your test doesn't check what the advice is checking.

The reconcile call is the disagreement protocol. Use it instead of unilaterally overriding.

## Subagent-Driven-Development Special Case

In SDD, the **controller** dispatches advisor — implementer subagents cannot (harness restriction: subagents cannot dispatch sub-subagents).

Pattern for SDD controllers running on sonnet/haiku:

1. Before dispatching the implementer for Task N: dispatch advisor with the plan excerpt + relevant context. Pass the advisor's plan into the implementer's dispatch prompt.
2. After implementer reports DONE_WITH_CONCERNS or surfaces strategic doubt: dispatch advisor again with the report + concerns. Use the advice to guide whether reviewers run as planned or whether the implementer needs another pass.

Implementers don't dispatch advisor; they surface concerns the controller acts on. See `subagent-driven-development/implementer-prompt.md` for the implementer-side discipline.

## Common Mistakes

- **Calling on every tool call.** Advisor adds value at strategic moments, not on every read or edit. Three calls per task is typical; ten is wasteful.
- **Calling without orientation.** "Help me build X" with no file reads gives the advisor nothing to ground its advice in. Read first, then ask.
- **Calling instead of trying.** If you can verify with a 30-second test, run the test. Don't dispatch a 10-second advisor call to avoid the work.
- **Using the advisor as a permission-ask.** "Should I commit?" is a permission-ask (banned per `no-permission-asks`). "Is my approach to the X invariant correct?" is a strategic check (welcome).
- **Hiding evidence.** If the brief omits a file you've already read, the advisor can't reconcile against it. Include the brief's "Files explored" section honestly.

## Why This Skill Exists

Anthropic's published advisor tool (`platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool`) lives at the API level. We replicate the value props using Claude Code subagents — single workflow, no SDK code, transparent in the transcript. The trade-off is 5–15+ seconds per dispatch (subagent overhead) versus the API version's server-side sub-inference. Worth it on multi-minute tasks; skip on sub-minute work.
