# Hooks Ecosystem, Project Setup Skill & Persistent Preferences

**Date:** 2026-03-23
**Status:** Draft
**Motivation:** Patterns identified from research on affaan-m/everything-claude-code. Ultrapowers currently only has a SessionStart hook — expanding to PreToolUse/PostToolUse hooks, adding a CLAUDE.md generator skill, and persisting workflow preferences per repo.

## Features

### 1. Hook Profile System

Env var `ULTRAPOWERS_HOOK_PROFILE` controls which hooks run. Three levels:

| Profile | Level | When to use |
|---------|-------|------------|
| `minimal` | 1 | Exploring, researching, quick fixes |
| `standard` (default) | 2 | Normal development |
| `strict` | 3 | Pre-merge, production work |

Implemented as `hooks/profile-gate.sh`:

```bash
#!/usr/bin/env bash
PROFILE="${ULTRAPOWERS_HOOK_PROFILE:-standard}"

case "$PROFILE" in
  minimal)  LEVEL=1 ;;
  standard) LEVEL=2 ;;
  strict)   LEVEL=3 ;;
  *)        LEVEL=2 ;;
esac

profile_gate() {
  [ "$LEVEL" -ge "$1" ] && return 0 || return 1
}
```

Each hook sources this and calls `profile_gate <level>` at the top. If it returns 1, the hook exits silently.

### 2. Hook Infrastructure (hooks.json)

Updated `hooks.json` adds `PreToolUse` and `PostToolUse` events. Follows the existing schema: plural `hooks` array, `${CLAUDE_PLUGIN_ROOT}` path prefix, explicit `async` flag.

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

**Notes:** auto-format runs async (non-blocking) since formatting can take a moment. All other hooks are sync.

### 3. Hook Input Contract

Claude Code passes hook context as JSON on stdin. The shape differs by event type.

**PreToolUse stdin:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf.jsonl",
  "cwd": "/Users/.../myproject",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "sed -i '' 's/warn/off/' .eslintrc.json",
    "description": "Disable ESLint warning"
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

**PostToolUse stdin:**
```json
{
  "session_id": "abc123",
  "cwd": "/Users/.../myproject",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  },
  "tool_response": {
    "filePath": "/path/to/file.ts",
    "success": true
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

Note: the PostToolUse field is `tool_response`, not `tool_output`.

**TaskCompleted stdin:** (no matcher — always fires)
```json
{
  "session_id": "abc123",
  "hook_event_name": "TaskCompleted"
}
```

**Hook response contract:**

*PreToolUse — two mechanisms:*
- **Simple (exit code):** Exit 2 to block. Stderr is fed back to Claude as feedback. Exit 0 to allow.
- **Structured JSON (exit 0):**
  ```json
  {
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "deny",
      "permissionDecisionReason": "Do not modify linter configs."
    }
  }
  ```
  Valid `permissionDecision` values: `"allow"`, `"deny"`, `"ask"` (show permission prompt).

*PostToolUse — cannot block (tool already ran).* Can inject context:
  ```json
  {
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": "Consider running /compact — you're at a good boundary point."
    }
  }
  ```

*To allow silently:* Exit 0 with no stdout.

All hook scripts parse stdin with lightweight grep/sed — no jq dependency required.

### 4. Hook Scripts (continued from Section 3)

All hooks are bash scripts in `hooks/`. All source `profile-gate.sh` and respect the profile system.

#### config-protection (PreToolUse, Bash, level 2)

Blocks Bash commands that write to linter/formatter config files. Matches patterns: `.eslintrc`, `.prettierrc`, `prettier.config`, `biome.json`, `.flake8`, `ruff.toml`, `tsconfig.json`, `.editorconfig`, `stylelint`.

Detection: checks if the command contains a write operator (`>`, `>>`, `sed`, `awk`, `cat.*EOF`, `tee`, `mv`, `cp`) targeting a config file pattern.

When triggered, exits with code 2 and writes the reason to stderr: `"Do not modify linter/formatter configs. Fix the code to comply with existing rules instead."` (Exit code 2 is the standard PreToolUse blocking mechanism.)

#### auto-format (PostToolUse, Edit|Write, level 2)

After file edits, detects the project's formatter and runs it on the changed file:

1. Check for `biome.json`/`biome.jsonc` → `npx @biomejs/biome format --write <file>`
2. Check for `.prettierrc`/`.prettierrc.json`/`prettier.config.js`/`prettier.config.ts` → `npx prettier --write <file>`
3. If `.py` file and `ruff` available → `ruff format <file>` (formats in-place by default)

All three tools exit 0 on successful formatting (even if the file changed), so they won't cause hook failures.

Silently does nothing if no formatter is detected.

#### compaction-suggestion (PostToolUse + TaskCompleted, level 2)

Smart compaction suggestion that combines tool call counting with boundary detection. Registered on two events:

1. **PostToolUse (matcher: `Bash`)** — detects git commits and passing tests
2. **TaskCompleted (no matcher)** — fires when any task is marked complete

**Counter:** Tracks tool calls in `${CLAUDE_PLUGIN_DATA}/tool-count` (persistent data dir survives plugin updates; one file per plugin install, scoped by Claude Code process).

**Threshold:** 30 tool calls minimum before considering a suggestion.

**Boundary signals** (only suggests when one is detected AND threshold is met):
- PostToolUse/Bash: command contains `git commit`
- PostToolUse/Bash: command contains a test runner (`npm test`, `pytest`, `cargo test`, `go test`)
- TaskCompleted: always a boundary signal

When triggered, resets the counter and injects context via `additionalContext`:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Good boundary point — consider running /compact to free up context before the next task."
  }
}
```

