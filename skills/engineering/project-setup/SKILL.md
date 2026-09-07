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

3. Parse reply using the shared rules below (also documented in `skills/flow/grill/SKILL.md` — the two skills MUST stay in sync):

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

For projects using the ultrapowers planning pipeline (grilling → research → audit → plan), the design phase benefits from opus. Recommend (don't override) in `~/.claude/settings.json`:

```json
{
  "model": "claude-opus-4-7"
}
```

This makes the main session opus by default. The `implement` phase hands off to sonnet via sub-agent dispatch (using `agents/planner.md` opus, default-implementer sonnet, `agents/research-fetch.md` haiku) or by starting a new sonnet session.

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

## Flow setup (run once per repo)

Beyond CLAUDE.md, the build flow expects three things configured. Explore first, present what you found, confirm, then write. Lead each section with the recommended answer so the user can accept it in a word, and skip any section exploration already settled.

### A. Where tickets live

Default: **local files** under `.scratch/<feature>/issues/`. No CLI to install, no account to connect, nothing to get stuck in, and the tickets are identical either way — only the shape of the blocking edges changes.

Offer **GitHub Issues** only if a GitHub remote exists *and* the user asks for it. Record the choice in `docs/agents/issue-tracker.md`.

Add `.scratch/` to `.gitignore`.

### B. Domain docs

Default to **single-context**: one `CONTEXT.md` at the repo root plus `docs/adr/`. This fits almost every repo; write it without asking.

Offer **multi-context** (a root `CONTEXT-MAP.md` pointing at per-context `CONTEXT.md` files) only where exploration found monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field, or a populated `packages/*` each with its own `src/`.

Create neither file now. `domain-modeling` creates them lazily, when there is a first term or first decision to record.

### C. Workspace search (zvec-grep)

Optional, and it makes the agent faster and cheaper on this project. Never required, never re-prompted once declined.

1. **Detect.** Is `zg` on `PATH`? Does `.zvec-grep/` exist, and does `zg status` report the index ready?
2. **If present and indexed** — record it and move on. Nothing to do.
3. **If absent** — offer once, with the benefit in plain language and the prerequisite stated:

   > Optional: I can install a local search index for this project. It makes me noticeably faster and cheaper to run here, because I can find things without reading whole files. It needs Node 22 or newer and stays entirely on your machine. Want me to set it up? (`yes` / `no`)

   On `yes`:

   ```bash
   npm install -g @zvec/zvec-grep
   zg install --target claude --yes   # wires the MCP server and tool pre-approval
   zg index                           # builds the index for this repo
   ```

   Works on macOS, Linux and Windows. Tell the user to restart the session afterwards, since the MCP server is picked up at startup.

4. **Always add `.zvec-grep/` to `.gitignore`.** The index is machine-specific and must never be committed.
5. **Record the outcome** in `.claude/ultrapowers-preferences.json` under `workspaceSearch` (`"installed"`, `"declined"`, or `"unavailable"`) so the offer is made once, not every session.

Never index a repo without the user agreeing to it, and never rebuild or drop an existing index without being asked.

### Done

Tell the user what was configured and that they can edit `docs/agents/*.md` directly later. Re-running this skill is only needed to change where tickets live or start over.
