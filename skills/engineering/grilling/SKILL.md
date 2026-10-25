---
name: grilling
description: Interview the user relentlessly about a plan, decision, or idea until every branch of the design tree is resolved. Use when the user wants to stress-test their thinking, shares a vague idea, says "grill me", or when any skill needs the interview primitive.
---

# Grilling

Interview the user until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the frontier, then wait for the user's answers before the next round.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a *later* round, not this one.

The session is done when the frontier is empty: every branch visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Facts are your job. Decisions are the user's.

Never ask the user for anything you could find out yourself.

When a frontier question needs a fact from the environment, **go and get it**:

1. Call the Skill tool with "workspace-search" for the retrieval routing policy, and search. Most environment facts are one indexed query, not an exploration.
2. Dispatch a sub-agent only when the answer needs genuine multi-step exploration that search cannot settle. Give it one question, where to start, the shape of answer you want, a length bound, and an explicit read-only instruction. Several independent questions can go out at once; questions that inform each other cannot, so answer the first and let it reshape the second.

Don't block on it. A running exploration is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now.

The **decisions** are the user's. Put each to them and wait.

## Round format

Number each question and give your **recommended answer**. Word each question so that `ok` accepts the recommendation; a question worded in the negative makes `ok` mean the opposite. The recommendation is not decoration: it is the primary way the user answers.

```
❓ **Q1** - **<question title>**: <question body, may be multiple paragraphs, may offer multiple choice>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body>

➡️ <your recommended answer>
```

Open every round by telling the user they can accept the lot:

> Reply `ok` to take all the recommendations, or answer only the ones you'd change.

A user who replies `ok` has still walked that branch of the tree. That is the point: the tree is never skipped, only made cheap to traverse.

## Pacing

Round size follows the frontier. The tree decides how many questions are unblocked, never a quota, and the tree is **never truncated**.

Where a frontier exceeds six questions, deliver it across two consecutive rounds and say so ("that's 9 questions, so here are the first 5"). A wall of questions makes people freeze, and a frozen user answers worse than a paced one. Pace it; don't cut it.

## Language

Read `~/.claude/ultrapowers-user-profile.json` for `technicalComfort` (a repo-level `technicalComfortOverride` in `.claude/ultrapowers-preferences.json` wins if present).

**The design tree is identical either way.** Only the rendering changes.

- `technical`: ask at the layer the user operates. Stack names, precise tradeoff vocabulary.
- `non-technical`: ask about outcomes, not internals. Never surface a term from the engineering vocabulary raw. Frame each tradeoff as what it costs and what it buys.

  > Instead of: "Should this page be SSR or SSG?"
  > Ask: "Should every visitor see the same page, or something personalised to them? The same-for-everyone version loads faster and costs less to run."

Prefer multiple choice over open-ended wherever the branch permits it. A non-technical user recognises a good answer far more reliably than they generate one.

If the user's project has a `CONTEXT.md`, use its vocabulary in your questions. Their words, not yours.

## Scope check

If the idea covers several independent subsystems, say so **before** grilling the detail. Decompose it with the user, then grill the first piece. Walking the full tree of a project that needed splitting wastes the whole session.

## Red flags

| Thought | Reality |
|---|---|
| "I'll just assume they want X" | That's an unvisited branch. Ask it. |
| "I'll ask them where the config lives" | That's a fact. Go and find it. |
| "This is a lot of questions, I'll trim" | Pace the rounds; never truncate the tree. |
| "They said `ok`, so they didn't really decide" | They did. Recommendations are answers. |
| "I understand enough to start building" | The frontier is empty or it isn't. Check. |
