---
name: dispatching-parallel-agents
description: Use when 2+ independent questions need investigating and none depends on another's answer — dispatches read-only sub-agents in parallel and aggregates their findings. Not for building; implement drives the build loop.
---

# Dispatching Parallel Agents

Send independent investigations to their own context windows at the same time, then aggregate what comes back.

The win is twofold: wall-clock time, and keeping each investigation's noise out of your window and out of each other's.

## When this applies

**All three must hold:**

1. **Two or more distinct questions**, each answerable on its own.
2. **No dependencies** — no agent needs another's answer to start.
3. **Read-only** — investigation, not modification. Parallel writers collide.

If any fails, don't parallelise. Sequential work with dependencies is faster than parallel work that has to be redone.

## When it does not apply

- **Locating a string or symbol.** Call the Skill tool with "workspace-search" instead. Never spend an agent on something search answers.
- **Building from a plan.** That's `implement`, which runs tickets in dependency order.
- **One question.** Just answer it.
- **Questions that inform each other.** Answer the first; it changes what you'd ask second.

## Writing the brief

Each agent starts with nothing but its brief. A vague brief returns a vague answer, and you cannot tell the difference from here.

Every brief carries:

- **The one question**, stated as a question.
- **Where to start** — paths, entry points, or the search route to take.
- **What to return** — the shape of the answer, and a length bound.
- **What not to do** — explicitly read-only, no edits, no commits.

> Investigate why the checkout total is wrong for multi-currency carts. Start at `src/checkout/`. Return: the code path the total flows through, where the currency conversion happens, and your best hypothesis with the evidence for it. Do not change any files. Under 300 words.

Bound the length. Unbounded briefs return transcripts, and reading five transcripts costs more than the parallelism saved.

## Aggregating

- **Read every report before concluding.** The second one often reframes the first.
- **Keep findings attributed** to their question. Don't merge them into one narrative; that's where a weak finding gets laundered into a confident one.
- **Note disagreements explicitly.** Two agents contradicting each other is a finding in itself, usually the most valuable one.
- **Treat reports as evidence, not verdicts.** An agent that found nothing may have looked in the wrong place. Absence of evidence is reported as absence of evidence.

## Red flags

| Thought | Reality |
|---|---|
| "I'll dispatch agents to find where X is defined" | That's a search. Use `workspace-search`. |
| "More agents will go faster" | More agents means more reports to read. Bound it. |
| "They can each fix their own bit" | Read-only. Parallel writers collide. |
| "The first report answers it" | Read them all. You dispatched them for a reason. |
| "I'll let them figure out the scope" | An unscoped brief returns an unusable answer. |
