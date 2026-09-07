# Anti-Confirmation Enforcement, Auto-Router, and Autonomous Decision Policy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultrapowers:subagent-driven-development (recommended) or ultrapowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three coordinated mechanisms in the ultrapowers plugin — anti-confirmation enforcement (SessionStart directive + Stop-hook regex), auto-router (UserPromptSubmit hook with opus classifier, dual-mode), and autonomous-decision policy (codified skill + content edits to six existing skills) — plus phase-based model routing (opus for design, sonnet for execution, haiku for lookups).

**Architecture:** Three new hooks (one extends the existing `session-start`, two are new) wired in `hooks/hooks.json`. Two new skills (`no-permission-asks`, `autonomous-decision`). One updated agent (`code-reviewer` → opus) plus two new agents (planner → opus, research-fetch → haiku). Targeted content edits to six existing ultrapowers skills replacing user-asks with autonomous decisions. Configuration schema extension in `.claude/ultrapowers-preferences.json`.

**Tech Stack:** Bash 4+ (hook scripts), `jq` (JSON parsing), `claude --bare -p` (in-hook classifier), JSON-schema (parser-safe classifier output), Markdown + YAML frontmatter (skills + agents).

**Repo conventions** (verified 2026-05-05; supersede file-naming in tasks below):
- Hook scripts in `hooks/` are **extensionless** (`hooks/session-start`, not `*.sh`) so Windows auto-bash-prepend doesn't double-invoke.
- Hooks are invoked via the cross-platform polyglot wrapper `hooks/run-hook.cmd <hook-name>`.
- Lib files (`hooks/lib/*.regex`, `hooks/lib/*.txt`, `hooks/lib/*.json`) keep their extensions.
- Test scripts in `tests/` keep `.sh` extensions (existing convention; tests live at `tests/hooks/`).
- Existing helpers in `hooks/`: `profile-gate.sh` (sourced by hooks for profile-based gating: minimal/standard/strict), `run-hook.cmd` (the wrapper).
- Existing hooks already shipped: `session-start`, `config-protection`, `auto-format`, `compaction-suggestion`.

Task file paths below should be read as: `hooks/auto-router.sh` → `hooks/auto-router`; `hooks/enforce-no-permission-asks.sh` → `hooks/enforce-no-permission-asks`; `hooks/session-start.sh` → `hooks/session-start`. `hooks.json` wiring uses `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" <hook-name>` as the command, matching existing patterns.

**Spec:** `docs/ultrapowers/specs/2026-05-05-anti-confirmation-and-auto-router-design.md`
**Research brief:** `docs/ultrapowers/specs/2026-05-05-anti-confirmation-and-auto-router-research-brief.md`
**Skills audit:** `docs/ultrapowers/specs/2026-05-05-anti-confirmation-and-auto-router-skills-audit.md`

**Skills referenced during implementation:**
- `writing-claude-code-hooks` (local, this repo) — primary reference for all hook tasks
- `ultrapowers:writing-skills` — for new skill files (Tasks 2, 3)
- `ultrapowers-dev:plugin-development` — plugin manifest, distribution
- `ultrapowers-dev:orchestrator-workers` — auto-router design pattern
- `ultrapowers-dev:multi-agent-handoffs` — model-routing patterns
- `ultrapowers-dev:error-handling` — fail-open semantics
- `ultrapowers-dev:resilience` — timeouts, classifier fallback
- `ultrapowers-dev:observability` — hook logging
- `ultrapowers-dev:auth-security` — `ANTHROPIC_API_KEY` handling
- `ultrapowers-dev:testing-tdd` — hook test corpora

---

## Task 1: Extend preferences schema with `autoRouter` block

@writing-claude-code-hooks

**Files:**
- Modify: `.claude/ultrapowers-preferences.json`
- Modify: `skills/brainstorming/SKILL.md` (Workflow Preferences section)
- Modify: `INSTALL.md` (document new fields)

- [ ] **Step 1: Add `autoRouter` block to preferences file**

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
  }
}
```

- [ ] **Step 2: Document the schema in brainstorming skill**

Open `skills/brainstorming/SKILL.md`. Find the "Workflow Preferences" section (around the schema documentation). Add documentation for the new `autoRouter` block. Insert after the existing schema example:

```markdown
**`autoRouter` block** (consumed by the UserPromptSubmit hook in `hooks/auto-router.sh`):
- `version` (int): schema version, currently `1`
- `enabled` (bool): when `false`, the hook short-circuits to passthrough
- `model` (string): `--model` value passed to `claude --bare -p`. Aliases: `opus`/`sonnet`/`haiku`/`default`/`best`. Defaults to `opus`.
- `invokeThreshold` (float, 0.0–1.0): confidence ≥ this triggers AUTO-INVOKE injection. Default 0.7.
- `suggestThreshold` (float, 0.0–1.0): confidence between this and `invokeThreshold` triggers SUGGEST injection. Default 0.4. Below: passthrough.
```

- [ ] **Step 3: Document the schema in INSTALL.md**

Open `INSTALL.md`. Find the section that documents `.claude/ultrapowers-preferences.json` (or add one if missing under a heading "## Workflow Preferences"). Append the same `autoRouter` block documentation as Step 2.

- [ ] **Step 4: Commit**

```bash
git add .claude/ultrapowers-preferences.json skills/brainstorming/SKILL.md INSTALL.md
git commit -m "feat(prefs): add autoRouter config block for UserPromptSubmit hook"
git push
```

---

## Task 2: Add `ultrapowers:no-permission-asks` skill

@ultrapowers:writing-skills

**Files:**
- Create: `skills/no-permission-asks/SKILL.md`

- [ ] **Step 1: Create the skill file**

Write `skills/no-permission-asks/SKILL.md`:

```markdown
---
name: no-permission-asks
description: Use when responding to any user task — establishes that mid-task permission-asks ("Want me to X?", "Shall I proceed?", "Crack on with Y?") are banned, the user's request is one job to complete through, and clarifying questions are only allowed before work starts or at sanctioned skill checkpoints
---

# No Permission Asks

## Overview

The user has given you a job. Finish the job. Do not interrupt mid-task to ask whether you should continue, proceed, run a command you already announced, or take an obvious next step. The harness enforces this via a Stop hook (`hooks/enforce-no-permission-asks.sh`) — the rule is here so you internalize it rather than relying on enforcement to catch you.

**Core principle:** treat each user request as one continuous job. Plan, execute, verify, report. The user redirects in flight if needed; that's cheaper than blocking on every step.

## When to Use

- Always — this rule is active for the entire session
- Cross-referenced from `using-ultrapowers` so it's part of the always-on directive set

## The Rule

**Banned:** mid-task permission-asks. You're mid-task whenever the user has given you something to do and you haven't completed it yet.

| Banned phrase pattern | Why |
|---|---|
| "Want me to X?" / "Want me to continue?" | The user already wants you to. They asked. |
| "Shall I proceed?" / "Shall I continue?" | Same. |
| "Should I (proceed/continue/go ahead/run X)?" | Same. |
| "Crack on with X?" | Same. |
| "Do you want me to X?" | Same. |
| "Let me know if you want me to X" | Don't wait. Do it. |
| "Ready when you are" / "Ready for you" | The user is ready — they gave you the job. |
| "Just let me know" / "Just say the word" | Don't wait for permission. |
| "Would you like me to X?" | Same as "Want me to". |
| "May I proceed?" | Same. |

**Allowed:**
- Clarifying questions **before work starts** when a requirement is genuinely ambiguous and would change the outcome of the work (not the path).
- Clarifying questions **when genuinely blocked** — missing credentials, missing files, contradictory signals you cannot reconcile by reading code.
- **Sanctioned skill checkpoints** — brainstorming section approvals, writing-plans review gates. These emit a `<skill-checkpoint>` marker that the Stop hook respects.

## Decision Test

Before ending an assistant turn that contains a question, ask:

