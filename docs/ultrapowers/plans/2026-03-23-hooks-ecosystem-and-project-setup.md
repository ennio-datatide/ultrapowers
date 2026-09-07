# Hooks Ecosystem, Project Setup Skill & Persistent Preferences

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultrapowers:subagent-driven-development (recommended) or ultrapowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PreToolUse/PostToolUse/TaskCompleted hooks (config-protection, auto-format, compaction-suggestion), a project-setup skill for CLAUDE.md generation, and persistent workflow preferences per repo.

**Architecture:** Bash hook scripts gated by an env-var profile system, dispatched through the existing `run-hook.cmd` polyglot wrapper. A new skill generates CLAUDE.md from project scanning. Workflow preferences stored in `.claude/ultrapowers-preferences.json` and read by skills at runtime.

**Tech Stack:** Bash (hooks), Markdown (skills), JSON (hooks.json, preferences)

**Spec:** `docs/ultrapowers/specs/2026-03-23-hooks-ecosystem-and-project-setup-design.md`
**Research brief:** `docs/ultrapowers/specs/2026-03-23-hooks-ecosystem-research-brief.md`

---

## File Structure

```
hooks/
├── hooks.json              (modify — add PreToolUse, PostToolUse, TaskCompleted events)
├── run-hook.cmd            (no changes needed — already dispatches by script name)
├── session-start           (no changes)
├── profile-gate.sh         (create — shared profile gating logic)
├── config-protection       (create — PreToolUse hook, blocks config file writes)
├── auto-format             (create — PostToolUse hook, formats edited files)
└── compaction-suggestion   (create — PostToolUse+TaskCompleted hook, suggests /compact)

skills/
├── project-setup/
│   └── SKILL.md            (create — interactive CLAUDE.md generator)
└── brainstorming/
    └── SKILL.md            (modify — replace workflow preferences step with persistent loading)
```

---

### Task 1: Create profile-gate.sh

**Files:**
- Create: `hooks/profile-gate.sh`

- [ ] **Step 1: Write profile-gate.sh**

```bash
#!/usr/bin/env bash
# Profile gating for ultrapowers hooks.
# Source this from any hook, then call: profile_gate <minimum_level>
#   1 = minimal, 2 = standard, 3 = strict
# Returns 0 (run) or 1 (skip).

ULTRAPOWERS_PROFILE="${ULTRAPOWERS_HOOK_PROFILE:-standard}"

case "$ULTRAPOWERS_PROFILE" in
  minimal)  _UP_LEVEL=1 ;;
  standard) _UP_LEVEL=2 ;;
  strict)   _UP_LEVEL=3 ;;
  *)        _UP_LEVEL=2 ;;
esac

profile_gate() {
  [ "$_UP_LEVEL" -ge "$1" ] && return 0 || return 1
}
```

- [ ] **Step 2: Verify it's sourceable without errors**

Run: `bash -c 'source hooks/profile-gate.sh && profile_gate 2 && echo "passed"'`
Expected: `passed`

- [ ] **Step 3: Verify minimal profile skips level 2**

Run: `bash -c 'ULTRAPOWERS_HOOK_PROFILE=minimal source hooks/profile-gate.sh && profile_gate 2 && echo "should not print" || echo "skipped"'`
Expected: `skipped`

- [ ] **Step 4: Verify strict profile runs level 3**

Run: `bash -c 'ULTRAPOWERS_HOOK_PROFILE=strict source hooks/profile-gate.sh && profile_gate 3 && echo "passed"'`
Expected: `passed`

- [ ] **Step 5: Commit**

```bash
git add hooks/profile-gate.sh
git commit -m "feat: add hook profile gating system (minimal/standard/strict)"
```

---

### Task 2: Create config-protection hook

**Files:**
- Create: `hooks/config-protection`

- [ ] **Step 1: Write config-protection hook**

