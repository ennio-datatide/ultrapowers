---
name: spec
description: Phase 2 of the build flow. Turns the current conversation into a written spec with user stories and implementation decisions. Synthesis only — does not re-interview. Use after grilling, or when the user wants what was discussed written up.
---

# Spec

**Phase 2 of 5: Grill → Spec → Tickets → Implement → Review.**

Take the conversation and the codebase understanding you already have, and produce a spec.

**Do NOT interview the user again.** Grilling already happened. This phase is synthesis of what you both already know. If you find yourself wanting to ask a design question, the grilling was incomplete: go back to it rather than smuggling an interview in here.

## Steps

### 1. Ground it in the codebase

If you haven't explored yet, do it now. Call the Skill tool with "workspace-search" and search rather than reading broadly.

Use the project's `CONTEXT.md` vocabulary throughout the spec, and respect any ADRs covering the area you're touching. The spec should read like the project talks.

### 2. Sketch the seams

Work out where this feature will be checked. Call the Skill tool with "codebase-design" for the vocabulary if the shape of the interface is itself in question.

The rules, in order:

- **Prefer existing seams to new ones.**
- **Use the highest seam possible.**
- If new seams are needed, propose them at the highest point you can.
- **The fewer seams across the codebase, the better. The ideal number is one.**

Confirm the seams with the user before writing. For a non-technical user, ask it as *"here's where I'll check this actually works"* and describe the behaviour being checked, never the mechanism.

### 3. Write the spec

Write to `docs/ultrapowers/specs/YYYY-MM-DD-<topic>-design.md`.

If `technicalComfort` is `non-technical`, open with a plain-language summary paragraph before the technical body. The body stays technical: its audience is the implementer.

<spec-template>

## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list, each in the form:

1. As an `<actor>`, I want `<feature>`, so that `<benefit>`

Example: *As a mobile bank customer, I want to see the balance on my accounts, so that I can make better informed decisions about my spending.*

This list should be extremely extensive and cover every aspect of the feature.

**This is the most important section in the document.** It is the part the user can personally check, and the part the Review phase tests the finished build against. Do not compress it.

## Implementation Decisions

The modules being built or modified and their interfaces, technical clarifications, architectural decisions, schema changes, API contracts, specific interactions.

Do NOT include file paths or code snippets: they go stale fast.

*Exception:* where a prototype produced a snippet that encodes a decision more precisely than prose can (a state machine, reducer, schema, or type shape), inline it in the relevant decision and note it came from a prototype. Trim to the decision-rich parts, not a working demo.

## Testing Decisions

- What makes a good test here (test external behaviour, never implementation details)
- Which modules will be tested
- Prior art: similar tests already in the codebase

## Out of Scope

What this spec deliberately does not cover.

## Further Notes

Anything else worth recording.

</spec-template>

### 4. Self-review

Read it back with fresh eyes and fix inline:

1. **Placeholders** — any "TBD", "TODO", or vague requirement? Fix it.
2. **Contradictions** — do any two sections disagree? Does the architecture match the feature description?
3. **Scope** — focused enough for one build, or does it need decomposition?
4. **Ambiguity** — could any requirement be read two ways? Pick one and make it explicit.

### 5. User review gate

> Spec written to `<path>`. Please read it before we go further.
>
> **The part worth your attention is User Stories.** That's the list I'll check the finished work against, so anything missing or wrong there becomes something built wrong. Everything else I can correct later; that list is the expensive one.
>
> Tell me what to change, or say `ok` and I'll break it into pieces.

Wait for them. If they request changes, make them and re-run the self-review. Only proceed on approval.

Never treat silence as approval. This is the last cheap moment to change direction: after this, changes cost rework.

Commit the spec only if `commitDesignDocs` is true in `.claude/ultrapowers-preferences.json`. Default is false.

### 6. Hand off to Tickets

Call the Skill tool with "tickets", announcing the transition:

> Spec approved. Moving to Tickets — breaking this into pieces you can see working one at a time.

**Exception:** if the whole spec plainly fits in a single fresh context window, skip straight to `implement` and say why. Small features do not need a ticket board.

## Context hygiene

Stay in the same context window as Grill. Do not clear or compact between phases.
