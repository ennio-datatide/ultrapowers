---
name: project-setup
description: "Use when setting up a new project, initializing CLAUDE.md, or when a project has no CLAUDE.md and the user asks for help configuring it"
---

# Project Setup

## Overview

Generate a tailored CLAUDE.md for the current project by scanning the codebase and asking targeted questions, or update workflow preferences when invoked in Preferences Mode.

**Announce at start:** "I'm using the project-setup skill to configure this project."

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

2. **Present findings** — per `ultrapowers:autonomous-decision`, when detection is unambiguous (single-stack repo with all the right manifest signals) skip confirmation and announce the call ("detected Next.js / TS-React project — proceeding"). When detection is ambiguous (polyglot, missing key files, conflicting signals), show what was detected and ask for confirmation:
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

When invoked as "project-setup preferences", "change my workflow preferences", or `change prefs`:

1. Read current `.claude/ultrapowers-preferences.json` if it exists.
2. Show current values in the prompt itself:

   > "Current workflow prefs: auto-commit {on|off}, auto-push {on|off}, commit design docs {on|off}, suggest `ultrapowers-dev` {on|off}, suggest `ultrapowers-business` {on|off}. Reply `ok` to keep, or tell me what to change (e.g., `no auto-push`, `stop suggesting dev`)."

3. Parse reply using the shared rules below (also documented in `skills/brainstorming/SKILL.md` — the two skills MUST stay in sync):

   **Shared workflow-prefs parser:**

   | User reply | Resulting change |
   |---|---|
   | `ok` / `yes` / `accept` / empty | keep all current values |
   | `no auto-commit` / `manual commits` | `autoCommit: false` |
   | `no auto-push` / `manual push` | `autoPush: false` |
   | `commit docs` / `include design docs` | `commitDesignDocs: true` |
   | `all off` | `autoCommit: false`, `autoPush: false`, `commitDesignDocs: false` |
   | `all on` | `autoCommit: true`, `autoPush: true`, `commitDesignDocs: true` |

   **Preferences-Mode-only extensions:**

   | User reply | Resulting change |
   |---|---|
   | `stop suggesting dev` / `no dev suggestions` | `suggestSiblingPacks.dev: false` |
   | `stop suggesting business` / `no business suggestions` | `suggestSiblingPacks.business: false` |
   | `resume suggesting dev` / `suggest dev again` | `suggestSiblingPacks.dev: true` |
   | `resume suggesting business` / `suggest business again` | `suggestSiblingPacks.business: true` |
   | `reset sibling suggestions` | both `suggestSiblingPacks` flags to `true` |

   Modifiers combine (e.g. `no auto-push, stop suggesting dev` → apply both). If the reply is ambiguous, ask one targeted follow-up rather than guessing.

4. Write updated values to `.claude/ultrapowers-preferences.json`. Preserve keys the user didn't change.
5. Suggest adding to `.gitignore` if not already ignored.

## Recommended Model Configuration

For projects using the ultrapowers planning pipeline (brainstorming → research → audit → plan), the design phase benefits from opus. Recommend (don't override) in `~/.claude/settings.json`:

```json
{
  "model": "claude-opus-4-7"
}
```

This makes the main session opus by default. Execution phase (`subagent-driven-development`, `executing-plans`) hands off to sonnet via subagent dispatch (using `agents/planner.md` opus, default-implementer sonnet, `agents/research-fetch.md` haiku) or by starting a new sonnet session.

Do **not** modify the user's settings.json from this skill — recommend, don't override.

## Principles

- **Derive, don't template** — every section comes from the actual project, not boilerplate
- **One question at a time** — don't overwhelm
- **Keep it lean** — CLAUDE.md is always in context, so shorter is better
- **No framework advice** — ultrapowers-dev skills handle best practices
- **Decide autonomously** — per `ultrapowers:autonomous-decision`, infer from manifest signals before asking

## Common Mistakes

- **Writing a boilerplate CLAUDE.md** instead of deriving sections from the actual codebase. If the generated file could apply to any project, it's wrong.
- **Asking more than one question at a time** — breaks the principle above and overwhelms the user. Split compound questions into a sequence.
- **Skipping the "ask user to review" step** — CLAUDE.md lands in context every turn. If anything is wrong, the user will catch it now or fight it all week.