1. Is the user's job complete? If yes → no question needed; just report the result.
2. If no, am I genuinely blocked (missing info that prevents continuation)? If yes → ask, but be specific.
3. Otherwise: don't ask. Continue working.

## Common Mistakes

- "I'll explain my plan and then ask if I should execute it." → Just execute it. Explain in the diff/commit.
- "I want to confirm I understood." → Confirm by doing. The user redirects if wrong.
- "I'm done with step 1, want me to do step 2?" → Do step 2. The user gave you the whole job.

## Why This Skill Exists

Recent Claude model behavior produces excessive confirmation requests that fragment work into permission-checkpoint loops. This skill + the Stop-hook enforcement closes the loop: the directive is here, the hook holds the line if you forget.
```

- [ ] **Step 2: Commit**

```bash
git add skills/no-permission-asks/SKILL.md
git commit -m "feat(skills): add no-permission-asks skill"
git push
```

---

## Task 3: Add `ultrapowers:autonomous-decision` skill

@ultrapowers:writing-skills

**Files:**
- Create: `skills/autonomous-decision/SKILL.md`

- [ ] **Step 1: Create the skill file**

Write `skills/autonomous-decision/SKILL.md`:

```markdown
---
name: autonomous-decision
description: Use at any in-skill decision point — task complexity, scope tier, fast-path eligibility, audit depth, plan granularity, debugging strategy — to decide autonomously from conversation signals rather than asking the user; only fall back to a single targeted question when confidence is below 0.4 or signals are contradictory
---

# Autonomous Decision

## Overview

Skills hit decision points: is this task simple or complex? Does this project need a deep audit or a fast-path? Should the plan be coarse or fine-grained? Should debugging start with a hypothesis or a bisect?

**Decide autonomously.** The conversation almost always contains enough signal — the user's prompt, the spec, the codebase, the file count, the verb tense. Reading those signals is your job. Asking the user blocks them on something they implicitly delegated.

**The only exceptions:** truly contradictory signals you cannot reconcile, decisions that change the user's stated goal (not just the path), or decisions whose blast radius is high and irreversible.

## When to Use

- Always — this rule is active across all ultrapowers skills
- Cross-referenced from `using-ultrapowers` so it's part of the always-on directive set

## Confidence Calibration

| Confidence | Behavior |
|---|---|
| ≥ 0.7 | Decide silently, proceed |
| 0.4 – 0.7 | Decide, but announce the call in one line ("treating this as a small-scope task — fast-path through brainstorming"), then proceed |
| < 0.4 | Ask the user — but only with a single targeted question, not a menu |

## Three Triggers for Asking the User

Only ask if at least one applies:

1. **Contradictory signals.** Two or more strong signals point to different choices and you cannot reconcile them by reading code/docs.
2. **Goal shift.** The decision would change *what* you build, not just *how* you build it.
3. **High blast radius + irreversible.** Action affects shared state (force push, drop table, send message) and cannot be undone.

## Decision Examples

**Brainstorming fast-path triage** — signals: prompt length, verb specificity, scope keywords, codebase size, framework constraints. Decide silently in most cases.

**Plan granularity** — signals: spec component count, dependency density, file-touch surface area. Coarse for ≤3 components and tight coupling; fine-grained for ≥5 components or cross-cutting concerns.

**Debug strategy** — signals: error reproducibility, stack-trace depth, recent commit churn. Hypothesis-first when stack trace is informative; bisect-first when symptom is intermittent and recent.

**Subagent dispatch strategy** — signals: task independence, shared state. Parallel for independent tasks; sequential for dependency chains; serial for tasks that mutate shared state.

## How to Announce

When confidence is in the 0.4–0.7 band, announce in one line and proceed. Pattern:

> "<one-sentence call> — proceeding."

Examples:
- "Treating this as a small-scope task — fast-path through brainstorming. Proceeding."
- "Plan looks coarse-grain — three tasks, tight coupling. Proceeding."
- "Hypothesis-first: stack trace points clearly at the cache layer. Proceeding."

Don't elaborate. The user redirects in flight if wrong.

## Common Mistakes

- "I'll ask the user just to be safe." → That's the trap. Asking is not free; it costs flow. Decide.
- "I'll list options and let them pick." → Menu-asks fragment the work. Pick the most-likely-correct option and announce.
- "Confidence is exactly 0.5, what do I do?" → Treat as 0.4–0.7 band: announce + proceed. Round up.

## Why This Skill Exists

In-skill user-asks are an anti-pattern: they delegate decisions back to the user that the model is well-positioned to make. The auto-router (UserPromptSubmit hook) handles the cross-skill routing axis; this skill handles the within-skill axis.
```

- [ ] **Step 2: Commit**

```bash
git add skills/autonomous-decision/SKILL.md
git commit -m "feat(skills): add autonomous-decision skill"
git push
```

---

## Task 4: Extend `session-start` hook to inject the no-permission-asks directive

@writing-claude-code-hooks

**Files:**
- Modify: `hooks/session-start.sh` (existing)

- [ ] **Step 1: Read the existing session-start hook**

Run: `cat hooks/session-start.sh`. Note the existing structure — it injects `using-ultrapowers` skill content. The new directive concatenates into the same `additionalContext` payload.

- [ ] **Step 2: Add the directive injection**

Locate the section in `hooks/session-start.sh` that builds the `additionalContext` string. Append the no-permission-asks directive to the existing content. The final injected text must include this block (exact wording — Claude reads it verbatim):

```
=== NO PERMISSION ASKS (always-on) ===
The user has given you a job. Finish the job. Do not interrupt mid-task to ask whether you should continue, proceed, run a command you already announced, or take an obvious next step. Treat each user request as one continuous job.

Banned mid-task phrases: "Want me to X?", "Shall I proceed?", "Should I (proceed|continue|go ahead|run)", "Crack on with X?", "Do you want me to X?", "Let me know if you want me to X", "Ready when you are", "Just let me know", "Would you like me to X?", "May I proceed?"

Allowed: clarifying questions before work starts (when ambiguous), questions when genuinely blocked, sanctioned skill checkpoints (brainstorming section approvals, writing-plans review gates — these emit a <skill-checkpoint> marker the Stop hook respects).

Full skill: ultrapowers:no-permission-asks

=== AUTONOMOUS IN-SKILL DECISIONS (always-on) ===
At any in-skill decision point (task complexity, scope tier, fast-path eligibility, audit depth, plan granularity, debugging strategy), decide autonomously from conversation signals. Confidence calibration: ≥0.7 silent, 0.4–0.7 announce + proceed, <0.4 ask. Only ask the user if signals are contradictory, the decision changes the user's goal, or the action is high-blast-radius and irreversible.

Full skill: ultrapowers:autonomous-decision
```

The exact bash addition depends on how `session-start.sh` builds its content. If it uses a heredoc, append to the heredoc. If it uses `cat`-ed files, add a new file `hooks/lib/no-permission-asks-directive.txt` containing the block above and `cat` it after the existing content.

**Use the file approach** for cleanliness:

Create `hooks/lib/no-permission-asks-directive.txt` with the directive block exactly as shown above (including the two `=== ... ===` headers).

Then in `hooks/session-start.sh`, after the existing `additionalContext` content is built (variable name varies — locate where the using-ultrapowers content is concatenated), append:

```bash
# Append no-permission-asks + autonomous-decision directives
DIRECTIVES_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/lib/no-permission-asks-directive.txt"
if [ -f "$DIRECTIVES_FILE" ]; then
    additional_context+=$'\n\n'"$(cat "$DIRECTIVES_FILE")"
