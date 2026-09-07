---
name: domain-modeling
description: Build and sharpen the project's shared vocabulary and record its hard-to-reverse decisions. Use when discussing project terminology, when a term seems overloaded or fuzzy, when writing or editing CONTEXT.md, or when recording a decision as an ADR.
---

# Domain Modeling

Actively build and sharpen the project's shared language **as you design**. Challenge terms, invent edge-case scenarios, and write the glossary and the decisions down the moment they crystallise.

This is the *active* discipline. Merely *reading* `CONTEXT.md` for vocabulary is a one-line habit any skill can do; this skill is for when you are **changing** the model.

## Why this matters more here than anywhere else

The gap between what a user means and what the agent builds is the most expensive failure in the flow. A shared vocabulary closes it. It also pays off three more ways: files and functions get named consistently, the codebase gets easier to navigate, and the agent spends fewer tokens because it has a more concise language to think in.

## What the user sees

The files keep their conventional names so they interoperate with the wider ecosystem. The **surface names** adapt to the audience:

| File | `technical` | `non-technical` |
|---|---|---|
| `CONTEXT.md` | glossary / ubiquitous language | **Project Dictionary** |
| `docs/adr/NNNN-*.md` | ADR | **Decisions Log** entry |

Never make a non-technical user learn the words "ubiquitous language" or "architecture decision record" to benefit from either.

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts and the map points to where each lives. Infer which context the current topic belongs to; ask only if genuinely unclear.

Create files **lazily**: a `CONTEXT.md` when the first term is resolved, `docs/adr/` when the first decision needs recording. Never scaffold empty ones.

Formats: [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) and [ADR-FORMAT.md](./ADR-FORMAT.md).

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with existing language in `CONTEXT.md`, call it out immediately.

> "Your dictionary says a 'booking' is confirmed and paid for. You just used it for something in the basket. Which did you mean?"

### Sharpen fuzzy language

When a term is vague or overloaded, propose a precise canonical one.

> "You're saying 'account' — do you mean the person, or the company they belong to? Those behave differently, so it's worth having two words."

### Discuss concrete scenarios

Stress-test relationships with specific scenarios that probe edge cases and force precision about where one concept ends and the next begins. Invent them; don't wait for the user to supply them.

### Cross-reference with code

When the user states how something works, check whether the code agrees. Call the Skill tool with "workspace-search" to find out. Surface every contradiction:

> "You said a customer can cancel part of an order, but the code only cancels whole orders. Which is right?"

This catches wrong assumptions before they reach a spec, which is the cheapest moment to catch them.

### Update CONTEXT.md inline

The moment a term is resolved, write it. **Do not batch these up.**

`CONTEXT.md` is a glossary and **nothing else**. It is not a spec, not a scratchpad, not a home for implementation decisions. Keep it totally free of implementation detail.

Only terms specific to *this project's* domain belong. General programming concepts do not, however much the project uses them.

### Offer ADRs sparingly

Offer to record a decision only when **all three** are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for reasons

If any one is missing, skip it. Easy to reverse? You'll just reverse it. Not surprising? Nobody will wonder. No real alternative? There's nothing to record beyond "we did the obvious thing."

An ADR can be a single paragraph. The value is recording *that* a decision was made and *why*, not filling out sections.
