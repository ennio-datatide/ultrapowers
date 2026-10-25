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

Both run as **parallel sub-agents** so neither pollutes the other's context: issue both calls together, in the foreground, and wait for both reports before you aggregate.

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

**If the diff touches a UI or visual surface**, also call the Skill tool with "design-review" for the accessibility, copy, edge-case, and consistency lenses that the standards axis doesn't cover. Run it alongside the two axes below; report it as its own section rather than folding it into Standards.

### 4. Spawn both sub-agents in parallel

Each agent starts with nothing but its brief, so a vague brief returns a vague answer you cannot tell apart from a good one. Every brief carries the one question, where to start, what shape of answer to return, a length bound, and an explicit read-only instruction. Bound the length: unbounded briefs return transcripts, and reading them costs more than the parallelism saved.

**Standards sub-agent** gets: the diff command and commit list, the standards files found, and **the full smell baseline pasted in** (it has no other access to it). Brief:

> Report, per file/hunk where relevant: (a) every place the diff violates a documented standard — cite the standard, file and rule; (b) any baseline smell — name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words.

**Spec sub-agent** gets: the diff command and commit list, and the spec contents. Brief:

> Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff nobody asked for (scope creep); (c) requirements that look implemented but wrong. Quote the spec line for each finding. Under 400 words.

### 5. Aggregate

Present reports under `## Standards`, `## Spec`, and (when run) `## Design` headings, verbatim or lightly cleaned. **Do not merge or rerank across axes.** End with total findings per axis and the worst issue *within each axis*. Don't pick a winner across axes — that's exactly the reranking the separation exists to prevent.

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

### Handing the QA plan over

Show the checklist, say roughly how long it takes, and say what to do with a failure:

> Here's the list. Work through it whenever you have ten minutes. **If something doesn't match what I said should happen, tell me which number and what you saw instead** — that's more useful to me than trying to describe why it's wrong.

Don't ask whether they want a QA plan, and don't wait for them to finish it before reporting. It's theirs to run when they choose.

## After review

Report both outputs. Findings are **not** silently fixed: present them and let the user decide what gets addressed. Fixing a finding is new work, and new work goes through the flow.

## Finishing the branch

Only once the review is reported and its findings dealt with or consciously accepted.

**Confirm it's actually finished first:** the full suite passes on the branch as it stands, and nothing is uncommitted. If either fails, stop and say which. Integrating unfinished work is how a main branch breaks.

**Then read `.claude/ultrapowers-preferences.json`.**

- **`autoPush` true (the default)** → push the branch and open a PR. Don't present a menu; that's what the preference means. Announce what you did and give the user the link.
- **`autoPush` false** → offer the four options below.
- **File missing or malformed** → warn, then offer the options. Never guess from a file you couldn't parse.

| Option | When it fits |
|---|---|
| Open a PR | Someone else reviews, or the project works through PRs |
| Merge to the main branch | Solo project, reviewed work, no PR process |
| Keep the branch | Not ready, or waiting on something external |
| Discard it | The work is being abandoned |

Discarding is the one irreversible option here, so confirm it explicitly and name what will be lost. It is never the default and never inferred.

Afterwards, remove any worktree (`git worktree remove`) and delete the merged branch with `git branch -d`. Use `-d`, not `-D`: its refusal on an unmerged branch is a safety check, and if it refuses, the work hasn't landed. Leave the ticket files in `.scratch/` alone — they're the record of what was built and cost nothing.