```bash
#!/usr/bin/env bash
# PreToolUse hook: blocks Bash commands that modify linter/formatter configs.
# Matcher: Bash | Level: standard (2)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/profile-gate.sh"
profile_gate 2 || exit 0

# Read tool input from stdin
INPUT=$(cat)

# Extract the command field from tool_input
COMMAND=$(printf '%s' "$INPUT" | grep -o '"command" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')

# Nothing to check if no command
[ -z "$COMMAND" ] && exit 0

# Config file patterns to protect
CONFIG_PATTERNS='\.eslintrc|\.prettierrc|prettier\.config|biome\.json|biome\.jsonc|\.flake8|ruff\.toml|\.ruff\.toml|tsconfig\.json|\.editorconfig|stylelint|\.pylintrc'

# Write operators that indicate modification
WRITE_OPS='(>|>>|sed|awk|cat.*EOF|cat.*eof|tee|mv|cp|rm|echo.*>)'

# Check if command modifies a config file
if printf '%s' "$COMMAND" | grep -qE "${WRITE_OPS}.*($CONFIG_PATTERNS)" || \
   printf '%s' "$COMMAND" | grep -qE "($CONFIG_PATTERNS).*(${WRITE_OPS})"; then
  echo "Do not modify linter/formatter configs. Fix the code to comply with existing rules instead." >&2
  exit 2
fi

exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x hooks/config-protection`

- [ ] **Step 3: Test — blocking a sed on .eslintrc**

Run: `echo '{"tool_name":"Bash","tool_input":{"command":"sed -i '\''s/warn/off/'\'' .eslintrc.json"}}' | bash hooks/config-protection 2>&1; echo "exit: $?"`
Expected: stderr contains "Do not modify linter/formatter configs", exit code 2

- [ ] **Step 4: Test — allowing a normal command**

Run: `echo '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' | bash hooks/config-protection 2>&1; echo "exit: $?"`
Expected: no output, exit code 0

- [ ] **Step 5: Test — blocking a redirect to biome.json**

Run: `echo '{"tool_name":"Bash","tool_input":{"command":"echo {} > biome.json"}}' | bash hooks/config-protection 2>&1; echo "exit: $?"`
Expected: stderr contains "Do not modify", exit code 2

- [ ] **Step 6: Commit**

```bash
git add hooks/config-protection
git commit -m "feat: add config-protection hook (blocks linter/formatter config edits)"
```

---

### Task 3: Create auto-format hook

**Files:**
- Create: `hooks/auto-format`

- [ ] **Step 1: Write auto-format hook**

```bash
#!/usr/bin/env bash
# PostToolUse hook: auto-formats files after Edit/Write.
# Matcher: Edit|Write | Level: standard (2) | Async: true

set -uo pipefail  # no -e: formatter exit codes shouldn't kill the hook
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/profile-gate.sh"
profile_gate 2 || exit 0

# Read tool input from stdin
INPUT=$(cat)

# Extract file_path from tool_input
FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')
[ -z "$FILE_PATH" ] && exit 0

# Only format if the file exists
[ -f "$FILE_PATH" ] || exit 0

# Extract the project directory from cwd in the hook input
CWD=$(printf '%s' "$INPUT" | grep -o '"cwd" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')
[ -z "$CWD" ] && exit 0

# Detect formatter and run on the file
# Check for Biome
if [ -f "${CWD}/biome.json" ] || [ -f "${CWD}/biome.jsonc" ]; then
  npx @biomejs/biome format --write "$FILE_PATH" >/dev/null 2>&1
  exit 0
fi

# Check for Prettier
for cfg in .prettierrc .prettierrc.json .prettierrc.yml .prettierrc.yaml .prettierrc.js .prettierrc.ts prettier.config.js prettier.config.ts prettier.config.mjs prettier.config.cjs; do
  if [ -f "${CWD}/${cfg}" ]; then
    npx prettier --write "$FILE_PATH" >/dev/null 2>&1
    exit 0
  fi
done
# Also check package.json for "prettier" key
if [ -f "${CWD}/package.json" ] && grep -q '"prettier"' "${CWD}/package.json" 2>/dev/null; then
  npx prettier --write "$FILE_PATH" >/dev/null 2>&1
  exit 0
fi

# Check for Ruff (Python files only)
if printf '%s' "$FILE_PATH" | grep -qE '\.py$'; then
  if command -v ruff >/dev/null 2>&1; then
    ruff format "$FILE_PATH" >/dev/null 2>&1
    exit 0
  fi
fi

# No formatter detected — exit silently
exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x hooks/auto-format`

- [ ] **Step 3: Test — exits cleanly with no formatter detected**

