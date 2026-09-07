---
name: subagent-driven-development
description: Internal executor for the implement phase — dispatches one fresh sub-agent per ticket with two-stage review after each. Not user-facing; implement drives this.
---

# Subagent-Driven Development

The executor behind `implement`. One ticket, one fresh sub-agent, two reviews, then the next.

**Why a fresh agent per ticket:** a ticket is sized to fit one clean context window. Reusing a window means each ticket starts more degraded than the last, and the degradation is invisible from the inside. A new window per ticket is how the last ticket gets the same quality as the first.

## The cycle

For each ticket on the frontier:

```
dispatch implementer ──► spec review ──► quality review ──► commit ──► next
                              │                │
                          fails │            fails │
                              └──── back to implementer ────┘
```

### 1. Dispatch the implementer

Use [implementer-prompt.md](./implementer-prompt.md). The sub-agent gets the ticket, the spec section behind it, and the project's conventions — never the transcript of previous tickets.

### 2. Spec review first

Use [spec-reviewer-prompt.md](./spec-reviewer-prompt.md). One question: **does this do what the ticket asked?**

This runs first on purpose. Well-written code that implements the wrong thing must be caught before anyone spends effort on its style. Reviewing quality first wastes the quality review whenever the spec review sends the work back.

**Verify independently.** The implementer's own report is a claim, not evidence. Read the diff. An implementer that finished unusually fast is the common case for an incomplete one.

### 3. Quality review second

Use [code-quality-reviewer-prompt.md](./code-quality-reviewer-prompt.md). Only after the spec review passes.

### 4. Commit

Per `.claude/ultrapowers-preferences.json`: commit if `autoCommit`, push if `autoPush`. Both default to true.

## Rules

- **One ticket per sub-agent.** Bundling tickets defeats the sizing that made them safe.
- **Fresh context every time.** Never pass the previous ticket's window along.
- **Reviews are separate agents.** An agent reviewing its own work grades to its own intent, not the ticket's.
- **A failed review returns to the implementer**, with the specific finding. Don't patch it yourself; the loop exists so the fix lands with full context of the ticket.
- **Blockers first.** Only dispatch tickets whose blocking edges are all satisfied.
- **Stop on a wrong ticket.** If a ticket doesn't survive contact with the code, surface it rather than improvising around it.

## Reporting

After each ticket, tell the user what they can now see working, in their own vocabulary — not which files changed.

> Piece 3 of 7 done: you can now log in and land on your dashboard. Starting piece 4.
