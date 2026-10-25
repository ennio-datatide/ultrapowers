---
name: implement
description: Phase 4 of the build flow. Builds the work described by a spec or set of tickets, one ticket per fresh sub-agent, test-first at the agreed seams, with spec and quality review after each before committing.
---

# Implement

**Phase 4 of 5: Grill → Spec → Tickets → Implement → Review.**

Build the work. This phase drives other skills rather than doing the work itself.

## The loop

Work the **frontier**: any ticket whose blockers are all done. For a linear chain, that's top to bottom.

```
dispatch implementer ──► spec review ──► quality review ──► commit ──► next ticket
                              │                │
                          fails │            fails │
                              └──── back to implementer ────┘
```

**One fresh sub-agent per ticket.** A ticket is sized to fit one clean context window; that sizing is wasted if the window is reused. Reuse means each ticket starts more degraded than the last, and the degradation is invisible from the inside.

### 1. Dispatch the implementer

Use [implementer-prompt.md](./implementer-prompt.md). The sub-agent gets the ticket, the spec section behind it, and the seams already agreed — never the transcript of previous tickets. Dispatch it in the foreground and wait for its report before reviewing: the loop needs each ticket's result before it moves on.

Call the Skill tool with "test-driven-development" for the red-green discipline. **Test only at seams the spec already agreed.** No test is written at an unconfirmed seam; if a new one looks necessary, decide it with `autonomous-decision` and say in one plain line what it checks. A seam is a technical call, not the user's.

**A ticket that builds or changes a UI surface** → also call the Skill tool with "visual-design", for the purpose-before-layout discipline.

### 2. Spec review first

Use [spec-reviewer-prompt.md](./spec-reviewer-prompt.md). One question: **does this do what the ticket asked?**

This runs first on purpose. Well-written code that implements the wrong thing must be caught before anyone reviews its style.

**Verify independently.** The implementer's report is a claim, not evidence — read the diff. An implementer that finished unusually fast is the common signature of incomplete work.

### 3. Quality review second

Use [code-quality-reviewer-prompt.md](./code-quality-reviewer-prompt.md), only once the spec review passes.

A failed review goes **back to the implementer** with the specific finding. Don't patch it yourself; the loop exists so the fix lands with the ticket's full context.

### 4. Verify, then claim

Run the typechecker and the tests covering what changed. The full suite runs **once**, at the end of the board, not per ticket.

**Evidence before assertions.** Every claim of "it works" / "tests pass" / "it's done" has a command behind it: run it, read the actual output, then make the claim quoting what you saw. If you didn't run it, you don't know — say what you did and didn't check. Partial evidence licenses only a narrow claim: one passing test file is not "tests pass".

### 5. Commit and report

Commit if `autoCommit` is true in `.claude/ultrapowers-preferences.json`, push if `autoPush` is also true. Both default to true.

Tell the user what they can now **see working**, in their vocabulary — never which files changed.

> Piece 3 of 7 done: you can now log in and land on your dashboard. Starting piece 4.

Repeat until the board is clear.

## Running inline instead of dispatching

Where sub-agents aren't available, or work has to pause and resume across sessions, run the same loop in the current context. Same discipline; two extra rules:

- **Compact at ticket boundaries, never mid-ticket.** Pass an instruction naming the next ticket so the summary keeps what matters. Finished tickets are on disk; their context is disposable.
- **Before pausing, record the current ticket's true state** — what's done, what's left. Never leave a half-finished ticket looking finished because the session ended. On resuming, read the board, then the spec, then the code. Don't trust a summary of your own earlier reasoning over what the files say.

## When there are no tickets

If the spec was small enough to skip the ticket phase, build it here in the current context, same discipline throughout.

## If you get stuck

- **A bug that resists a first look** → call the Skill tool with "systematic-debugging". No guessing at fixes inside the build loop.
- **A design question you can't settle on paper** → call the Skill tool with "prototype".
- **A step only a human can do** (credentials, a dashboard, DNS, a migration) → call the Skill tool with "wizard". Don't ask the user to improvise it, and don't pretend you can do it yourself.
- **A ticket that turns out to be wrong** → stop and say so. A ticket that doesn't survive contact with the code is a grilling gap, not something to build around.

## Hand off to Review

Run the full suite once. Then call the Skill tool with "review":

> All pieces built and the tests pass. Moving to Review — I'll check the work, then give you a list to try yourself.

## Red flags

| Thought | Reality |
|---|---|
| "I'll write the tests after" | Red before green. Every slice. |
| "I'll carry this context to the next ticket" | Fresh window per ticket. That's why they're sized this way. |
| "I'll test at a new seam, it's easier" | Only pre-agreed seams. A necessary new one goes through autonomous-decision, announced in plain words. |
| "Full suite after every ticket" | Once, at the end. Single files as you go. |
| "That should work" | Should isn't does. Run it, then claim it. |
| "The exit code was 0" | Read the output. Suites pass with everything skipped. |
| "I'll just widen the ticket a bit" | A wrong ticket is a grilling gap. Surface it. |
