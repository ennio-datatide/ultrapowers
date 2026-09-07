---
name: tickets
description: Phase 3 of the build flow. Breaks a spec, plan, or conversation into small vertical slices, each one demoable on its own and sized to a single fresh context window, each declaring what must be finished before it can start.
---

# Tickets

**Phase 3 of 5: Grill → Spec → Tickets → Implement → Review.**

Break the work into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.

## Why slices, not layers

A slice cuts a narrow but *complete* path through every layer at once. That gives two things nothing else does: it can be demonstrated the moment it's finished, and it fits in one fresh context window so the agent building it never runs out of room to think.

For a user who can't read a diff, "you can see this working" is the only honest measure of progress there is.

## Steps

### 1. Gather context

Work from what's already in the conversation. If the user passed a reference (a spec path, an issue number or URL), fetch it and read the full body.

### 2. Explore the codebase

If you haven't already, do it now. Call the Skill tool with "workspace-search".

Ticket titles and descriptions use the project's `CONTEXT.md` vocabulary, and respect ADRs in the area you're touching.

Look for **prefactoring** opportunities: *make the change easy, then make the easy change.* Prefactoring tickets come first.

### 3. Draft the slices

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring is done first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must complete before it can start. A ticket with no blockers can start immediately.

#### Wide refactors are the exception

A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites and no vertical slice can land green.

Don't force it into a tracer bullet. Sequence it as **expand–contract**:

1. **Expand** — add the new form beside the old so nothing breaks.
2. **Migrate** — move call sites in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand. CI stays green batch to batch because the old form still exists.
3. **Contract** — delete the old form once no caller remains, in a ticket blocked by every migrate batch.

Where even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.

Blast radius is an **exhaustive occurrence count**, so it's an exact-lookup question. Use the exact route from `workspace-search`, not the semantic one.

### 4. Check the breakdown with the user

Present the tickets as a numbered list. For each: **title**, **blocked by**, and **what it delivers** (the end-to-end behaviour it makes work).

For a non-technical user, present this as a **progress board of things they'll be able to see working**, in the order they'll appear. Never surface "tracer bullet", "vertical slice", or "blocking edges" raw — say "what has to be finished first".

Ask, in their language. `technical`:

- Does the granularity feel right — too coarse, too fine?
- Are the blocking edges correct: does each ticket only depend on what genuinely gates it?
- Should any be merged or split?

`non-technical`:

- Does this look like the right order to build things in?
- Is anything here bigger than you'd want to wait for in one go?
- Is anything missing that you expected to see?

Iterate until the user approves. A board they didn't really read is a board that surprises them at piece four.

### 5. Publish

**Default: local files.** Write one file per ticket to `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, blockers first. One ticket per file, never a combined file.

Add `.scratch/` to `.gitignore` if it isn't already.

<local-ticket-template>

# <NN>: <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective, not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None (can start immediately)".

**Status:** ready

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

**If the user has asked for a real tracker** (GitHub), publish one issue per ticket in dependency order so blocking edges can reference real identifiers, using the platform's native blocking or sub-issue relationship where it has one. Do not offer this unprompted: it is setup surface a non-technical user can get stuck in, and local files lose nothing.

Do NOT close or modify any parent issue.

Avoid file paths and code snippets in tickets; they go stale fast. Same prototype-snippet exception as the spec.

### 6. Hand off to Implement

Call the Skill tool with "implement", announcing the transition:

> <N> pieces mapped out. Starting the build — I'll work through them in order and tell you as each one lands.

## Context hygiene

Tickets is the **last phase in the shared context window**. After this, each ticket gets a fresh context of its own, because each ticket is self-contained by construction. That is the whole reason they're sized this way.