fi
```

Adjust the variable name (`additional_context`) to match the existing script's variable.

- [ ] **Step 3: Verify the script still produces valid JSON**

Run a manual test:

```bash
echo '{"hook_event_name":"SessionStart","session_id":"test","cwd":"/tmp","source":"startup","model":"opus","permission_mode":"acceptEdits","transcript_path":"/tmp/x"}' | bash hooks/session-start.sh | jq -e .
```

Expected: exit code 0, well-formed JSON. The `additionalContext` field should contain both the existing using-ultrapowers content AND the new directives.

- [ ] **Step 4: Commit**

```bash
git add hooks/session-start.sh hooks/lib/no-permission-asks-directive.txt
git commit -m "feat(hooks): inject no-permission-asks + autonomous-decision directives at SessionStart"
git push
```

---

## Task 5: Implement `enforce-no-permission-asks.sh` (Stop hook)

@writing-claude-code-hooks @ultrapowers-dev:testing-tdd @ultrapowers-dev:error-handling

**Files:**
- Create: `hooks/enforce-no-permission-asks.sh`
- Create: `hooks/lib/banned-phrases.regex`
- Create: `tests/hooks/test-enforce-no-permission-asks.sh`
- Create: `tests/hooks/fixtures/banned-phrases.txt`
- Create: `tests/hooks/fixtures/allowed-phrases.txt`

- [ ] **Step 1: Write banned-phrases regex file**

Create `hooks/lib/banned-phrases.regex` with one POSIX-extended regex per line. Final content:

```
\b(want me to)\b
\b(shall i)\b
\b(should i (proceed|continue|go ahead|run|create|do))\b
\b(crack on with)\b
\b(do you want me to)\b
\b(let me know if you( want| wanted|'ll want))\b
\b(ready (when|for) you)\b
\b(just (let me know|say the word))\b
\b(would you like me to)\b
\b(may i (proceed|continue))\b
```

- [ ] **Step 2: Write fixtures — banned phrases**

Create `tests/hooks/fixtures/banned-phrases.txt`:

```
Want me to continue with the next file?
Shall I proceed with the migration?
Should I run the tests now?
Crack on with the refactor?
Do you want me to commit?
Let me know if you want me to add more.
Ready when you are!
Just let me know if you want me to continue.
Would you like me to also update the README?
May I proceed with the deployment?
```

- [ ] **Step 3: Write fixtures — allowed phrases**

Create `tests/hooks/fixtures/allowed-phrases.txt`:

```
The migration completed successfully. 47 rows updated.
I added the new module at src/auth/jwt.ts.
Tests pass. Committed at abc123.
The build is green.
I noticed two ambiguous requirements in the spec — does the rate limit apply per-user or per-IP?
I cannot proceed: ANTHROPIC_API_KEY is not set in the environment. Please set it and let me know.
```

(The last two lines are deliberately allowed: a genuine pre-work clarifying question, and a genuinely-blocked report. Neither contains banned-phrase patterns.)

- [ ] **Step 4: Write the hook test harness**

Create `tests/hooks/test-enforce-no-permission-asks.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/enforce-no-permission-asks.sh"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"

PASS=0
FAIL=0

run_case() {
    local name="$1"
    local payload="$2"
    local expected_decision="$3"  # "block" or "allow"

    local output
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)

    local actual="allow"
    if echo "$output" | jq -e '.decision == "block"' > /dev/null 2>&1; then
        actual="block"
    fi

    if [ "$actual" = "$expected_decision" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expected_decision, actual=$actual)"
        echo "    output: $output"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: banned phrases trigger block"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    payload=$(jq -nc --arg msg "$line" '{
        hook_event_name: "Stop",
        session_id: "test",
        transcript_path: "/tmp/x",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        last_assistant_message: $msg,
        stop_hook_active: false
    }')
    run_case "banned: ${line:0:50}" "$payload" "block"
done < "$REPO_ROOT/tests/hooks/fixtures/banned-phrases.txt"

echo "Test: allowed phrases pass through"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    payload=$(jq -nc --arg msg "$line" '{
        hook_event_name: "Stop",
        session_id: "test",
        transcript_path: "/tmp/x",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        last_assistant_message: $msg,
        stop_hook_active: false
    }')
    run_case "allowed: ${line:0:50}" "$payload" "allow"
done < "$REPO_ROOT/tests/hooks/fixtures/allowed-phrases.txt"

echo "Test: stop_hook_active=true short-circuits"
payload=$(jq -nc '{
    hook_event_name: "Stop",
    session_id: "test",
    transcript_path: "/tmp/x",
    cwd: "/tmp",
    permission_mode: "acceptEdits",
    last_assistant_message: "Want me to continue?",
    stop_hook_active: true
}')
run_case "stop_hook_active=true allows even on banned phrase" "$payload" "allow"

echo "Test: <skill-checkpoint> marker exempts"
payload=$(jq -nc '{
    hook_event_name: "Stop",
    session_id: "test",
    transcript_path: "/tmp/x",
    cwd: "/tmp",
    permission_mode: "acceptEdits",
    last_assistant_message: "<skill-checkpoint>brainstorming-section-1</skill-checkpoint> Approve section 1?",
    stop_hook_active: false
}')
run_case "skill-checkpoint marker allows banned-looking phrase" "$payload" "allow"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

Make it executable:

```bash
chmod +x tests/hooks/test-enforce-no-permission-asks.sh
```

- [ ] **Step 5: Run the test — expect failure (hook doesn't exist yet)**

```bash
./tests/hooks/test-enforce-no-permission-asks.sh
```

Expected: script errors out because `hooks/enforce-no-permission-asks.sh` doesn't exist. This is the RED phase.

- [ ] **Step 6: Implement the hook**

Create `hooks/enforce-no-permission-asks.sh`:

```bash
#!/usr/bin/env bash
# Stop hook: blocks Stop when assistant ends on a mid-task permission-ask.
# Outputs JSON with decision: "block" + continuation reason.
# Fails open (allows Stop) on any error per writing-claude-code-hooks.

set -uo pipefail

LOG="${HOME}/.claude/logs/enforce-no-permission-asks.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

allow_stop() { exit 0; }

block_stop() {
    local reason="$1"
    jq -nc --arg r "$reason" '{decision: "block", reason: $r}'
    exit 0  # exit 0 + JSON form; do not use exit 2 (plugin bug #10412)
}

# Read payload from stdin (fail-open if jq isn't available)
if ! command -v jq >/dev/null 2>&1; then
    echo "$(date -Iseconds) jq missing, allowing stop" >> "$LOG"
    allow_stop
fi

payload=$(cat 2>/dev/null || echo "{}")
last_msg=$(echo "$payload" | jq -r '.last_assistant_message // ""' 2>/dev/null || echo "")
stop_active=$(echo "$payload" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")

# Already blocked once; allow Stop now to prevent infinite loops.
if [ "$stop_active" = "true" ]; then
    allow_stop
fi

# Sanctioned skill checkpoint exemption.
if echo "$last_msg" | grep -q '<skill-checkpoint>'; then
    allow_stop
fi

# No message; nothing to scan.
if [ -z "$last_msg" ]; then
    allow_stop
fi

# Scan for banned phrases.
REGEX_FILE="${CLAUDE_PLUGIN_ROOT:-.}/hooks/lib/banned-phrases.regex"
if [ ! -f "$REGEX_FILE" ]; then
    echo "$(date -Iseconds) regex file missing at $REGEX_FILE" >> "$LOG"
    allow_stop
fi

# Case-insensitive search across all banned-phrase regexes.
matched=""
while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue
    if echo "$last_msg" | grep -qiE "$pattern"; then
        matched="$pattern"
        break
    fi
done < "$REGEX_FILE"

if [ -n "$matched" ]; then
    echo "$(date -Iseconds) blocked on pattern: $matched" >> "$LOG"
    block_stop "You ended on a permission-ask mid-job. The user gave you a job — finish it. Continue working."
fi

allow_stop
```

Make it executable:

```bash
chmod +x hooks/enforce-no-permission-asks.sh
```

- [ ] **Step 7: Run the test — expect pass**

```bash
./tests/hooks/test-enforce-no-permission-asks.sh
```

Expected: all cases pass. If any fail, fix the hook script (not the test) until green.

- [ ] **Step 8: Wire the hook into `hooks/hooks.json`**

Open `hooks/hooks.json`. Add a `Stop` event entry to the existing `hooks` object. Preserve all existing entries. Add:

```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-no-permission-asks.sh",
        "timeout": 10
      }
    ]
  }
]
```

(If the `hooks` object already has a `Stop` key, append a new entry to its array. If not, add the new key alongside existing event keys.)

- [ ] **Step 9: Mirror in `hooks/hooks-cursor.json` if applicable**

Open `hooks/hooks-cursor.json`. If Cursor supports Stop hooks (verify with `grep -i stop hooks/hooks-cursor.json` and existing patterns), add the same entry adjusted for Cursor path conventions. If Cursor does not support Stop hooks, skip and add a brief comment in the file.

- [ ] **Step 10: Commit**

```bash
git add hooks/enforce-no-permission-asks.sh hooks/lib/banned-phrases.regex \
        tests/hooks/test-enforce-no-permission-asks.sh \
        tests/hooks/fixtures/banned-phrases.txt tests/hooks/fixtures/allowed-phrases.txt \
        hooks/hooks.json hooks/hooks-cursor.json
git commit -m "feat(hooks): Stop-hook enforcement for mid-task permission-asks"
git push
```

---

## Task 6: Author classifier assets (prompt + JSON schema + shape regex)

@writing-claude-code-hooks

**Files:**
- Create: `hooks/lib/classifier-prompt.txt`
- Create: `hooks/lib/classifier-schema.json`
- Create: `hooks/lib/shape-gate-task.regex`
- Create: `hooks/lib/shape-gate-chat.regex`

- [ ] **Step 1: Write the classifier prompt**

Create `hooks/lib/classifier-prompt.txt`:

```
You are a routing classifier for the Claude Code ultrapowers plugin. Given a single user prompt, output strict JSON with route, confidence (0.0-1.0), and a one-line reasoning.

Routes:
- brainstorm: building, designing, creating, or implementing something new (verbs: build, create, design, add, implement, make, set up, scaffold)
- debug: fixing bugs, errors, unexpected behavior, failing tests (verbs: fix, debug, broken, error, fails, why is, why does, why won't, troubleshoot)
- plan-execution: executing or running an existing implementation plan (mentions: "plan", "execute the plan", "run the plan", "implement the plan")
- research: open-ended research, exploration, comparisons (verbs: research, find out, compare, evaluate, what are, what is the best)
- ui: UI/UX/design work specifically (mentions: design, mockup, layout, component, screen, page, frontend, visual, dribbble, figma)
- passthrough: trivial questions, chat, explanations, code reads, OR explicit user opt-out

Conversational opt-out: if the user message contains language like "just answer", "skip the workflow", "no skill", "don't run brainstorming", "raw answer", "directly answer", "no auto-router", classify as passthrough at high confidence (>= 0.9).

Confidence calibration:
- 0.9+: unambiguous match — clear verb + clear scope
- 0.7-0.9: clear match with minor ambiguity
- 0.4-0.7: plausible match but could be other route or passthrough
- 0.0-0.4: weak signal; prefer passthrough

Output strict JSON. No prose, no markdown, no commentary.
```

- [ ] **Step 2: Write the classifier JSON schema**

Create `hooks/lib/classifier-schema.json`:

```json
{
  "type": "object",
  "required": ["route", "confidence", "reasoning"],
  "additionalProperties": false,
  "properties": {
    "route": {
      "type": "string",
      "enum": ["brainstorm", "debug", "plan-execution", "research", "ui", "passthrough"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "reasoning": {
      "type": "string",
      "maxLength": 200
    }
  }
}
```

- [ ] **Step 3: Write task-shape regex**

Create `hooks/lib/shape-gate-task.regex` — POSIX-extended, case-insensitive, one pattern per line:

```
^(build|create|add|implement|design|fix|debug|refactor|migrate|set ?up|configure|integrate|deploy|write|update|delete|remove|rename|wire|ship|generate|extract|inline|hoist|split|merge|optimize)\b
\b(implement|build|fix|refactor|add|create|design|set up|wire up)\b.{0,80}\b(it|this|that|the .{1,40})$
```

- [ ] **Step 4: Write chat-shape regex**

Create `hooks/lib/shape-gate-chat.regex`:

```
^(what|why|how|when|where|who|is|are|can|could|does|do|did|should|would)\b
^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it|cool|nice)\b
^.{0,49}$
```

(The last pattern fires on prompts shorter than 50 chars; combined with verb tests it filters short questions.)

- [ ] **Step 5: Verify files exist and are readable**

```bash
ls -la hooks/lib/classifier-*.{txt,json} hooks/lib/shape-gate-*.regex
cat hooks/lib/classifier-schema.json | jq -e .
```

Expected: all four files present; schema is valid JSON.

- [ ] **Step 6: Commit**

```bash
git add hooks/lib/classifier-prompt.txt hooks/lib/classifier-schema.json \
        hooks/lib/shape-gate-task.regex hooks/lib/shape-gate-chat.regex
git commit -m "feat(hooks): classifier assets — prompt, schema, shape regexes"
git push
```

---

## Task 7: Implement `auto-router.sh` (UserPromptSubmit hook)

@writing-claude-code-hooks @ultrapowers-dev:orchestrator-workers @ultrapowers-dev:resilience @ultrapowers-dev:auth-security

**Files:**
- Create: `hooks/auto-router.sh`
- Create: `tests/hooks/test-auto-router.sh`
- Create: `tests/hooks/fixtures/task-shaped.txt`
- Create: `tests/hooks/fixtures/chat-shaped.txt`

- [ ] **Step 1: Write task-shaped fixtures**

Create `tests/hooks/fixtures/task-shaped.txt`:

```
build a contact form with email validation
fix the failing test in src/auth.ts
implement OAuth flow for Google sign-in
debug why the API returns 500 on POST
add a dark mode toggle to the settings page
refactor the user service to use dependency injection
design a new pricing page with three tiers
migrate the database from MySQL to Postgres
write a CLI tool that converts CSV to JSON
update the README with the new install instructions
```

- [ ] **Step 2: Write chat-shaped fixtures**

Create `tests/hooks/fixtures/chat-shaped.txt`:

```
what does this file do?
how does the auth flow work?
why is the build failing?
hi
hello
ok
thanks
explain the cache layer
is this function pure?
where is the config defined?
```

- [ ] **Step 3: Write the hook test harness**

Create `tests/hooks/test-auto-router.sh`:

```bash
#!/usr/bin/env bash
# Tests the shape gate and slash-prefix early-exit. Does NOT test the live
# classifier (that requires ANTHROPIC_API_KEY and network — covered separately).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/auto-router.sh"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"
# Force shape-gate-only mode to skip the LLM call in tests.
export ULTRAPOWERS_AUTOROUTER_TEST_MODE=1

PASS=0
FAIL=0

mock_payload() {
    local prompt="$1"
    jq -nc --arg p "$prompt" '{
        hook_event_name: "UserPromptSubmit",
        session_id: "test",
        transcript_path: "/dev/null",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        prompt: $p
    }'
}

assert_shape() {
    local name="$1" prompt="$2" expected="$3"  # "task" or "chat"
    local payload output classification
    payload=$(mock_payload "$prompt")
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    classification=$(echo "$output" | jq -r '.testMode.shape // "unknown"' 2>/dev/null || echo "unknown")
    if [ "$classification" = "$expected" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expected, actual=$classification)"
        echo "    output: $output"
        FAIL=$((FAIL + 1))
    fi
}

assert_passthrough() {
    local name="$1" prompt="$2"
    local payload output
    payload=$(mock_payload "$prompt")
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    # Passthrough = empty output OR no additionalContext field
    if [ -z "$output" ] || ! echo "$output" | jq -e '.hookSpecificOutput.additionalContext' > /dev/null 2>&1; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected passthrough, got: $output)"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: task-shaped prompts"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    assert_shape "task: ${line:0:40}" "$line" "task"
done < "$REPO_ROOT/tests/hooks/fixtures/task-shaped.txt"

echo "Test: chat-shaped prompts"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    assert_shape "chat: ${line:0:40}" "$line" "chat"
done < "$REPO_ROOT/tests/hooks/fixtures/chat-shaped.txt"

echo "Test: slash command early-exit"
assert_passthrough "slash command" "/ultrapowers:brainstorming foo"

echo "Test: recursion guard (CLAUDECODE-style)"
ULTRAPOWERS_AUTOROUTER_ACTIVE=1 assert_passthrough "recursion sentinel" "build a thing"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

Make executable:

```bash
chmod +x tests/hooks/test-auto-router.sh
```

- [ ] **Step 4: Run the test — expect failure (hook doesn't exist yet)**

```bash
./tests/hooks/test-auto-router.sh
```

Expected: script errors because `hooks/auto-router.sh` is missing. RED phase.

- [ ] **Step 5: Implement the hook**

Create `hooks/auto-router.sh`:

```bash
#!/usr/bin/env bash
# UserPromptSubmit hook: shape-gated, dual-mode auto-router.
# Confidence >= invokeThreshold → AUTO-INVOKE skill; >= suggestThreshold → SUGGEST; else passthrough.
# Fails open on any error per writing-claude-code-hooks.

set -uo pipefail

LOG="${HOME}/.claude/logs/auto-router.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-.}"
LIB="${PLUGIN_ROOT}/hooks/lib"

passthrough() { exit 0; }

inject_context() {
    local content="$1"
    jq -nc --arg c "$content" '{
        hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: $c
        }
    }'
    exit 0
}