For TaskCompleted, the output uses the same structure with `"hookEventName": "TaskCompleted"`.

### 5. Project-Setup Skill

New skill at `skills/project-setup/SKILL.md`.

**Trigger:** Use when setting up a new project, initializing CLAUDE.md, or when a project has no CLAUDE.md and the user asks for help configuring it.

**Flow:**
1. Scan project to auto-detect stack (package.json, requirements.txt, Cargo.toml, go.mod, Gemfile, etc.)
2. Present findings for confirmation
3. Ask 3-4 targeted questions for things that can't be auto-detected:
   - Testing approach (unit/integration/e2e, frameworks)
   - Key conventions (naming, file organization, strong opinions)
   - Critical rules (things the AI should never do in this codebase)
4. Generate CLAUDE.md with sections:
   - Project overview (1-2 lines)
   - Tech stack
   - Critical rules
   - File structure (auto-generated from actual directory tree)
   - Key patterns (with code examples pulled from actual codebase)
   - Testing conventions
   - Available commands (detected from package.json scripts, Makefile, etc.)
5. Write to `CLAUDE.md` in project root, ask user to review

**What it does NOT do:**
- No templates or generic boilerplate — everything derived from the actual project
- No framework-specific advice (ultrapowers-dev skills handle that)
- No ongoing maintenance — one-time generator

**Preferences mode:** `project-setup preferences` re-asks and overwrites workflow preferences.

**Estimated size:** ~150-200 lines.

### 6. Persistent Workflow Preferences

**Storage:** `.claude/ultrapowers-preferences.json` in project root.

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false
}
```

**Brainstorming skill changes (SKILL.md modifications):**

The brainstorming skill's "Ask workflow preferences" step (step 4) gets replaced with conditional logic in the markdown itself:

> **Step 4 — Load or ask workflow preferences:**
> Read `.claude/ultrapowers-preferences.json` in the project root. If it exists, load the values silently and announce: "Using saved preferences (auto-commit: on/off, auto-push: on/off). Say 'change preferences' to update." If the file does not exist, ask the three preference questions as today, then write the answers to `.claude/ultrapowers-preferences.json`.

This works because skills are instructions that Claude interprets — the "read file, check if it exists" logic is executed by the agent at runtime using Read/Glob tools, not by a script. No hook or code changes needed beyond updating the SKILL.md text.

**Downstream skills** follow the same pattern: each skill that needs preferences includes an instruction to read `.claude/ultrapowers-preferences.json` and respect the values. If the file is missing, fall back to defaults (all OFF).

**Gitignore:** Preferences are personal. The project-setup skill should suggest adding `.claude/ultrapowers-preferences.json` to `.gitignore` if not already ignored.

**Skills that read preferences:**
- brainstorming (asks or loads)
- writing-plans (respects auto-commit)
- subagent-driven-development (respects auto-commit, auto-push)
- executing-plans (respects auto-commit, auto-push)
- finishing-a-development-branch (respects auto-push)

## Implementation Order

1. Hook profile system (`hooks/profile-gate.sh`)
2. New hook scripts (config-protection, auto-format, compaction-suggestion)
3. Updated `hooks.json` with PreToolUse/PostToolUse entries
4. Project-setup skill
5. Persistent preferences (storage, brainstorming skill update)
6. Update downstream skills to read preferences

## Out of Scope

- Windows support (not needed)
- Session-end hook (memory system covers this)
- Node.js hooks (bash is sufficient for these hooks)
- Continuous learning / instinct system (too complex, unclear ROI)