Run: `echo '{"tool_name":"Edit","tool_input":{"file_path":"/tmp/test-auto-format.txt"},"cwd":"/tmp"}' | bash hooks/auto-format 2>&1; echo "exit: $?"`
Expected: exit code 0, no output (the file doesn't exist and no formatter config in /tmp)

- [ ] **Step 4: Test — exits cleanly with empty input**

Run: `echo '{}' | bash hooks/auto-format 2>&1; echo "exit: $?"`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add hooks/auto-format
git commit -m "feat: add auto-format hook (formats files after Edit/Write)"
```

---

### Task 4: Create compaction-suggestion hook

**Files:**
- Create: `hooks/compaction-suggestion`

- [ ] **Step 1: Write compaction-suggestion hook**

```bash
#!/usr/bin/env bash
# PostToolUse + TaskCompleted hook: suggests /compact at natural boundaries.
# Matcher: Bash (PostToolUse), no matcher (TaskCompleted) | Level: standard (2)

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/profile-gate.sh"
profile_gate 2 || exit 0

# Use CLAUDE_PLUGIN_DATA for persistent counter, fall back to /tmp
DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/ultrapowers-hooks}"
mkdir -p "$DATA_DIR" 2>/dev/null
COUNTER_FILE="${DATA_DIR}/tool-count"

# Read hook input from stdin
INPUT=$(cat)

# Increment counter
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
printf '%s' "$COUNT" > "$COUNTER_FILE"

# Not enough tool calls yet — threshold is 30
[ "$COUNT" -lt 30 ] && exit 0

# Detect event type
EVENT=$(printf '%s' "$INPUT" | grep -o '"hook_event_name" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')

IS_BOUNDARY=false

case "$EVENT" in
  TaskCompleted)
    # TaskCompleted is always a boundary
    IS_BOUNDARY=true
    ;;
  PostToolUse)
    # Check if Bash tool ran a boundary command
    TOOL=$(printf '%s' "$INPUT" | grep -o '"tool_name" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')
    if [ "$TOOL" = "Bash" ]; then
      COMMAND=$(printf '%s' "$INPUT" | grep -o '"command" *: *"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//')
      # git commit
      printf '%s' "$COMMAND" | grep -qE 'git commit' && IS_BOUNDARY=true
      # test runners
      printf '%s' "$COMMAND" | grep -qE '(npm test|npx vitest|npx jest|pytest|cargo test|go test|bundle exec rspec|mix test)' && IS_BOUNDARY=true
    fi
    ;;
esac

if $IS_BOUNDARY; then
  # Reset counter
  printf '0' > "$COUNTER_FILE"
  # Inject context via hookSpecificOutput
  printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":"Good boundary point (%d tool calls since last reset). Consider running /compact to free up context before the next task."}}\n' "$EVENT" "$COUNT"
fi

exit 0
```

- [ ] **Step 2: Make executable**

Run: `chmod +x hooks/compaction-suggestion`

- [ ] **Step 3: Test — counter increments but no suggestion below threshold**

Run: `rm -f /tmp/ultrapowers-hooks/tool-count && mkdir -p /tmp/ultrapowers-hooks && echo '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | bash hooks/compaction-suggestion 2>&1; echo "exit: $?"; cat /tmp/ultrapowers-hooks/tool-count`
Expected: exit 0, no output, counter file contains "1"

- [ ] **Step 4: Test — suggests at boundary when threshold met**

Run: `printf '30' > /tmp/ultrapowers-hooks/tool-count && echo '{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"git commit -m test"}}' | bash hooks/compaction-suggestion 2>&1; echo "exit: $?"; cat /tmp/ultrapowers-hooks/tool-count`
Expected: JSON output with `additionalContext` containing "Good boundary point", counter reset to "0"

- [ ] **Step 5: Test — TaskCompleted always triggers at threshold**

Run: `printf '35' > /tmp/ultrapowers-hooks/tool-count && echo '{"hook_event_name":"TaskCompleted"}' | bash hooks/compaction-suggestion 2>&1; echo "exit: $?"`
Expected: JSON output with `additionalContext`, counter reset

- [ ] **Step 6: Test — no suggestion for non-boundary Bash at threshold**

Run: `printf '40' > /tmp/ultrapowers-hooks/tool-count && echo '{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"ls -la"}}' | bash hooks/compaction-suggestion 2>&1; echo "exit: $?"`
Expected: no output, exit 0, counter incremented to 41

- [ ] **Step 7: Commit**

```bash
git add hooks/compaction-suggestion
git commit -m "feat: add compaction-suggestion hook (smart boundary detection)"
```