log() { echo "$(date -Iseconds) $*" >> "$LOG"; }

# Recursion guard (env-level, defense in depth alongside CLAUDECODE-unset)
if [ "${ULTRAPOWERS_AUTOROUTER_ACTIVE:-}" = "1" ]; then
    log "recursion sentinel set, passthrough"
    passthrough
fi

# Read payload
if ! command -v jq >/dev/null 2>&1; then
    log "jq missing, passthrough"
    passthrough
fi

payload=$(cat 2>/dev/null || echo "{}")
prompt=$(echo "$payload" | jq -r '.prompt // ""' 2>/dev/null || echo "")
transcript_path=$(echo "$payload" | jq -r '.transcript_path // ""' 2>/dev/null || echo "")

# Empty prompt
[ -z "$prompt" ] && passthrough

# Slash command — let the harness handle it
if [[ "$prompt" =~ ^/ ]]; then
    log "slash command, passthrough"
    passthrough
fi

# Active skill flow detection — cheap transcript tail
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    if tail -n 30 "$transcript_path" 2>/dev/null | grep -q '<command-name>ultrapowers:'; then
        log "active skill flow, passthrough"
        passthrough
    fi
fi

# Shape gate
shape_classify() {
    local p="$1"
    local task_re="${LIB}/shape-gate-task.regex"
    local chat_re="${LIB}/shape-gate-chat.regex"

    if [ ! -f "$task_re" ] || [ ! -f "$chat_re" ]; then
        log "shape regex files missing"
        echo "task"  # default to task to be safe (classifier still gates by confidence)
        return
    fi

    while IFS= read -r pattern; do
        [ -z "$pattern" ] && continue
        if echo "$p" | grep -qiE "$pattern"; then
            echo "task"
            return
        fi
    done < "$task_re"

    while IFS= read -r pattern; do
        [ -z "$pattern" ] && continue
        if echo "$p" | grep -qiE "$pattern"; then
            echo "chat"
            return
        fi
    done < "$chat_re"

    # No strong signal; default to task (classifier confidence will gate)
    echo "task"
}

