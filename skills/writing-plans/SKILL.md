---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/ultrapowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Workflow Preferences

Before writing the plan, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its values for `autoCommit` and `autoPush` to determine whether commit steps should be included in the plan. If the file is missing, default to `autoCommit: true`, `autoPush: true`, `commitDesignDocs: false` (matches the `brainstorming` skill and README 1.x defaults).

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultrapowers:subagent-driven-development (recommended) or ultrapowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit** *(only if user enabled auto-commit)*

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Annotating Tasks with Skill Pointers

When the upstream `skills-audit` output includes a "Skills to Reference in Plan" list:

1. Include the full list in the plan's header (under a "Skills referenced during implementation:" subheading).
2. For each task, identify which of those skills apply (match against files touched, languages used, concerns involved).
3. Prepend applicable skills to the task body as `@<skill-name>` pointers, one per line. Examples:

   ```
   ### Task 3: Add Clerk auth middleware

   @ultrapowers-dev:nextjs-patterns
   @clerk-nextjs-patterns

   **Files:**
   - Modify: ...
   ```

4. Do not sprinkle pointers gratuitously — only on tasks where the skill materially shapes the implementation. A task that just writes a JSON file doesn't need every language skill appended.
5. If skills-audit did not produce a list (or the project has no sibling-pack skills), skip annotation entirely. No placeholder `@nothing` pointers.

The implementation skill (`subagent-driven-development` or `executing-plans`) reads these annotations when dispatching per-task subagents, ensuring they invoke the right skills.

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- Reference relevant skills with @ syntax (see Annotating Tasks above)
- DRY, YAGNI, TDD
- **Commit steps are conditional** — include them in the plan but mark them as "only if auto-commit enabled". If the user chose manual commits, skip commit steps during execution.
- **NEVER include design docs in commit steps** — design docs are local only

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, **auto-pick** the execution approach — do not ask the user by default.

**Default: Subagent-Driven** (`@ultrapowers:subagent-driven-development`). Fresh subagent per task + two-stage review. Use this for any plan with multiple independent tasks.

**Fallback: Inline Execution** (`@ultrapowers:executing-plans`). Only use when:
- The plan has ≤2 tasks AND they're tightly coupled (context handoff overhead isn't worth it), OR
- Subagents are not available on the current platform, OR
- The user explicitly asked for inline execution.

**Announce the choice** in one line before starting:

> "Plan complete and saved to `docs/ultrapowers/plans/<filename>.md`. Proceeding with Subagent-Driven execution."

**Only present a menu if you are NOT picking Subagent-Driven** — explain why (e.g., "This plan has 2 tightly-coupled tasks; inline is faster") and ask for confirmation. Never ask the user to pick between approaches when Subagent-Driven is clearly the right call.

### Controller judgment inside Subagent-Driven execution

Subagent-Driven Development prescribes a fresh implementer subagent + spec review + code-quality review per task. That ceremony exists for a reason — it catches correctness and quality issues early. But for **trivial mechanical tasks** (single bash command, pasting fixed content into a new file, read-only grep checks), the controller can verify directly and skip the reviewer dispatches.

Rule of thumb: if the task has no judgment, no domain reasoning, and no "did the implementer build the right thing" ambiguity, verify inline. Dispatch subagents when there's real work being delegated. Never skip reviews for tasks that edit existing logic-bearing code.
