---
name: executing-plans
description: Use when working a ticket board inline rather than through sub-agents — on a harness without sub-agent support, or when execution must pause and resume across sessions.
---

# Executing Plans

Work the ticket board in the current context, one ticket at a time.

This is the fallback path. `implement` dispatches a fresh sub-agent per ticket, which is better: it guarantees each ticket starts with a clean window. Use this skill when that isn't available:

- the harness has no sub-agent support, or
- execution has to span multiple sessions with pauses in between.

## The loop

Work the **frontier**: any ticket whose blockers are all done.

For each ticket:

1. **Read the ticket in full**, plus the spec section it came from. Don't work from memory of the planning conversation.
2. **Build it test-first.** Call the Skill tool with "test-driven-development". Only at seams the spec already agreed.
3. **Verify.** Typecheck and run the relevant test files. The full suite runs once, at the end of the board.
4. **Mark it done** in `.scratch/<feature>/issues/`, and say what the user can now see working.
5. **Commit** if `autoCommit` is true in `.claude/ultrapowers-preferences.json`; **push** if `autoPush` is also true. Both default to true.

## Context management

This is the cost of running inline: the window fills with every ticket you've already finished, and none of it helps with the next one.

- **Compact at ticket boundaries, never mid-ticket.** Mid-ticket compaction loses the thread of what you were doing.
- Pass an instruction when you compact, naming the next ticket, so the summary keeps what's actually needed.
- The finished tickets are on disk. Their context is disposable; the board is the source of truth.

## Pausing and resuming

The board is what survives a session boundary, so it has to be accurate before you stop.

**Before pausing:** mark the current ticket's true state. A half-finished ticket is recorded as half-finished, with what's done and what's left. Never leave a ticket looking finished because the session ended.

**On resuming:** read the board first, then the spec, then the in-flight ticket. Re-read the code you were changing. Do not trust a summary of your own earlier reasoning over what the files actually say.

## If a ticket is wrong

Stop and say so. A ticket that doesn't survive contact with the code means something was missed during grilling. Building around it makes the spec and the code disagree permanently, and the disagreement is discovered much later, by someone else.

## Before declaring the board done

Call the Skill tool with "verification-before-completion", then run the full suite once. Then hand to `review`.