shape=$(shape_classify "$prompt")

# Test mode: emit shape and exit. Used by tests/hooks/test-auto-router.sh.
if [ "${ULTRAPOWERS_AUTOROUTER_TEST_MODE:-}" = "1" ]; then
    jq -nc --arg s "$shape" '{testMode: {shape: $s}}'
    exit 0
fi

if [ "$shape" = "chat" ]; then
    log "chat-shaped, passthrough"
    passthrough
fi

# Read autoRouter config from preferences
PREFS="${PLUGIN_ROOT}/.claude/ultrapowers-preferences.json"
if [ ! -f "$PREFS" ]; then
    PREFS="$(pwd)/.claude/ultrapowers-preferences.json"
fi

enabled=$(jq -r '.autoRouter.enabled // true' "$PREFS" 2>/dev/null || echo "true")
[ "$enabled" = "false" ] && { log "autoRouter disabled"; passthrough; }

model=$(jq -r '.autoRouter.model // "opus"' "$PREFS" 2>/dev/null || echo "opus")
invoke_threshold=$(jq -r '.autoRouter.invokeThreshold // 0.7' "$PREFS" 2>/dev/null || echo "0.7")
suggest_threshold=$(jq -r '.autoRouter.suggestThreshold // 0.4' "$PREFS" 2>/dev/null || echo "0.4")

# Auth check
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    log "ANTHROPIC_API_KEY not set, passthrough"
    passthrough
fi

# Classifier call
classifier_prompt=$(cat "${LIB}/classifier-prompt.txt" 2>/dev/null || echo "")
classifier_schema=$(cat "${LIB}/classifier-schema.json" 2>/dev/null || echo "{}")

[ -z "$classifier_prompt" ] && { log "classifier-prompt missing"; passthrough; }

set +e
classifier_output=$(ULTRAPOWERS_AUTOROUTER_ACTIVE=1 \
    timeout 10 \
    env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT \
    claude --bare -p "$prompt" \
    --model "$model" \
    --append-system-prompt "$classifier_prompt" \
    --output-format json \
    --json-schema "$classifier_schema" \
    --max-turns 1 \
    --max-budget-usd 0.10 \
    --exclude-dynamic-system-prompt-sections \
    --disallowedTools "Bash,Edit,Write,Read,WebSearch,WebFetch" \
    2>>"$LOG")
classifier_exit=$?
set -e

if [ "$classifier_exit" -ne 0 ] || [ -z "$classifier_output" ]; then
    log "classifier failed (exit=$classifier_exit), passthrough"
    passthrough
fi

# Parse — structured_output preferred when --json-schema is honored
structured=$(echo "$classifier_output" | jq -c '.structured_output // (.result | fromjson? // {})' 2>/dev/null || echo "{}")
route=$(echo "$structured" | jq -r '.route // "passthrough"' 2>/dev/null || echo "passthrough")
confidence=$(echo "$structured" | jq -r '.confidence // 0' 2>/dev/null || echo "0")
reasoning=$(echo "$structured" | jq -r '.reasoning // ""' 2>/dev/null || echo "")

log "classified: route=$route conf=$confidence"

# Map route to ultrapowers skill
declare -A ROUTE_TO_SKILL=(
    [brainstorm]="ultrapowers:brainstorming"
    [debug]="ultrapowers:systematic-debugging"
    [plan-execution]="ultrapowers:executing-plans"
    [research]="ultrapowers:deep-research"
    [ui]="ultrapowers:paper-mcp-ui"
)

if [ "$route" = "passthrough" ]; then
    passthrough
fi

skill="${ROUTE_TO_SKILL[$route]:-}"
[ -z "$skill" ] && { log "unknown route: $route"; passthrough; }

# Numeric comparison — use awk for portability
above() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a >= b) }'; }

if above "$confidence" "$invoke_threshold"; then
    inject_context "AUTO-INVOKE: ${skill}. Reasoning: ${reasoning}"
elif above "$confidence" "$suggest_threshold"; then
    inject_context "SUGGEST: ${skill} may apply. Reasoning: ${reasoning}"
else
    passthrough
