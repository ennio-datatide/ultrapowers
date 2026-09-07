# Advisor Pattern via Subagents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultrapowers:subagent-driven-development (recommended) or ultrapowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the advisor pattern in ultrapowers using only Claude Code harness primitives (subagents, hooks, skills) — fast executor (sonnet/haiku main session) consults a strong advisor (opus subagent) at strategic moments without using the Anthropic API directly.

**Architecture:** New `advisor` agent (opus, read-only). New `consulting-the-advisor` skill codifying the three Anthropic-derived timings. Conditional SessionStart directive injection — sonnet/haiku sessions get the directive, opus sessions skip. Updates to `executing-plans` (inline executor dispatches advisor directly) and `subagent-driven-development` (controller dispatches advisor at task boundaries — implementers cannot dispatch subagents per harness restriction).

**Tech Stack:** Bash (extending `hooks/session-start`), Markdown + YAML frontmatter (agent + skill + lib files), JSON config.

**Spec:** `docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-design.md`
**Research brief:** `docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-research-brief.md`
**Skills audit:** `docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-skills-audit.md`

**Skills referenced during implementation:**
- `writing-claude-code-hooks` (local) — model-conditional injection pattern (just added in skills-creation step), hook output formats, SessionStart payload schema
- `ultrapowers:writing-skills` — for the new `consulting-the-advisor` skill
- `ultrapowers-dev:plugin-development` — agent + skill + hook lib file shipped in plugin
- `ultrapowers-dev:multi-agent-handoffs` — advisor/executor role split rationale
- `ultrapowers-dev:orchestrator-workers` — advisor-as-supervisor pattern
- `ultrapowers-dev:agent-loop` — three-timing strategic-checkpoint pattern
- `ultrapowers-dev:tool-calling` — Agent tool dispatch mechanics
- `ultrapowers-dev:error-handling`, `:resilience` — fail-open + one-retry semantics
- `ultrapowers-dev:testing-tdd` — model-detection unit test corpus

**Repo conventions:**
- Hook scripts in `hooks/` are extensionless (`hooks/session-start`, not `*.sh`).
- Agent files in `agents/<name>.md` with YAML frontmatter; `tools` is an array; `model` accepts aliases (`opus`/`sonnet`/`haiku`) or full IDs.
- Skill files in `skills/<name>/SKILL.md`.
- Test scripts in `tests/hooks/<name>.sh` (with `.sh` extension; tests stay differentiated from runtime hooks).
- Lib files in `hooks/lib/<name>.<ext>` keep their extensions.

---

## Task 1: Extend preferences schema with `advisor` block + document

@writing-claude-code-hooks

**Files:**
- Modify: `.claude/ultrapowers-preferences.json` (local, gitignored)
- Modify: `skills/brainstorming/SKILL.md` (Workflow Preferences section)

- [ ] **Step 1: Add `advisor` block to preferences file**

Edit `.claude/ultrapowers-preferences.json`. Final content:

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": {
    "dev": true,
    "business": true
  },
  "autoRouter": {
    "version": 1,
    "enabled": true,
    "model": "opus",
    "invokeThreshold": 0.7,
    "suggestThreshold": 0.4
  },
  "advisor": {
    "version": 1,
    "enabled": true,
    "model": "opus"
  }
}
```

- [ ] **Step 2: Document the schema in brainstorming skill**

Open `skills/brainstorming/SKILL.md`. Find the "Workflow Preferences" section. After the existing `autoRouter` documentation block, append:

```markdown
**`advisor` block** (consumed by `consulting-the-advisor` skill and the SessionStart hook for advisor-timing directive injection):

```json
{
  "advisor": {
    "version": 1,
    "enabled": true,
    "model": "opus"
  }
}
```

- `version` (int): schema version, currently `1`.
- `enabled` (bool): when `false`, the SessionStart hook skips advisor-timing directive injection and the skill short-circuits dispatches.
- `model` (string): model passed to the `advisor` subagent. Aliases (`opus`/`sonnet`/`haiku`) or full IDs (`claude-opus-4-7`). Defaults to `opus`. Anything below opus defeats the pattern — documented but not enforced.

If the block is missing, the hook uses these hardcoded defaults.
```

- [ ] **Step 3: Verify JSON validity**

Run: `jq -e . .claude/ultrapowers-preferences.json > /dev/null && echo OK`
Expected: `OK` printed.

- [ ] **Step 4: Commit (skill doc only — prefs file is gitignored)**

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat(prefs): document advisor config block in brainstorming workflow prefs"
```

---

## Task 2: Create `consulting-the-advisor` skill

@ultrapowers:writing-skills

**Files:**
- Create: `skills/consulting-the-advisor/SKILL.md`

- [ ] **Step 1: Write the skill file**

Create `skills/consulting-the-advisor/SKILL.md`:

```markdown
---
name: consulting-the-advisor
description: Use when running an executor session (sonnet/haiku main session, or sonnet/haiku controller in subagent-driven-development) on multi-step work — codifies when to dispatch the `advisor` agent (after orientation, on difficulty, before declaring done) and what brief to pass; do not use on opus sessions (the executor is already advisor-class)
---

# Consulting The Advisor

## Overview

Pair a fast executor (sonnet/haiku) with an opus `advisor` consulted at strategic moments — Anthropic's advisor pattern, replicated using Claude Code subagents. The executor handles the bulk of mechanical work; the advisor reviews approach, diagnoses difficulty, and sanity-checks before declaring done.

**Core principle:** the advisor exists to make decisions you'd otherwise make worse alone. Call it when the cost of being wrong about an approach exceeds the cost of a 5–15 second subagent dispatch.

## When to Use

- Main session running on sonnet or haiku, on multi-step tasks (>2 steps or >5 minutes wall time)
- Controller in `subagent-driven-development` running on sonnet/haiku, between tasks
- Inline executor in `executing-plans` on sonnet/haiku, during the execution loop

## When NOT to Use

- Main session is opus (executor is already advisor-class — same model)
- Trivial fast-path tasks (typo fix, rename, single-file edit with known pattern) per `brainstorming` triage
- Mechanical follow-up dictated by tool output you just read (you don't need a strategist for "the test failed, run it again with -v")
- Permission-asks (the advisor accelerates decisions; it does not gate them — see `no-permission-asks`)

## The Three Timings

Anthropic's documented advisor pattern has three call sites. Use them.

### 1. After orientation, before substantive work

Read a few files (Read/Grep/Glob) to understand the task surface. Then dispatch advisor with a brief covering: what the task is, what approach you're considering, what files you've explored, and the specific question. Advisor reviews approach and returns a ≤100-word enumerated plan.

Orientation reads are NOT substantive work. Writing, editing, committing, declaring an answer ARE. The dividing line is "have I done something hard to undo?"

### 2. On difficulty, error, or approach change

When errors recur, the approach is not converging, or you find evidence that contradicts your assumption — dispatch advisor with the new evidence and your revised hypothesis. The advisor sees what you saw and reorients.

### 3. Before declaring done

After writing the durable result (file, commit, tool output), but before reporting DONE — dispatch advisor with the result and ask "is this complete? did I miss anything?" The advisor catches gaps before the controller dispatches reviewers.

**Order matters:** write the durable result FIRST, then call advisor. If the session ends during the advisor call, a written file persists; an unwritten one doesn't.

## Brief Format

Pass the advisor a focused brief, not the full conversation. The advisor sees only what you give it (subagents have fresh context — confirmed in research brief).

```
Task: <one-sentence description>
Approach considering: <the path you're about to take>
Files explored: <list of paths read so far, with one-line takeaways>
Question: <the specific decision the advisor should weigh in on>
```

Keep it under 200 words. The advisor returns ≤100-word enumerated steps; brief reciprocity matters.

### Example brief (good)

```
Task: Add a rate-limit middleware to the /api/checkout endpoint.
Approach considering: Use a token-bucket per-user counter in Redis, 5 req/min.
Files explored:
- src/middleware/auth.ts — existing middleware pattern, decorator-style
- src/lib/redis.ts — Redis client, no rate-limit utilities yet
- package.json — has ioredis but no rate-limit library
Question: Should I add a dependency (express-rate-limit, rate-limiter-flexible) or roll the token bucket inline given we have ioredis already?
```

## Acting on Advice

Give the advice serious weight. The advisor is a stronger model with the brief in front of it. But:

- If you have **primary-source evidence** that contradicts a specific claim ("the file says X, the docs state Y"), don't silently switch.
- Surface the conflict via a **reconcile call**: a second advisor dispatch with the conflict explicit ("I found X in src/auth.ts:42, you suggested Y, which constraint breaks the tie?").
- A passing self-test is not evidence the advice is wrong — it's evidence your test doesn't check what the advice is checking.

The reconcile call is the disagreement protocol. Use it instead of unilaterally overriding.

## Subagent-Driven-Development Special Case

In SDD, the **controller** dispatches advisor — implementer subagents cannot (harness restriction: subagents cannot dispatch sub-subagents).

Pattern for SDD controllers running on sonnet/haiku:

1. Before dispatching the implementer for Task N: dispatch advisor with the plan excerpt + relevant context. Pass the advisor's plan into the implementer's dispatch prompt.
2. After implementer reports DONE_WITH_CONCERNS or surfaces strategic doubt: dispatch advisor again with the report + concerns. Use the advice to guide whether reviewers run as planned or whether the implementer needs another pass.

Implementers don't dispatch advisor; they surface concerns the controller acts on. See `subagent-driven-development/implementer-prompt.md` for the implementer-side discipline.

## Common Mistakes

- **Calling on every tool call.** Advisor adds value at strategic moments, not on every read or edit. Three calls per task is typical; ten is wasteful.
- **Calling without orientation.** "Help me build X" with no file reads gives the advisor nothing to ground its advice in. Read first, then ask.
- **Calling instead of trying.** If you can verify with a 30-second test, run the test. Don't dispatch a 10-second advisor call to avoid the work.
- **Using the advisor as a permission-ask.** "Should I commit?" is a permission-ask (banned per `no-permission-asks`). "Is my approach to the X invariant correct?" is a strategic check (welcome).
- **Hiding evidence.** If the brief omits a file you've already read, the advisor can't reconcile against it. Include the brief's "Files explored" section honestly.

## Why This Skill Exists

Anthropic's published advisor tool (`platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool`) lives at the API level. We replicate the value props using Claude Code subagents — single workflow, no SDK code, transparent in the transcript. The trade-off is 5–15+ seconds per dispatch (subagent overhead) versus the API version's server-side sub-inference. Worth it on multi-minute tasks; skip on sub-minute work.
```

