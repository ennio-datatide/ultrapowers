---
name: executing-plans
description: Use when executing a plan on a harness without subagent support, or when pausing and resuming execution across sessions
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks inline, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## When to Use (Fallback Path)

`subagent-driven-development` is the canonical execution path. Use `executing-plans` only when one of the following is true:

1. The harness does not expose a subagent primitive (`Task` in Claude Code, `agent()` in Codex, `@agent` in OpenCode) — in that case inline execution is the only option.
2. Work must pause and resume across sessions — inline execution keeps state in the plan's checkboxes and the TodoWrite list, which survives session boundaries better than a multi-subagent dispatch plan.
3. The user explicitly chose inline execution during the writing-plans handoff.

If none of these apply, stop and switch to `ultrapowers:subagent-driven-development`. The quality of its two-stage audited review is measurably higher on every platform that supports it.

## Model Handoff at Execution Boundary

This skill marks the boundary between design (opus) and execution (sonnet). When invoked:

1. If the current main-session model is opus, announce that execution should run on sonnet for cost/speed. Suggest the user open a new session with `--model sonnet` (or `--model claude-sonnet-4-6`). Do not block — proceed in the current session if user prefers.
2. Subagents dispatched during execution should use `model: sonnet` via their frontmatter (or via the Agent tool's `model` parameter).
3. Lookup-only subagents (`Explore`, `research-fetch`) use `model: haiku`.

## Autonomous Subagent Strategy

Decide parallel vs sequential per `ultrapowers:autonomous-decision`. Signals from the plan structure:

- Tasks marked independent (no shared file paths, no dependency edges) → parallel
- Tasks with serial dependencies → sequential
- Tasks that mutate shared state (database, config files) → serial (one at a time)

Announce when confidence is in the 0.4–0.7 band ("tasks 3–7 are independent — parallelizing"). Do not ask the user.

## Workflow Preferences

Before executing, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its values for `autoCommit` and `autoPush` to determine whether to commit after each task and whether to push. If the file is missing, default to `autoCommit: true`, `autoPush: true` (matches the `brainstorming` skill and README 1.x defaults).

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. **Verify skill annotations** — each task should reference the skills needed. Confirm those skills are available (installed plugin or local file). If skills are missing, stop and run ultrapowers:skills-audit before proceeding.
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified:
- **REQUIRED SUB-SKILL:** Use ultrapowers:verification-before-completion to confirm each task's acceptance criteria actually pass. Evidence before claims — no "should work" hand-waving.
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use ultrapowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **ultrapowers:using-git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **ultrapowers:writing-plans** - Creates the plan this skill executes
- **ultrapowers:verification-before-completion** - REQUIRED: Invoke before handing off to finishing-a-development-branch. No completion claim without fresh verification evidence.
- **ultrapowers:finishing-a-development-branch** - Complete development after all tasks