fi
```

Make executable:

```bash
chmod +x hooks/auto-router.sh
```

- [ ] **Step 6: Run the test — expect pass**

```bash
./tests/hooks/test-auto-router.sh
```

Expected: all shape-gate and early-exit cases pass.

- [ ] **Step 7: Live classifier smoke test (manual, requires ANTHROPIC_API_KEY)**

If `ANTHROPIC_API_KEY` is set in the environment, run a single live invocation to confirm the classifier integration:

```bash
unset ULTRAPOWERS_AUTOROUTER_TEST_MODE
payload=$(jq -nc --arg p "build a contact form" '{hook_event_name:"UserPromptSubmit",session_id:"smoke",transcript_path:"/dev/null",cwd:"/tmp",permission_mode:"acceptEdits",prompt:$p}')
echo "$payload" | bash hooks/auto-router.sh | jq .
```

Expected: JSON output with `hookSpecificOutput.additionalContext` containing "AUTO-INVOKE: ultrapowers:brainstorming. Reasoning: ...". If it returns empty (passthrough), check `~/.claude/logs/auto-router.log` for the failure mode.

- [ ] **Step 8: Wire the hook into `hooks/hooks.json`**

Open `hooks/hooks.json`. Add a `UserPromptSubmit` event entry. Preserve existing entries:

```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/auto-router.sh",
        "timeout": 15
      }
    ]
  }
]
```

- [ ] **Step 9: Mirror in `hooks/hooks-cursor.json` if Cursor supports UserPromptSubmit**

Check: `grep -i userpromptsubmit hooks/hooks-cursor.json`. If supported, add equivalent entry. If not, skip with a comment.

- [ ] **Step 10: Commit**

```bash
git add hooks/auto-router.sh tests/hooks/test-auto-router.sh \
        tests/hooks/fixtures/task-shaped.txt tests/hooks/fixtures/chat-shaped.txt \
        hooks/hooks.json hooks/hooks-cursor.json
git commit -m "feat(hooks): UserPromptSubmit auto-router with dual-mode confidence routing"
git push
```

---

## Task 8: Update agent definitions for model routing

@writing-claude-code-hooks @ultrapowers-dev:multi-agent-handoffs

**Files:**
- Modify: `agents/code-reviewer.md`
- Create: `agents/planner.md`
- Create: `agents/research-fetch.md`

- [ ] **Step 1: Update `code-reviewer` to opus**

Open `agents/code-reviewer.md`. Locate the YAML frontmatter. Change `model: inherit` to `model: opus`. Save.

(If the frontmatter currently lacks a `model` field, add `model: opus` as a new line.)

- [ ] **Step 2: Create `planner` agent**

Create `agents/planner.md`:

```markdown
---
name: planner
description: Software architect agent for designing implementation plans. Use when you need a fresh-context planning session — returns step-by-step plans, identifies critical files, considers architectural trade-offs.
tools: Read, Grep, Glob, WebSearch, WebFetch
model: opus
---

# Planner

You are a software architect dispatched as a subagent to produce an implementation plan or architectural design.

## Inputs you can rely on

- The parent session's spec, brief, and any referenced files (paths are absolute when given)
- Any skill files in `skills/` and any sibling-pack skills available in your context

## Outputs

- A clear plan with file paths, decomposition decisions, and trade-offs called out
- Or a focused architectural recommendation with reasoning

## Constraints

- Do not edit code (no Edit/Write tools).
- Reference existing patterns when proposing new ones.
- Be concise — the parent session will read your full output.
```

- [ ] **Step 3: Create `research-fetch` agent**

Create `agents/research-fetch.md`:

```markdown
---
name: research-fetch
description: Fast lookup agent for web search and documentation fetching. Use for raw research tasks — find docs, fetch URLs, gather citations. Optimized for speed and cost.
tools: WebSearch, WebFetch, Read, Grep, Glob
model: haiku
---

# Research Fetch

You are dispatched as a fast lookup subagent. Your job is to fetch, search, and summarize — not to synthesize architectural decisions or write code.

## Inputs

- A specific research question or URL list from the parent session
- Optional: a documentation domain restriction (e.g., "only `code.claude.com`")

## Outputs

- Direct quotes from sources with URLs
- A short synthesis (under 300 words) when asked to summarize
- A list of sources with one-line annotations

## Constraints