- [ ] **Step 2: Verify the skill renders**

Run: `head -3 skills/consulting-the-advisor/SKILL.md`
Expected: shows YAML frontmatter with `name`, `description`.

- [ ] **Step 3: Commit**

```bash
git add skills/consulting-the-advisor/SKILL.md
git commit -m "feat(skills): add consulting-the-advisor skill"
```

---

## Task 3: Create `advisor` agent

@ultrapowers-dev:plugin-development @ultrapowers-dev:multi-agent-handoffs

**Files:**
- Create: `agents/advisor.md`

- [ ] **Step 1: Write the agent file**

Create `agents/advisor.md`:

```markdown
---
name: advisor
description: Mid-task strategic checkpoint. Use when the executor (main session or controller running on sonnet/haiku) needs course correction, a sanity check before substantive work, or a final review before declaring done. Distinct from `planner` (pre-work design) and `code-reviewer` (post-step audit).
tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]
model: opus
---

# Advisor

You are dispatched mid-task to provide strategic guidance. The executor (sonnet/haiku) calls you at three moments per `ultrapowers:consulting-the-advisor`:

1. **After orientation, before substantive work** — review the proposed approach.
2. **On difficulty / error / approach change** — diagnose and redirect.
3. **Before declaring done** — final sanity check before commit/PR (executor has written the durable result first).

## Output Format

Respond in **under 100 words**, **enumerated steps**, no prose explanations. Anthropic's documented conciseness pattern — the executor needs decisions, not narratives.

Example:

```
1. Use ioredis token-bucket inline (no new dep). Pattern matches src/middleware/auth.ts.
2. Key: rate:checkout:<userId>. TTL: 60s. Increment with Lua script for atomicity.
3. Return 429 with Retry-After header; existing error middleware handles serialization.
4. Tests: integration on /api/checkout, 6 sequential requests should hit 429 on the 6th.
```

## Constraints

- Read-only. Investigate; don't modify. (Tools enforce this.)
- Give the executor's evidence weight. If they have primary-source data pointing one way and you disagree, surface the conflict explicitly so they can reconcile via a follow-up call.
- Don't restate the brief. Don't ask follow-up questions — the brief should be enough; if it isn't, say so in one line and stop.
- You do NOT have the Agent tool. Cannot dispatch sub-subagents (harness restriction; doesn't matter — you wouldn't anyway).
```

- [ ] **Step 2: Verify frontmatter**

Run: `head -7 agents/advisor.md | grep -E '^(name|model|tools):'`
Expected output (3 lines):
```
name: advisor
tools: [Read, Grep, Glob, Bash, WebSearch, WebFetch]
model: opus
```

- [ ] **Step 3: Commit**

```bash
git add agents/advisor.md
git commit -m "feat(agents): add advisor agent (opus, read-only) for mid-task strategic checkpoints"
```

---

## Task 4: Create `advisor-timing-directive.txt`

@writing-claude-code-hooks

**Files:**
- Create: `hooks/lib/advisor-timing-directive.txt`

- [ ] **Step 1: Write the directive file**

Create `hooks/lib/advisor-timing-directive.txt`:

```
=== ADVISOR TIMING (sonnet/haiku sessions) ===
You are running on a fast executor model. For multi-step tasks, dispatch the `advisor` agent (opus, read-only) at three moments:

1. After orientation (a few file reads), BEFORE substantive work — review your proposed approach.
2. When stuck — errors recurring, approach not converging, results that don't fit your model.
3. Before declaring done. Write the durable result first (file, commit, tool output), THEN call the advisor.

Brief format: "Task: <X>. Approach considering: <Y>. Files explored: <Z>. Question: <Q>." Keep under 200 words.

Treat the advice with serious weight. If your empirical evidence contradicts the advice, do not silently switch — dispatch a reconcile call surfacing the conflict.

Do NOT consult on:
- Mechanical follow-up dictated by tool output you just read
- Trivial fast-path tasks (typo fix, rename, single-file edit with known pattern)
- Permission-asks (the advisor accelerates decisions, it does not gate them — see no-permission-asks)

In subagent-driven-development: the controller dispatches advisor; implementer subagents CANNOT (harness prohibits sub-subagent dispatch). Implementers surface concerns in their reports.

Full skill: ultrapowers:consulting-the-advisor
```

- [ ] **Step 2: Verify file exists**

Run: `wc -l hooks/lib/advisor-timing-directive.txt`
Expected: ~16 lines.

- [ ] **Step 3: Commit (deferred to Task 5 alongside hook script change)**

Files staged together with the hook edit in Task 5's commit.

---

## Task 5: Extend `hooks/session-start` with model-conditional advisor injection (TDD)

@writing-claude-code-hooks @ultrapowers-dev:testing-tdd @ultrapowers-dev:error-handling

**Files:**
- Modify: `hooks/session-start`
- Create: `tests/hooks/test-session-start-model-detection.sh`

- [ ] **Step 1: Write the failing test**

Create `tests/hooks/test-session-start-model-detection.sh`:

```bash
#!/usr/bin/env bash
# Tests that hooks/session-start conditionally injects the advisor-timing
# directive based on session model: present for sonnet/haiku, absent for opus.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/session-start"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"

PASS=0
FAIL=0

run_case() {
    local name="$1"
    local model="$2"
    local expect="$3"  # "present" or "absent"

    local payload
    payload=$(jq -nc --arg m "$model" '{
        hook_event_name: "SessionStart",
        session_id: "test",
        cwd: "/tmp",
        source: "startup",
        model: $m,
        permission_mode: "acceptEdits",
        transcript_path: "/tmp/x"
    }')

    local output context
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    context=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext // .additionalContext // .additional_context // ""' 2>/dev/null || echo "")

    local actual="absent"
    if echo "$context" | grep -q "ADVISOR TIMING"; then
        actual="present"
    fi

    if [ "$actual" = "$expect" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expect, actual=$actual)"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: sonnet/haiku models inject directive"
run_case "claude-sonnet-4-6" "claude-sonnet-4-6" "present"
run_case "claude-haiku-4-5-20251001" "claude-haiku-4-5-20251001" "present"
run_case "alias sonnet" "sonnet" "present"
run_case "alias haiku" "haiku" "present"

echo "Test: opus models skip directive"
run_case "claude-opus-4-7" "claude-opus-4-7" "absent"
run_case "alias opus" "opus" "absent"

echo "Test: missing/empty model skips directive (conservative default)"
run_case "empty model" "" "absent"

echo "Test: existing no-permission-asks block still present (regression)"
payload=$(jq -nc '{
    hook_event_name: "SessionStart",
    session_id: "test",
    cwd: "/tmp",
    source: "startup",
    model: "claude-sonnet-4-6",
    permission_mode: "acceptEdits",
    transcript_path: "/tmp/x"
}')
context=$(echo "$payload" | bash "$HOOK" 2>/dev/null | jq -r '.hookSpecificOutput.additionalContext // .additionalContext // .additional_context // ""' 2>/dev/null || echo "")
if echo "$context" | grep -q "NO PERMISSION ASKS"; then
    echo "  PASS: no-permission-asks block still present"
    PASS=$((PASS + 1))
else
    echo "  FAIL: no-permission-asks block missing — regression"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

Make executable:

```bash
chmod +x tests/hooks/test-session-start-model-detection.sh
```

- [ ] **Step 2: Run test — expect failure (hook doesn't inject yet)**

```bash
./tests/hooks/test-session-start-model-detection.sh
```

Expected: 4 FAILs (sonnet/haiku cases — directive not injected because hook doesn't check model yet); 3 PASS (opus + empty + regression).

- [ ] **Step 3: Modify the session-start hook**

Open `hooks/session-start`. Find the section where the `additional_context` directive is appended (after the `using-ultrapowers_content` is read and the no-permission-asks-directive is appended). The current relevant block looks like:

```bash
# Append no-permission-asks + autonomous-decision directives (always-on rules)
directives_file="${PLUGIN_ROOT}/hooks/lib/no-permission-asks-directive.txt"
if [ -f "$directives_file" ]; then
    using_ultrapowers_content+=$'\n\n'"$(cat "$directives_file")"
