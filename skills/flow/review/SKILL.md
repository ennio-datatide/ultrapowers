---
name: review
description: Phase 5 of the build flow. Reviews the finished work on two axes — does it follow the codebase's standards, and does it do what the spec asked — then produces a plain-language QA checklist the user can run themselves.
---

# Review

**Phase 5 of 5: Grill → Spec → Tickets → Implement → Review.**

Two outputs, because they answer different questions and the user can only produce one of them:

- **The agent review** — is this code any good, and is it what we agreed? The user can't check this.
- **The QA plan** — a checklist they can click through themselves. Nobody else can check this.

## Part A: the agent review

Review the diff between `HEAD` and a fixed point, on **two axes**:

- **Standards** — does the code follow this repo's documented standards?
- **Spec** — does the code faithfully implement what the spec asked for?

Both run as **parallel sub-agents** so neither pollutes the other's context, then you aggregate.

### 1. Pin the fixed point

Whatever the user named: a commit SHA, branch, tag, `main`, `HEAD~5`. If they didn't name one, use the merge-base with the default branch and say so.

Capture `git diff <fixed-point>...HEAD` (three-dot, so it compares against the merge-base) and `git log <fixed-point>..HEAD --oneline`.

Confirm the ref resolves and the diff is non-empty **before** spawning anything. A bad ref should fail here, not inside two sub-agents.

### 2. Find the spec

In order: issue references in commit messages; a path the user passed; the spec under `docs/ultrapowers/specs/` matching this feature or branch; the tickets under `.scratch/`. If nothing is found, the Spec sub-agent reports "no spec available" and is skipped.

### 3. Find the standards

Anything documenting how code should be written here: `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `CLAUDE.md`. Call the Skill tool with "workspace-search" to find them.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below, which applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Skip anything tooling already enforces.

Each reads *what it is* → *how to fix*:

- **Mysterious Name**: a function, variable or type whose name doesn't reveal what it does. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape in more than one hunk or file. → extract it, call it from both.
- **Feature Envy**: a method reaching into another object's data more than its own. → move it onto the data it envies.
- **Data Clumps**: the same few fields keep travelling together. → bundle them into one type.
- **Primitive Obsession**: a primitive standing in for a domain concept. → give the concept its own small type.
- **Repeated Switches**: the same switch on the same type recurring. → polymorphism, or one shared map.
- **Shotgun Surgery**: one logical change forcing scattered edits. → gather what changes together.
- **Divergent Change**: one module edited for several unrelated reasons. → split it.
- **Speculative Generality**: abstraction for needs the spec doesn't have. → delete it.
- **Message Chains**: long `a.b().c().d()` navigation. → hide the walk behind one method.
- **Middle Man**: a class or function that mostly just delegates. → cut it.
- **Refused Bequest**: a subclass ignoring most of what it inherits. → use composition.

### 4. Spawn both sub-agents in parallel

**Standards sub-agent** gets: the diff command and commit list, the standards files found, and **the full smell baseline pasted in** (it has no other access to it). Brief:

> Report, per file/hunk where relevant: (a) every place the diff violates a documented standard — cite the standard, file and rule; (b) any baseline smell — name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words.

**Spec sub-agent** gets: the diff command and commit list, and the spec contents. Brief:

> Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff nobody asked for (scope creep); (c) requirements that look implemented but wrong. Quote the spec line for each finding. Under 400 words.

### 5. Aggregate

Present both reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. **Do not merge or rerank across axes.** End with total findings per axis and the worst issue *within each axis*. Don't pick a winner across axes — that's exactly the reranking the separation exists to prevent.

A change can pass one axis and fail the other: code that follows every standard but builds the wrong thing, or code that does exactly what was asked but breaks every convention. Reporting them separately stops one masking the other.

## Part B: the QA plan

Write a checklist the user can run **without reading any code**, derived from the **User Stories** section of the spec — the section they personally approved.

Write it to `docs/ultrapowers/qa/YYYY-MM-DD-<topic>-qa.md` and show it in the conversation.

<qa-template>

# QA: <feature>

What to try, and what should happen. Tick each one off; tell me about anything that doesn't match.

## 1. <Plain-language thing to try>

**Do this:** the exact steps, in order, that a person can follow.
**You should see:** what a correct result looks like.
**Watch out for:** the specific way this could plausibly go wrong, if there is one.

</qa-template>

Rules:

- One entry per user story that a person can actually observe. Stories with no visible surface go in a short "checked automatically" list at the end, so nothing looks skipped.
- Plain language throughout, whatever the user's `technicalComfort`. A QA plan is for a human doing a manual pass, and jargon slows even a technical one down.
- Say where to start (URL, screen, command). Never assume they know where the feature lives.
- Never write "verify it works correctly". Say what correct looks like.

## After review

Report both outputs, then hand to `finishing-a-development-branch` for merge, PR, or cleanup.

Findings from the agent review are **not** silently fixed. Present them; let the user decide what gets addressed. Fixing a finding is new work, and new work goes through the flow.