---

### Task 5: Update hooks.json

**Files:**
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Replace hooks.json with updated version**

Replace the entire contents of `hooks/hooks.json` with:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" config-protection",
            "async": false
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" auto-format",
            "async": true
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" compaction-suggestion",
            "async": false
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" compaction-suggestion",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `python3 -c "import json; json.load(open('hooks/hooks.json')); print('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat: register PreToolUse, PostToolUse, TaskCompleted hooks in hooks.json"
```

---

### Task 6: Create project-setup skill

**Files:**
- Create: `skills/project-setup/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

```markdown
---
name: project-setup
description: "Use when setting up a new project, initializing CLAUDE.md, or when a project has no CLAUDE.md and the user asks for help configuring it"
---

# Project Setup

Generate a tailored CLAUDE.md for the current project by scanning the codebase and asking targeted questions.

## Process

1. **Scan the project** — auto-detect stack from manifest files:
   - `package.json` → Node.js ecosystem (check for Next.js, React, Vue, Angular, Express, etc.)
   - `requirements.txt` / `pyproject.toml` / `setup.py` → Python (check for Django, Flask, FastAPI, etc.)
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `Gemfile` → Ruby (check for Rails)
   - `composer.json` → PHP (check for Laravel)
   - `pom.xml` / `build.gradle` → Java/Kotlin (check for Spring Boot)
   - `Package.swift` → Swift
   - `mix.exs` → Elixir
   - `Makefile`, `Dockerfile` → note these for available commands
   - Check for test frameworks: jest, vitest, pytest, cargo test, go test, rspec, phpunit
   - Check for formatters/linters: biome, prettier, eslint, ruff, clippy, golangci-lint

2. **Present findings** — show what was detected and ask for confirmation:
   > "I detected [stack details]. Is this accurate? Anything I'm missing?"

3. **Ask targeted questions** — one at a time, only for things that can't be auto-detected:
   - "What testing approach do you follow? (e.g., unit + integration, TDD, specific frameworks)"
   - "Any key conventions I should know? (e.g., naming patterns, file organization rules, architectural boundaries)"
   - "What should the AI never do in this codebase? (e.g., never modify migrations directly, never use ORM raw queries)"

4. **Generate CLAUDE.md** — write to project root with these sections:

```
# [Project Name]

[One-line description]

## Tech Stack
[Detected stack with versions]

## Critical Rules
[From user's "never do" answers + sensible defaults like "no emojis in code"]

## File Structure
[Auto-generated from actual directory tree, top 2-3 levels]

## Key Patterns
[Code examples pulled from actual codebase — e.g., how API routes are structured,
how components are organized, error handling patterns in use]

## Testing
[Testing framework, conventions, how to run tests]

## Available Commands
[Detected from package.json scripts, Makefile targets, etc.]
```

5. **Ask user to review** — "CLAUDE.md written. Please review and adjust as needed."

## Preferences Mode

When invoked as "project-setup preferences" or "change my workflow preferences":

1. Read current `.claude/ultrapowers-preferences.json` if it exists
2. Show current values
3. Ask all three preferences in a single message:
   - Auto-commit (on/off)
   - Auto-push (on/off)
   - Commit design docs (on/off)
4. Write updated values to `.claude/ultrapowers-preferences.json`
5. Suggest adding to `.gitignore` if not already ignored

## Principles

- **Derive, don't template** — every section comes from the actual project, not boilerplate
- **One question at a time** — don't overwhelm
- **Keep it lean** — CLAUDE.md is always in context, so shorter is better
- **No framework advice** — ultrapowers-dev skills handle best practices
```

- [ ] **Step 2: Verify frontmatter is valid**

Run: `head -4 skills/project-setup/SKILL.md`
Expected: YAML frontmatter with name and description

- [ ] **Step 3: Verify description length under 1024 chars**

Run: `sed -n '3p' skills/project-setup/SKILL.md | wc -c`
Expected: well under 1024

- [ ] **Step 4: Commit**

```bash
git add skills/project-setup/SKILL.md
git commit -m "feat: add project-setup skill (interactive CLAUDE.md generator)"
```

---

### Task 7: Update brainstorming skill for persistent preferences

**Files:**
- Modify: `skills/brainstorming/SKILL.md`

- [ ] **Step 1: Read current brainstorming SKILL.md**

Read: `skills/brainstorming/SKILL.md` — find the "Workflow Preferences" section (around line 149).

- [ ] **Step 2: Replace the Workflow Preferences section**

Replace the current section (from `## Workflow Preferences` through `Store these preferences for the session...`) with:

```markdown
## Workflow Preferences

**Step 4 — Load or ask workflow preferences:**

Read `.claude/ultrapowers-preferences.json` in the project root using the Read tool. If it exists and contains valid JSON with `autoCommit`, `autoPush`, and `commitDesignDocs` keys, load the values silently and announce:

> "Using saved preferences (auto-commit: on/off, auto-push: on/off, commit docs: on/off). Say 'change preferences' to update."

If the file does not exist or is invalid, ask the user all three questions in **a single message**:

> "Before we move on to approaches, a few workflow preferences:
> 1. **Auto-commit** — Should I commit autonomously as I complete tasks, or would you prefer to handle commits yourself?
> 2. **Auto-push** — Should I push to remote autonomously, or would you prefer to push manually?
> 3. **Commit design docs** — Should I commit design specs and research briefs to git, or keep them local only?"

**Defaults if the user doesn't answer or says "whatever":**
- Auto-commit: **OFF** (user commits manually)
- Auto-push: **OFF** (user pushes manually)
- Commit design docs: **OFF** (local only)

After collecting answers, write them to `.claude/ultrapowers-preferences.json`:

```json
{
  "autoCommit": true,
  "autoPush": false,
  "commitDesignDocs": false
}
```

If `.claude/` directory doesn't exist, create it. Suggest adding `.claude/ultrapowers-preferences.json` to `.gitignore` if not already ignored.

All downstream skills (writing-plans, subagent-driven-development, executing-plans, finishing-a-development-branch) read this file and respect the values. If the file is missing, fall back to defaults (all OFF).
```

- [ ] **Step 3: Update the checklist step 4**

Change step 4 in the checklist from:
`4. **Ask workflow preferences** — after clarifying questions are done, ask all three in a single message (see Workflow Preferences section below)`

To:
`4. **Load or ask workflow preferences** — check for saved preferences in .claude/ultrapowers-preferences.json; if missing, ask and save (see Workflow Preferences section below)`

- [ ] **Step 4: Commit**

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat: persistent workflow preferences per repo in brainstorming"
```

---

### Task 8: Update downstream skills to read preferences

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/executing-plans/SKILL.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: Read each skill to find where preferences are referenced**

Read all four files, searching for mentions of "auto-commit", "auto-push", "commit", or "preferences".

- [ ] **Step 2: Add preferences loading instruction to writing-plans**

At the top of the writing-plans SKILL.md (after the frontmatter and overview), add:

```markdown
## Workflow Preferences

Before writing the plan, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its values for `autoCommit` and `autoPush` to determine whether commit steps should be included in the plan. If the file is missing, default to all OFF (no auto-commit, no auto-push).
```

- [ ] **Step 3: Add preferences loading instruction to subagent-driven-development**

Add a similar section near the top of the skill, referencing `autoCommit` and `autoPush`.

- [ ] **Step 4: Add preferences loading instruction to executing-plans**

Add a similar section near the top of the skill, referencing `autoCommit` and `autoPush`.

- [ ] **Step 5: Add preferences loading instruction to finishing-a-development-branch**

Add a similar section near the top of the skill, referencing `autoPush`.

- [ ] **Step 6: Commit**

```bash
git add skills/writing-plans/SKILL.md skills/subagent-driven-development/SKILL.md skills/executing-plans/SKILL.md skills/finishing-a-development-branch/SKILL.md
git commit -m "feat: downstream skills read persistent workflow preferences"
```

---

### Task 9: Update marketplace version

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `package.json`

- [ ] **Step 1: Bump version to 5.2.0 in plugin.json**

Change `"version": "5.1.0"` to `"version": "5.2.0"` in `.claude-plugin/plugin.json`.

- [ ] **Step 2: Bump version in marketplace.json**

Change `"version": "5.1.0"` to `"version": "5.2.0"` for the ultrapowers entry in `.claude-plugin/marketplace.json`.

- [ ] **Step 3: Bump version in package.json**

Change `"version": "5.1.0"` to `"version": "5.2.0"` in `package.json`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json package.json
git commit -m "chore: bump to 5.2.0 (hooks ecosystem, project-setup skill)"
```