fi
```

Add the model-conditional advisor-timing injection AFTER that block, BEFORE the `escape_for_json` calls:

```bash
# Conditionally append advisor-timing directive for sonnet/haiku sessions
session_model=$(jq -r '.model // ""' <<< "$payload" 2>/dev/null || echo "")
case "$session_model" in
  *sonnet*|*haiku*)
    advisor_directive_file="${PLUGIN_ROOT}/hooks/lib/advisor-timing-directive.txt"
    if [ -f "$advisor_directive_file" ]; then
        using_ultrapowers_content+=$'\n\n'"$(cat "$advisor_directive_file")"
    fi
    ;;
esac
```

**Critical:** the existing hook reads stdin with `cat 2>/dev/null` somewhere — find where the SessionStart payload is captured. Per the existing structure, it's already implicit. The new line `session_model=$(jq -r '.model // ""' <<< "$payload" ...)` requires `$payload` to be defined. If the existing script does NOT capture stdin to a variable, add this line near the top of the script (after `set -euo pipefail`):

```bash
payload=$(cat 2>/dev/null || echo "{}")
```

Verify the existing script's stdin handling first. If it already has a `payload` variable, reuse it. If it captures stdin in some other form (e.g., reading event-by-event), adapt accordingly — the pattern is "read stdin once, parse with jq."

- [ ] **Step 4: Run test — expect pass**

```bash
./tests/hooks/test-session-start-model-detection.sh
```

Expected: all 8 cases pass.

If any FAIL: re-read the hook script, ensure `$payload` is in scope when the case-glob runs, ensure the file path resolves (`${PLUGIN_ROOT}` is set per the existing convention).

- [ ] **Step 5: Verify regression — Stop hook still passes**

```bash
./tests/hooks/test-enforce-no-permission-asks.sh
./tests/hooks/test-auto-router.sh
```

Expected: 18/18 + 22/22 pass (existing tests should be unaffected).

- [ ] **Step 6: Commit**

```bash
git add hooks/session-start hooks/lib/advisor-timing-directive.txt tests/hooks/test-session-start-model-detection.sh
git commit -m "$(cat <<'EOF'
feat(hooks): conditional advisor-timing directive injection at SessionStart

Extends hooks/session-start to read session.model from the payload and
substring-match (sonnet/haiku) to conditionally append the advisor-timing
directive to additionalContext. Opus sessions and missing-model cases skip
(conservative default).

Test harness covers 4 sonnet/haiku cases (alias + full ID), 2 opus cases,
1 missing-model case, and 1 regression (no-permission-asks block still
present). All 8 pass.

Refs: docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `subagent-driven-development/SKILL.md` with controller-level advisor consultation

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`

- [ ] **Step 1: Locate the insertion point**

Run: `grep -n "^##" skills/subagent-driven-development/SKILL.md | head -20`

Find the existing "Model Selection" section (around line 133 per the previous research). The new "Controller-Level Advisor Consultation" section goes immediately after "Autonomous Dispatch Strategy" (which we added in the previous feature) and before "Handling Implementer Status."

- [ ] **Step 2: Add the new section**

Open `skills/subagent-driven-development/SKILL.md`. Find the block ending with the Autonomous Dispatch Strategy section (it ends with "Announce when confidence is in the 0.4–0.7 band..."). Immediately after that section's closing paragraph, insert:

```markdown
## Controller-Level Advisor Consultation

