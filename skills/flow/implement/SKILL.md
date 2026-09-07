---
name: implement
description: Phase 4 of the build flow. Builds the work described by a spec or set of tickets, working the ticket board in dependency order, driving TDD at the agreed seams, and closing out with review before committing.
---

# Implement

**Phase 4 of 5: Grill → Spec → Tickets → Implement → Review.**

Build the work described in the spec or tickets. This skill is deliberately thin: it drives other skills rather than doing the work itself.

## The loop

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain, that means top to bottom.

For each ticket:

1. **Start it in a fresh context.** Each ticket is self-contained by construction, so the previous ticket's context is disposable. Call the Skill tool with "subagent-driven-development" to dispatch it; that skill is the executor for this loop.
2. **Build it test-first.** Call the Skill tool with "test-driven-development". Test only at the seams already agreed in the spec — no test is written at an unconfirmed seam.
3. **Verify as you go.** Run typechecking regularly and single test files regularly. Run the full suite **once at the end**, not per ticket.
4. **Mark the ticket done** in `.scratch/<feature>/issues/`, and tell the user what they can now see working, in their language:

   > Piece 3 of 7 done — you can now log in and see your dashboard. Starting piece 4.

5. **Commit** if `autoCommit` is true in `.claude/ultrapowers-preferences.json`, and **push** if `autoPush` is also true. Both default to true.

Repeat until the board is clear.

## When there are no tickets

If the spec was small enough to skip the ticket phase, build it here directly in the current context, same discipline: TDD at agreed seams, typecheck often, full suite at the end.

## If you get stuck

- **A bug that resists a first look** → call the Skill tool with "systematic-debugging". Don't guess at fixes inside the build loop.
- **A design question you can't settle on paper** → call the Skill tool with "prototype". Throwaway code answering one question beats arguing about it.
- **A step only a human can do** (credentials, a third-party dashboard, DNS, a one-off migration) → call the Skill tool with "wizard". Don't ask the user to improvise it, and don't pretend you can do it yourself.
- **The ticket turns out to be wrong** → stop and say so. A ticket that doesn't survive contact with the code is a grilling gap, not something to build around.

## Before declaring done

Call the Skill tool with "verification-before-completion". Evidence before assertions, always: run the command, read the output, then make the claim.

## Hand off to Review

Call the Skill tool with "review", announcing the transition:

> All pieces built and the tests pass. Moving to Review — I'll check the work, then give you a list to try yourself.

## Red flags

| Thought | Reality |
|---|---|
| "I'll write the tests after" | Red before green. Every slice. |
| "I'll carry this context to the next ticket" | Fresh context per ticket. That's why they're sized this way. |
| "I'll test at a new seam, it's easier" | Only pre-agreed seams. Take a new one back to the user. |
| "Full suite after every ticket" | Once, at the end. Single files as you go. |
| "The tests pass, so it's done" | Verify, then claim. Not the other way round. |
| "I'll just tweak the ticket scope" | A wrong ticket is a grilling gap. Surface it. |