- Do not edit code.
- Prefer official documentation over blog posts.
- Note publication dates when content is time-sensitive.
- If a fetch fails, report the failure with the URL — don't fabricate.
```

- [ ] **Step 4: Verify agent files parse**

```bash
for f in agents/*.md; do
  echo "$f:"
  head -10 "$f" | grep -E '^(name|model|description):'
done
```

Expected: each file shows `name`, `description`, `model` lines from the frontmatter.

- [ ] **Step 5: Commit**

```bash
git add agents/code-reviewer.md agents/planner.md agents/research-fetch.md
git commit -m "feat(agents): phase-based model routing (code-reviewer→opus, planner→opus, research-fetch→haiku)"
git push
```

---

## Task 9: Edit `brainstorming` and `project-setup` skills for autonomous decisions

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/project-setup/SKILL.md`

- [ ] **Step 1: Audit `brainstorming/SKILL.md` for user-asks**

Run: `grep -nE 'ask the user|reply.*ok|tell me|let me know|which|pick one' skills/brainstorming/SKILL.md`

Identify each location that asks the user for in-skill decisions (NOT for design clarification — those are correct). Look in particular at: simple-task fast-path triage (commit `56b2b3b` introduced this); workflow preferences prompt; calibration question (correctly first-run only).

- [ ] **Step 2: Replace fast-path triage user-ask with autonomous decision**

In `skills/brainstorming/SKILL.md`, locate the simple-task fast-path triage section. The current pattern likely says something like *"Ask the user: is this simple or complex?"*. Replace with autonomous triage. Example replacement (adapt to the actual section):

```markdown
### Simple-Task Fast-Path Triage

Decide autonomously per `ultrapowers:autonomous-decision`. Signals to evaluate:

- **Verb specificity**: "rename X to Y" / "fix typo" / "add a comment" → simple
- **File-touch surface area**: ≤2 files implied by the prompt → simple
- **Scope keywords**: "just", "quick", "small", "tiny" → bias toward simple
- **No design ambiguity**: outcome is clear from the prompt alone → simple
- **Existing patterns suffice**: no new architecture needed → simple

**Triage:**
- All "simple" signals → fast-path: skip clarifying questions and design sections, jump to a one-paragraph spec + plan inline.
- Mixed signals → confidence in the 0.4–0.7 band: announce the call ("treating as simple-task fast-path — proceeding") and proceed.
- Strong "complex" signals (multiple files, architectural choices, ambiguous outcomes) → full brainstorming flow.

If signals are contradictory and you cannot reconcile, ask **one** targeted question (per `autonomous-decision`).
```

- [ ] **Step 3: Add cross-reference to `autonomous-decision` in brainstorming preamble**

Near the top of `brainstorming/SKILL.md` (after the frontmatter and overview), add:

```markdown
**REQUIRED BACKGROUND:** This skill follows `ultrapowers:autonomous-decision` for in-skill decision points. Do not ask the user for triage, scope, or granularity decisions when conversation signals are sufficient.
```

- [ ] **Step 4: Audit `project-setup/SKILL.md` for user-asks**

Run: `grep -nE 'ask the user|reply.*ok|tell me|let me know|which|pick one' skills/project-setup/SKILL.md`

Identify ask-points: project type detection, model preference, framework choice. If the user must be asked anything, lean on autonomous detection from filesystem signals.

- [ ] **Step 5: Replace project-type detection user-ask with autonomous detection**

Add an autonomous detection block to `skills/project-setup/SKILL.md`:

```markdown
### Project Type Detection

Decide autonomously per `ultrapowers:autonomous-decision`. Detection signals (in order of strength):

| File present | Project type |
|---|---|
| `package.json` with `"type": "module"` and `next` in deps | Next.js / TS-React |
| `package.json` with `react` dep but no `next` | Vite / CRA / generic React |
| `package.json` (no React) | Node.js / TS |
| `pyproject.toml` with `[tool.poetry]` or `[project]` | Python (Poetry / PEP 621) |
| `requirements.txt` only | Python (pip) |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pubspec.yaml` | Dart / Flutter |
| `Gemfile` | Ruby |
| Multiple of the above | Polyglot — note in CLAUDE.md, no single type |
| None | Empty / new project — ask one targeted question |

Detect once at skill entry. Announce the call ("detected Next.js / TS-React project — proceeding") only when confidence is in the 0.4–0.7 band.
```

- [ ] **Step 6: Add opus-default recommendation to `project-setup`**

In `skills/project-setup/SKILL.md`, add a "Recommended Model Configuration" section (before or after the existing config section):

```markdown
### Recommended Model Configuration

For projects using the ultrapowers planning pipeline (brainstorming → research → audit → plan), the design phase benefits from opus. Recommend in `~/.claude/settings.json`:

```json
{
  "model": "claude-opus-4-7"
}
```

This makes the main session opus by default. Execution phase (`subagent-driven-development`, `executing-plans`) hands off to sonnet-tier subagents or starts a new sonnet session — `agents/planner.md` (opus), default-implementer (sonnet via subagent override), and `agents/research-fetch.md` (haiku) handle the routing.

Do **not** modify the user's settings.json from a skill — recommend, don't override.
```

- [ ] **Step 7: Commit**

```bash
git add skills/brainstorming/SKILL.md skills/project-setup/SKILL.md
git commit -m "feat(skills): autonomous decisions in brainstorming triage and project-setup detection"
git push
```

---

## Task 10: Edit remaining four skills for autonomous decisions

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/systematic-debugging/SKILL.md`

- [ ] **Step 1: Edit `writing-plans/SKILL.md` — autonomous granularity**

Open `skills/writing-plans/SKILL.md`. Find the section on plan granularity (or task decomposition). Add an autonomous-granularity block:

```markdown
### Autonomous Granularity Decision

Decide plan granularity per `ultrapowers:autonomous-decision`. Signals:

- Spec component count ≤3 + tight coupling → coarse-grain (≤5 tasks total).
- Spec component count 4–7 + moderate coupling → medium-grain (5–12 tasks).
- Spec component count ≥8 OR cross-cutting concerns → fine-grain (12+ tasks, possibly split into multiple plans).

Announce the call when confidence is in the 0.4–0.7 band. Do not ask the user.
```

- [ ] **Step 2: Edit `executing-plans/SKILL.md` — sonnet handoff + autonomous strategy**

Open `skills/executing-plans/SKILL.md`. Add at the top of the skill body (after frontmatter and overview):

```markdown
### Model Handoff at Execution Boundary

This skill marks the boundary between design (opus) and execution (sonnet). When invoked:

1. If the current main-session model is opus: announce that execution should run on sonnet for cost/speed. Suggest the user open a new session with `--model sonnet` or `--model claude-sonnet-4-6`. Do not block — proceed in the current session if user prefers.
2. Subagents dispatched during execution use `model: sonnet` via their frontmatter (or via the Agent tool's `model` parameter).
3. Lookup-only subagents (Explore, research-fetch) use `model: haiku`.

### Autonomous Subagent Strategy

Decide parallel vs sequential per `ultrapowers:autonomous-decision`. Signals from the plan structure:

- Tasks marked independent (no shared file paths, no dependency edges) → parallel
- Tasks with serial dependencies → sequential
- Tasks that mutate shared state (database, config files) → serial (one at a time)

Announce when confidence is in the 0.4–0.7 band. Do not ask the user.
```

- [ ] **Step 3: Edit `subagent-driven-development/SKILL.md` — autonomous strategy**

Open `skills/subagent-driven-development/SKILL.md`. Add an autonomous-strategy section parallel to the one in `executing-plans` (same content adapted for in-session subagent dispatch). The two skills cover different execution modes; both need the same autonomy rule.

- [ ] **Step 4: Edit `systematic-debugging/SKILL.md` — autonomous strategy choice**

Open `skills/systematic-debugging/SKILL.md`. Add:

```markdown
### Autonomous Strategy Choice

Decide hypothesis-first vs bisect-first per `ultrapowers:autonomous-decision`. Signals:

| Signal | Strategy |
|---|---|
| Stack trace points clearly at one component | Hypothesis-first |
| Error reproduces deterministically | Hypothesis-first |
| Recent commit churn in the suspected area | Bisect-first |
| Symptom is intermittent / flaky | Bisect-first or instrumentation-first |
| Multiple plausible root causes, no clear evidence | Bisect-first |

Announce the call when in the 0.4–0.7 confidence band. Do not ask the user.
```

- [ ] **Step 5: Commit**

```bash
git add skills/writing-plans/SKILL.md skills/executing-plans/SKILL.md \
        skills/subagent-driven-development/SKILL.md skills/systematic-debugging/SKILL.md
git commit -m "feat(skills): autonomous decisions for granularity, subagent strategy, debug strategy"
git push
```

---

## Task 11: Cross-reference new skills in `using-ultrapowers`

@ultrapowers:writing-skills

**Files:**
- Modify: `skills/using-ultrapowers/SKILL.md`

- [ ] **Step 1: Add cross-references to the always-on directive set**

Open `skills/using-ultrapowers/SKILL.md`. Find the section that establishes always-on rules (likely under "Skill Priority" or "Workflow Preferences" or near the top of the body).

Add a new subsection or augment an existing one:

```markdown
## Always-On Directive Set

These rules are active for the entire session and are reinforced by the SessionStart hook (`hooks/session-start.sh`) which injects them into context:

- **`ultrapowers:no-permission-asks`** — banned mid-task confirmation requests; treat each user request as one job; allowed exceptions documented in the skill.
- **`ultrapowers:autonomous-decision`** — decide autonomously at in-skill decision points using conversation signals; only ask when truly ambiguous.

Both skills override default model behavior but remain subordinate to explicit user instructions per the priority order above (User instructions > Ultrapowers skills > Default system prompt).
```

- [ ] **Step 2: Verify the priority-order block still names CLAUDE.md correctly**

The existing skill enforces a priority order. Confirm it still reads:

> 1. User's explicit instructions (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) — highest priority
> 2. Ultrapowers skills — override default system behavior where they conflict
> 3. Default system prompt — lowest priority

If not, fix.

- [ ] **Step 3: Commit**

```bash
git add skills/using-ultrapowers/SKILL.md
git commit -m "feat(skills): cross-reference no-permission-asks and autonomous-decision in using-ultrapowers"
git push
```

---

## Task 12: Write smoke-test scenarios doc

@ultrapowers-dev:testing-tdd

**Files:**
- Create: `docs/ultrapowers/specs/2026-05-05-anti-confirmation-and-auto-router-smoke-tests.md`

- [ ] **Step 1: Write the smoke-test doc**

Create the file with the following content:

```markdown
# Smoke Test Scenarios — Anti-Confirmation Enforcement, Auto-Router, Autonomous Decisions

**Date:** 2026-05-05
**Plan:** `2026-05-05-anti-confirmation-and-auto-router.md`

These scenarios are run manually in a live Claude Code session after deploying the plugin changes. Pass criteria stated per scenario.

## Setup

1. Plugin installed with the new hooks wired (`hooks/auto-router.sh`, `hooks/enforce-no-permission-asks.sh`, extended `hooks/session-start.sh`).
2. `ANTHROPIC_API_KEY` set in environment (required for headless classifier).
3. `.claude/ultrapowers-preferences.json` contains the `autoRouter` block with defaults.

## Scenarios

### S1: Auto-invoke on task-shaped prompt

**Steps:**
1. Open a fresh Claude Code session.
2. Type: `build a contact form with email validation`.

**Pass:** assistant invokes `ultrapowers:brainstorming` automatically without being asked. Look for the `<command-name>ultrapowers:brainstorming</command-name>` marker in the response.

### S2: Passthrough on chat-shaped prompt

**Steps:**
1. Type: `what does hooks/auto-router.sh do?`.

**Pass:** assistant answers directly. No skill invocation. No latency from the classifier (shape gate caught it).

### S3: Debug skill auto-invocation

**Steps:**
1. Type: `fix the failing test in tests/hooks/test-auto-router.sh`.

**Pass:** assistant invokes `ultrapowers:systematic-debugging` automatically.

### S4: Slash command bypasses router

**Steps:**
1. Type: `/ultrapowers:brainstorming foo`.

**Pass:** brainstorming runs (slash explicit). No classifier latency observed.

### S5: Mid-skill no double-route

**Steps:**
1. Invoke brainstorming via slash or auto-route.
2. Mid-conversation, type a follow-up: `the architecture should use Postgres not MySQL`.

**Pass:** no second skill invocation. Brainstorming continues normally.

### S6: Stop hook blocks permission-ask

**Steps:**
1. Coax the assistant into ending a turn with "Want me to continue?" (e.g., during a multi-step refactor).

**Pass:** Stop hook blocks the turn end. Assistant continues working without user input. Check `~/.claude/logs/enforce-no-permission-asks.log` for a "blocked on pattern" entry.

### S7: Stop hook respects skill checkpoint

**Steps:**
1. Run brainstorming. Reach a section approval point ("Approve section 1?").

**Pass:** Stop fires normally; assistant pauses for user input. Look for `<skill-checkpoint>` marker in the assistant's last message.

### S8: Conversational opt-out

**Steps:**
1. Type: `just answer directly: how does the auto-router work?`.

**Pass:** classifier may detect opt-out and route to passthrough at high confidence. If it suggests a skill, the main session honors the opt-out and answers directly.

### S9: Autonomous fast-path triage

**Steps:**
1. Type: `fix the typo in INSTALL.md line 42 — "instll" should be "install"`.

**Pass:** brainstorming triage decides simple-task fast-path autonomously. Skill announces the call and proceeds without asking the user about complexity.

### S10: Auto-router disabled

**Steps:**
1. Edit `.claude/ultrapowers-preferences.json`, set `autoRouter.enabled` to `false`.
2. Open a new session. Type: `build a contact form`.

**Pass:** no auto-invoke. Hook short-circuits to passthrough.

## Failure-Mode Scenarios

### F1: Network down

**Steps:**
1. Disable network. Type a task-shaped prompt.

**Pass:** classifier times out within 10s. Hook fails-open to passthrough. Session continues.

### F2: ANTHROPIC_API_KEY unset

**Steps:**
1. `unset ANTHROPIC_API_KEY`. Open new session. Type a task-shaped prompt.

**Pass:** hook detects missing key, logs, passthrough. No 401 error surfaced to user.

### F3: Malformed preferences

**Steps:**
1. Corrupt `.claude/ultrapowers-preferences.json` (invalid JSON). Open new session.

**Pass:** hooks fall back to defaults (autoCommit/autoPush ON, autoRouter defaults from hardcoded fallback). No session crash.
```

- [ ] **Step 2: Commit (NOT auto-committed by default — this is a design doc)**

Per `commitDesignDocs: false` in workflow prefs, this file stays local. Skip the commit step. The user reviews it locally and commits manually if they want.

---

## Task 13: Update INSTALL.md / README.md with auto-router documentation

@ultrapowers-dev:plugin-development

**Files:**
- Modify: `INSTALL.md`
- Modify: `README.md`

- [ ] **Step 1: Add auto-router section to INSTALL.md**

Open `INSTALL.md`. Add a new section near the bottom (after existing install steps, before troubleshooting if any):

```markdown
## Auto-Router and Anti-Confirmation Hooks

After installing ultrapowers, three hooks become active automatically:

1. **SessionStart** — injects the `no-permission-asks` and `autonomous-decision` directives at every session start.
2. **UserPromptSubmit (auto-router)** — classifies your prompt with opus and auto-invokes the matching ultrapowers skill at high confidence.
3. **Stop** — blocks turn-end if the assistant ended on a mid-task permission-ask, forcing it to continue.

### Requirements

- `ANTHROPIC_API_KEY` must be set in your environment for the auto-router classifier (OAuth tokens 401 in headless mode after ~15 minutes — `claude-code#28827`).
- `jq` must be installed (`brew install jq` on macOS, `apt install jq` on Debian/Ubuntu).

### Configuration

Edit `.claude/ultrapowers-preferences.json` in your project (or copy the defaults):

```json
{
  "autoRouter": {
    "version": 1,
    "enabled": true,
    "model": "opus",
    "invokeThreshold": 0.7,
    "suggestThreshold": 0.4
  }
}
```

| Field | Effect |
|---|---|
| `enabled: false` | Disable the auto-router for this project |
| `model: "haiku"` | Use cheaper/faster classifier (lower accuracy) |
| `invokeThreshold` | Confidence ≥ this triggers AUTO-INVOKE injection (default 0.7) |
| `suggestThreshold` | Confidence ≥ this triggers SUGGEST injection (default 0.4) |

### Bypass options

- **Slash command**: any prompt starting with `/` skips the router (e.g., `/ultrapowers:brainstorming foo`).
- **Conversational opt-out**: phrases like "just answer", "skip the workflow", "no skill" — the classifier routes to passthrough.
- **Disable globally**: set `autoRouter.enabled: false`.

### Troubleshooting

- Logs: `~/.claude/logs/auto-router.log` and `~/.claude/logs/enforce-no-permission-asks.log`.
- Hooks fail-open on any error — if something breaks, you'll get vanilla Claude behavior, not a broken session.
- "Stop hook prevented continuation" error after install: ensure you have the latest plugin version. Plugin Stop-hook bug `#10412` is worked around via `exit 0 + JSON` form; older plugin versions used exit-2 and would fail.
```

- [ ] **Step 2: Add a brief mention in README.md**

Open `README.md`. In the features list (or near the top), add a bullet:

```markdown
- **Auto-router + anti-confirmation enforcement**: ultrapowers auto-invokes the right skill from any user prompt and blocks mid-task permission-asks at the harness level. See [INSTALL.md](INSTALL.md#auto-router-and-anti-confirmation-hooks) for configuration.
```

- [ ] **Step 3: Commit**

```bash
git add INSTALL.md README.md
git commit -m "docs: document auto-router, anti-confirmation hooks, configuration"
git push
```

---

## Self-Review Checklist (run before declaring complete)

- [ ] All 13 tasks completed end-to-end (no skipped commits if auto-commit is on).
- [ ] `tests/hooks/test-enforce-no-permission-asks.sh` exits 0.
- [ ] `tests/hooks/test-auto-router.sh` exits 0.
- [ ] Manual smoke S1, S2, S3, S6, S7 pass per `2026-05-05-anti-confirmation-and-auto-router-smoke-tests.md`.
- [ ] `hooks/hooks.json` validates as JSON: `jq -e . hooks/hooks.json`.
- [ ] All new agent files have `model:` frontmatter set.
- [ ] `skills/no-permission-asks/SKILL.md` and `skills/autonomous-decision/SKILL.md` exist.
- [ ] `skills/using-ultrapowers/SKILL.md` cross-references both new skills.
- [ ] `INSTALL.md` and `README.md` document the new behaviors.
- [ ] No design docs committed (per `commitDesignDocs: false`).
- [ ] All commits pushed to `main` (per `autoPush: true`).

## Risk Log (for reviewer attention)

- **Plugin Stop-hook exit-2 bug `#10412`**: Task 5 uses exit-0 + JSON form. If the bug is patched in a future Claude Code release, the workaround remains correct (just slower than necessary).
- **OAuth headless 401 `#28827`**: Auto-router fails-open if `ANTHROPIC_API_KEY` is missing. Users running on OAuth alone will see passthrough behavior.
- **Classifier cost**: opus classifier on every task-shaped prompt. With caching + shape gate, expect ~$0.001–0.005 per classified turn. Document the `autoRouter.model: haiku` knob for cost-sensitive users.
- **Cursor / Copilot CLI compatibility**: hooks are wired in `hooks/hooks.json` for Claude Code; Cursor parity in `hooks/hooks-cursor.json` is best-effort. Test on Cursor before declaring multi-platform support.