When the controller (the main session running this skill) is on **sonnet or haiku**, dispatch the `advisor` agent (opus) at task boundaries per `ultrapowers:consulting-the-advisor`. Implementer subagents cannot dispatch advisor themselves — Claude Code prohibits sub-subagent dispatch (verified `anthropics/claude-code` issues #19077, #46424, #50306). Consultation is a controller-level discipline.

Pattern:

1. **Before dispatching the implementer for Task N:** dispatch advisor with the plan excerpt + relevant context (files this task touches, prior task outcomes if any). Pass the advisor's enumerated approach into the implementer's dispatch prompt as additional context.
2. **If implementer reports `DONE_WITH_CONCERNS` or surfaces strategic doubt:** dispatch advisor again with the report + concerns. Decide whether to re-dispatch the implementer with revised guidance or proceed to reviewers.

When the controller's session model is **opus**, skip advisor consultation — the controller is already advisor-class. The skill detects this and short-circuits silently.

Brief format and reconcile-call patterns documented in `consulting-the-advisor`. Read that skill before your first advisor dispatch.
```

- [ ] **Step 3: Verify the section parses correctly**

Run: `grep -n "Controller-Level Advisor Consultation" skills/subagent-driven-development/SKILL.md`
Expected: one match.

- [ ] **Step 4: Commit (deferred — combine with Task 7 implementer-prompt change)**

Both edits to SDD ship together.

---

## Task 7: Update `subagent-driven-development/implementer-prompt.md` with strategic-concern surfacing

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`

- [ ] **Step 1: Locate the insertion points**

Run: `grep -n "^##\|^###\|escalation\|status" skills/subagent-driven-development/implementer-prompt.md | head -30`

Two insertion points per the research brief:
- The escalation section (around lines 66–82)
- The report format (around lines 109–122)

- [ ] **Step 2: Add the strategic-concern paragraph in the escalation section**

Open `skills/subagent-driven-development/implementer-prompt.md`. Find the escalation section (it discusses what to do when blocked or uncertain). Insert as a new bullet or sub-paragraph:

```markdown
**Strategic doubt during implementation:** If you suspect the approach is wrong but haven't verified it empirically — e.g., "the spec says X but the codebase pattern suggests Y is more idiomatic", or "I implemented this but I'm uncertain whether the invariant Z holds" — DO NOT attempt to dispatch the `advisor` agent. Subagents (you) cannot dispatch sub-subagents in Claude Code. Instead, surface the concern in your DONE_WITH_CONCERNS report (see Report Format below). The controller will dispatch advisor on your behalf if needed.
```

- [ ] **Step 3: Update the report format**

In the same file, find the report format section (lines ~109–122). Find the section listing the four statuses (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED). Update or add the DONE_WITH_CONCERNS description to:

```markdown
**DONE_WITH_CONCERNS:** All tests pass, work appears complete, but you have strategic doubts worth flagging. Examples: "I picked approach X but Y might be more idiomatic given the codebase patterns I saw", "the spec was ambiguous about Z and I went with one interpretation". List concerns in a `concerns:` field of your report. The controller may dispatch advisor (opus) on your behalf to weigh in before reviewers run.
```

If the existing format doesn't have a `concerns` field convention, add one to the report format example:

```yaml
status: DONE_WITH_CONCERNS
files_changed: [...]
tests: [...]
concerns:
  - "Approach X chosen over Y because <reason>; Y might be more idiomatic"
  - "Invariant Z assumed but not verified by tests"
```

- [ ] **Step 4: Commit Tasks 6 + 7 together**

```bash
git add skills/subagent-driven-development/SKILL.md skills/subagent-driven-development/implementer-prompt.md
git commit -m "$(cat <<'EOF'
feat(skills): SDD advisor consultation at controller level + implementer concern surfacing

Adds Controller-Level Advisor Consultation section to SKILL.md: when the
controller is on sonnet/haiku, dispatch advisor at task boundaries (before
implementer dispatch and on DONE_WITH_CONCERNS). When controller is opus,
skip — already advisor-class.

Updates implementer-prompt.md with a strategic-doubt escalation note: implementers
cannot dispatch advisor themselves (harness prohibits sub-subagent dispatch);
surface concerns via DONE_WITH_CONCERNS instead. Adds concerns field to report
format.

Refs: docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-design.md
Refs: docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-research-brief.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update `executing-plans/SKILL.md` with inline advisor consultation

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/executing-plans/SKILL.md`

- [ ] **Step 1: Locate the execution-loop section**

Run: `grep -n "^##\|Step 2\|Execute" skills/executing-plans/SKILL.md`

Find "## The Process" → "### Step 2: Execute Tasks" (around line 37–44 per the previous research).

- [ ] **Step 2: Add the inline-executor advisor paragraph**

Open `skills/executing-plans/SKILL.md`. Find the Step 2 (Execute Tasks) section. Insert a new sub-paragraph after the existing execution-loop instructions:

```markdown
### Advisor Consultation (sonnet/haiku sessions)

When the inline executor (this main session) is on sonnet or haiku, dispatch the `advisor` agent (opus, read-only) at the three moments documented in `ultrapowers:consulting-the-advisor`:

1. After orientation reads, before substantive code changes — review approach.
2. On test failures or when blocked — diagnose and redirect.
3. Before declaring a task complete (after writing the durable result) — final sanity check.

Skip when the session is on opus (already advisor-class) or when `advisor.enabled: false` in `.claude/ultrapowers-preferences.json`. Read `consulting-the-advisor` for brief format and reconcile-call patterns.
```

- [ ] **Step 3: Commit**

```bash
git add skills/executing-plans/SKILL.md
git commit -m "feat(skills): inline executor advisor consultation in executing-plans"
```

---

## Task 9: Update `using-ultrapowers/SKILL.md` cross-reference

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/using-ultrapowers/SKILL.md`

- [ ] **Step 1: Locate the Always-On Directive Set section**

Run: `grep -n "Always-On Directive Set" skills/using-ultrapowers/SKILL.md`

Find the section added in the previous feature (`no-permission-asks` + `autonomous-decision` are listed there).

- [ ] **Step 2: Add `consulting-the-advisor` to the list**

Open `skills/using-ultrapowers/SKILL.md`. In the Always-On Directive Set bullet list, add a third bullet:

```markdown
- **`ultrapowers:consulting-the-advisor`** — pair fast executor with opus advisor at strategic moments; active when session model is sonnet/haiku. In `subagent-driven-development`, applies to the controller, not implementer subagents (harness prohibits sub-subagent dispatch).
```

- [ ] **Step 3: Commit**

```bash
git add skills/using-ultrapowers/SKILL.md
git commit -m "feat(skills): cross-reference consulting-the-advisor in using-ultrapowers always-on set"
```

---

## Task 10: Write smoke-test scenarios doc (local only — not committed)

@ultrapowers-dev:testing-tdd

**Files:**
- Create: `docs/ultrapowers/specs/2026-05-06-advisor-pattern-via-subagents-smoke-tests.md`

- [ ] **Step 1: Write the smoke-test doc**

Create the file with these scenarios:

```markdown
# Smoke Test Scenarios — Advisor Pattern via Subagents

**Date:** 2026-05-06
**Plan:** `2026-05-06-advisor-pattern-via-subagents.md`

Run manually in a live Claude Code session after deploying changes.

## Setup

1. Plugin reloaded (`/reload-plugins`) so new agent + skill are visible.
2. `.claude/ultrapowers-preferences.json` contains the `advisor` block (or omits it — defaults apply).

## Scenarios

### S1: Sonnet session injects directive
Open a fresh session on sonnet (`claude --model sonnet` or set in settings.json). Inspect the session-start additionalContext (use a debug command or read `~/.claude/logs/` if you've enabled logging).
**Pass:** `additionalContext` contains "ADVISOR TIMING" block.

### S2: Opus session skips directive
Open a fresh session on opus.
**Pass:** `additionalContext` does NOT contain "ADVISOR TIMING" block. Other directives (no-permission-asks, autonomous-decision) ARE present.

### S3: First-call dispatch on multi-step task
On sonnet session, type a multi-step task: "build a small CLI that converts CSV to JSON, with a test."
**Pass:** assistant reads a few files (orientation), then dispatches `advisor` subagent before substantive code changes. Look for `<command-name>advisor</command-name>` or equivalent dispatch marker in the assistant's tool calls.

### S4: Final-call dispatch
After S3's task, observe the assistant's behavior near task completion.
**Pass:** assistant writes the durable result (file, commit), THEN dispatches advisor before reporting complete.

### S5: Mid-task dispatch on error
On sonnet session, give a task and inject a test failure mid-task ("the test fails with X — can you fix it?").
**Pass:** assistant dispatches advisor with the failure context.

### S6: Reconcile call on conflict
Provide context where advisor advice contradicts file evidence (e.g., advisor says "use library X" but the codebase explicitly forbids X in CLAUDE.md).
**Pass:** assistant dispatches advisor a second time with the conflict explicit, rather than silently switching.

### S7: Opus controller in SDD skips advisor
Run a SDD-driven plan execution from an opus controller session.
**Pass:** controller does NOT dispatch advisor between tasks (skipped per "controller is opus" rule).

### S8: Sonnet controller in SDD dispatches advisor
Run a SDD-driven plan execution from a sonnet controller session.
**Pass:** controller dispatches advisor before each implementer dispatch and on DONE_WITH_CONCERNS reports.

### S9: Implementer reports DONE_WITH_CONCERNS
Coax an implementer subagent (sonnet) to surface a strategic doubt (the implementer prompt now instructs this).
**Pass:** implementer report includes a `concerns:` field; controller acts on it (dispatches advisor or proceeds with reviewers based on concern severity).

### S10: `advisor.enabled: false` short-circuits
Set `advisor.enabled: false` in prefs. Open new sonnet session.
**Pass:** SessionStart hook does NOT inject the advisor-timing directive. Skill (if invoked manually) short-circuits at dispatch.

## Failure-Mode Scenarios

### F1: Advisor agent file missing
Rename `agents/advisor.md` to `agents/advisor.md.bak` temporarily.
**Pass:** Agent tool dispatch fails gracefully; executor logs and proceeds without advice. Session does not crash.

### F2: Network down during advisor dispatch
Disconnect network mid-task. Dispatch advisor.
**Pass:** dispatch fails or times out; executor proceeds without advice. No retry-loop hang.

### F3: Empty model in payload
(Synthetic test — covered by Task 5 unit test, but verify in live session if possible)
**Pass:** SessionStart treats unknown like opus; directive not injected. Session functions normally.
```

- [ ] **Step 2: Do NOT commit (per `commitDesignDocs: false`)**

The doc stays local. The user reviews it manually.

---

## Task 11: Update INSTALL.md and README.md

@ultrapowers-dev:plugin-development

**Files:**
- Modify: `INSTALL.md`
- Modify: `README.md`

- [ ] **Step 1: Add advisor section to INSTALL.md**

Open `INSTALL.md`. After the existing "Auto-Router and Anti-Confirmation Hooks" section, add:

```markdown
## Advisor Pattern (sonnet/haiku sessions)

When your session runs on sonnet or haiku, ultrapowers automatically:

1. Injects an "advisor timing" directive at SessionStart instructing you to consult an `advisor` agent (opus) at strategic moments — after orientation, on difficulty, before declaring done.
2. Ships an `advisor` agent definition (`agents/advisor.md`) that runs on opus with read-only tools.
3. Documents the brief format and reconcile-call pattern in `skills/consulting-the-advisor/SKILL.md`.

This replicates Anthropic's [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) using Claude Code subagents — no SDK code required.

### Configuration

Edit `.claude/ultrapowers-preferences.json`:

```json
{
  "advisor": {
    "version": 1,
    "enabled": true,
    "model": "opus"
  }
}
```

| Field | Effect |
|---|---|
| `enabled: false` | Disable advisor for this project (skips directive injection + skill consultation) |
| `model` | Model passed to the advisor subagent. Defaults to `opus`. Anything below opus defeats the pattern |

### When advisor activates

- Main session runs on sonnet or haiku → directive injected, executor calls advisor at strategic moments
- Main session runs on opus → directive NOT injected (executor is already advisor-class)
- `subagent-driven-development` controller on sonnet/haiku → controller dispatches advisor at task boundaries
- `subagent-driven-development` controller on opus → skipped (controller already advisor-class)
- Implementer subagents in SDD → never dispatch advisor (harness prohibits sub-subagent dispatch); surface concerns via DONE_WITH_CONCERNS instead

### Latency note

Subagent dispatch adds ~5–15 seconds per advisor call (vs the API-native advisor's ~1–2s server-side sub-inference). Worth it on multi-minute tasks; skip on sub-minute work via `advisor.enabled: false`.
```

- [ ] **Step 2: Update README.md What's New section**

Open `README.md`. Find the "What's New in 1.3 (in development)" section. Add a second bullet:

```markdown
- **Advisor pattern via subagents.** New `advisor` agent (opus, read-only) and `consulting-the-advisor` skill replicate Anthropic's API advisor tool using Claude Code subagents — fast executor (sonnet/haiku) consults a strong advisor at strategic moments without SDK code. Default-on for sonnet/haiku sessions. See [INSTALL.md](INSTALL.md#advisor-pattern-sonnethaiku-sessions) for configuration.
```

- [ ] **Step 3: Commit**

```bash
git add INSTALL.md README.md
git commit -m "docs: document advisor pattern (subagent replication of Anthropic advisor tool)"
```

---

## Self-Review Checklist (run before declaring complete)

- [ ] All 11 tasks completed end-to-end.
- [ ] `tests/hooks/test-session-start-model-detection.sh` exits 0 (8/8 pass).
- [ ] Existing tests still pass: `tests/hooks/test-enforce-no-permission-asks.sh` (18/18), `tests/hooks/test-auto-router.sh` (22/22).
- [ ] `agents/advisor.md` parses; frontmatter has `name`, `description`, `model: opus`, `tools` excludes `Agent`/`Edit`/`Write`.
- [ ] `skills/consulting-the-advisor/SKILL.md` exists; description starts with "Use when".
- [ ] `hooks/lib/advisor-timing-directive.txt` content visible when running session-start with sonnet/haiku model in payload.
- [ ] `skills/subagent-driven-development/SKILL.md` has Controller-Level Advisor Consultation section.
- [ ] `skills/subagent-driven-development/implementer-prompt.md` has strategic-concern paragraph + DONE_WITH_CONCERNS report format.
- [ ] `skills/executing-plans/SKILL.md` has Advisor Consultation paragraph in Step 2.
- [ ] `skills/using-ultrapowers/SKILL.md` lists `consulting-the-advisor` in Always-On Directive Set.
- [ ] `INSTALL.md` and `README.md` document the advisor pattern.
- [ ] Smoke-test doc saved locally, NOT committed.
- [ ] All commits land on `main` (per `autoCommit`/`autoPush: true`).

## Risk Log

- **Implementer subagents may attempt advisor dispatch despite the prompt template instruction.** The harness rejects the call (Agent tool unavailable to subagents). Implementers should fall back to surfacing concerns. Watch S9 in smoke tests for this.
- **`hooks/session-start` payload-handling assumptions.** Task 5 Step 3 assumes the existing script captures stdin to a `payload` variable. If it doesn't, add the `payload=$(cat 2>/dev/null || echo "{}")` line near the top. Verify by reading the existing script before editing.
- **Subagent dispatch latency** is unverified by official Anthropic benchmarks (community-reported only). The 5–15s figure is approximate. Document in the skill so users with latency-sensitive workloads can `advisor.enabled: false`.
- **Opus controller skipping advisor in SDD** is a design choice, not a hard error. Users running opus controllers don't lose anything — opus is already advisor-class. Document so the silent skip isn't surprising.
