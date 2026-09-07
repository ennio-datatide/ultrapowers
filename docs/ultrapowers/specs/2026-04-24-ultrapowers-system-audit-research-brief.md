# Ultrapowers System Audit — Research Brief

**Date:** 2026-04-24
**Feeds:** skills-audit, then writing-plans, then the audit itself
**Spec:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md`
**Research method:** three parallel research subagents (Claude Code ecosystem / non-CC harnesses / Gemini CLI) + inline read of local `writing-skills` skill.

## Context

We're about to audit the Ultrapowers plugin against current standards. The audit methodology is already designed. What the auditors (dispatched subagents) need is **current ground truth** for every contract they'll check against — plugin manifests, hook schemas, skill frontmatter conventions, harness-specific formats. Without this, the audit will grade the repo against our own internal, possibly stale rubric.

The research below captures "what is current as of 2026-04-24." Everything here is a yardstick the audit will measure the plugin against. It is not the audit itself.

## Key findings by area

### 1. Claude Code plugin manifest (`plugin.json`, `marketplace.json`)

**Current canonical fields (April 2026):**

- `plugin.json` required: `name` only (kebab-case, `^[a-z0-9]+(-[a-z0-9]+)*$`). CLI validator requires `version` in practice despite docs calling it optional.
- Optional: `version`, `description`, `author` (object with required `name`), `homepage`, `repository` (string or object), `license` (SPDX), `keywords`, `category`, `tags`, `commands`, `agents`, `skills`, `outputStyles`, `hooks`, `mcpServers`, `lspServers`, `settings`.
- Component path rules: `commands` / `skills` / `outputStyles` / `hooks` accept a relative path starting with `./` or an **array** of such paths. `agents` accepts **file paths only, not directories**. `hooks` and `mcpServers` can also be inline objects.
- Auto-discovery: when the manifest omits component paths, Claude Code auto-discovers standard dirs (`skills/`, `agents/`, `commands/`, `hooks/`).
- `marketplace.json` required: `name`, `owner` (object with required `name`), `plugins` (array). Plugin entries require `name` and `source`.

**Deltas from our current audit rubric:**

- We assumed a minimal, single-field-style schema. In practice the surface area is larger. Our audit should verify field presence but **not** flag present-but-optional fields as noise.
- Anthropic's own marketplace.json still references a broken schema URL (`anthropic.com/claude-code/marketplace.schema.json`, 404 per issue #9686). Community de-facto schema: `hesreallyhim/claude-code-json-schema`. Audit finding worth checking: does our marketplace.json point at a working schema URL?

**Sources:** [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference), [hesreallyhim plugin.schema.json](https://github.com/hesreallyhim/claude-code-json-schema/blob/main/schemas/plugin.schema.json), [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces).

### 2. Claude Code hooks — event names and handler formats

**Current event list (28+ events, much larger than "the common 8"):**

- Session: `SessionStart`, `SessionEnd`
- Per-turn: `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `StopFailure`
- Tool loop: `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`
- Agent/Task: `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`
- Context/config: `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`
- Compaction: `PreCompact`, `PostCompact`
- MCP / notification: `Elicitation`, `ElicitationResult`, `Notification`
- Worktree: `WorktreeCreate`, `WorktreeRemove`

**Schema:** `{hooks: {EventName: [{matcher, hooks: [{type, ...}]}]}, disableAllHooks}`. Handler `type` values: `command`, `http`, `mcp_tool`, `prompt`, `agent`. Common handler fields: `if`, `timeout`, `statusMessage`, `once`. Command handlers also support `async`, `asyncRewake`, `shell: "bash"|"powershell"`.

**Breaking / deprecated patterns the audit should check for:**

- **Top-level `decision` / `reason` in PreToolUse is deprecated.** Use `hookSpecificOutput.permissionDecision` with values `allow | deny | ask | defer`. `"approve"` / `"block"` still work for back-compat but are legacy.
- **New `"defer"` outcome** requires Claude Code v2.1.89+.
- **Precedence when hooks conflict:** `deny > defer > ask > allow`.
- New env vars for hook scripts: `$CLAUDE_PLUGIN_ROOT`, `$CLAUDE_PLUGIN_DATA`, `$CLAUDE_ENV_FILE`, `$CLAUDE_CODE_REMOTE`.

**Sources:** [Hooks reference](https://code.claude.com/docs/en/hooks), [plugin-dev hook-development SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md).

### 3. Skills authoring — current Anthropic guidance

Anthropic published an official skill-authoring best-practices doc at `platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices`. This is the authoritative rubric source and didn't exist at our training cutoff.

**Frontmatter current canonical fields:**

- **Required:** `name` (≤64 chars, lowercase+digits+hyphens, no `anthropic` / `claude`), `description` (≤1024 chars, non-empty, third person).
- **Claude Code extensions (optional):** `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context: fork`, `agent`, `hooks`, `paths`, `shell`.
- Combined `description` + `when_to_use` capped at **1,536 characters** in skill listing — front-load the key use case.
- Body cap for optimal performance: **under 500 lines**.

**Description conventions (both our rubric and Anthropic's agree):**

- Third person.
- Specific trigger keywords + when-to-use symptoms.
- Do NOT summarize the workflow in the description — Claude may follow the description and skip the body.

**Content lifecycle (new):** Invoked SKILL.md enters conversation as a single message that persists for the session. Auto-compaction re-attaches the most recent invocation of each skill with a **25k-token budget across all re-attached skills**, 5k per skill cap.

**Community failure modes (cross-confirmed across 4+ sources):**

1. Token budget truncation (~15k char budget at session start, default; scales to 1% of context, fallback 8k). Verbose descriptions get silently truncated.
2. Vague / broad trigger descriptions.
3. "Do X" without success criteria — leads to checklist drift.
4. Deeply nested references — Claude uses `head -100` on reference files inside reference files, getting partial content. Keep refs one level deep from SKILL.md.
5. Context drift in long sessions (60–70% mark) — the "agent dumb zone." Re-invoke key skills after compaction.
6. Missing platform adaptation — skills assuming bash break on Windows; skills assuming Claude Code hook shape break on other harnesses.
7. Missing or inconsistent frontmatter POV.
8. Over- or under-specifying discipline vs guidance skills.
9. Time-sensitive content baked into skill body.
10. Skill silos / no cross-skill workflow.

**Sources:** [Anthropic best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [Claude Code skills reference](https://code.claude.com/docs/en/skills), [anthropics/skills skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md), [DEV: Why CC Skills Don't Trigger](https://dev.to/lizechengnet/why-claude-code-skills-dont-trigger-and-how-to-fix-them-in-2026-o7h), [DEV: Stop Skill Drift](https://dev.to/akari_iku/how-to-stop-claude-code-skills-from-drifting-with-per-step-constraint-design-2ogd), [DEV: pulser diagnostic findings](https://dev.to/thestack_ai/i-built-a-diagnostic-cli-for-claude-code-skills-heres-what-8-rules-caught-that-i-missed-4142).

### 4. obra/superpowers — current state (upstream)

Current version: **v5.0.7** (2026-03-31).

**Structural changes that affect our audit rubric:**

- **v5.0 skills repo separation.** All skills moved to `obra/superpowers-skills`. The plugin is now a lightweight shim that clones and auto-updates skills on session start. An audit rubric that scans `skills/` inside the plugin repo will find the Superpowers plugin nearly empty. **Ultrapowers is still monolithic** — ships skills in-repo. This is a deliberate divergence, not a bug, but the audit should flag that it's a divergence.
- **Subagent-driven review loops eliminated** (v5.0.4–v5.0.6). Upstream replaced them with inline self-review checklists; max iterations cut from 5 to 3. **Ultrapowers still uses subagent-driven code-reviewer**. Also a deliberate divergence.
- **Session-start hook is dual-emit and `async: false`.** Emits both Claude Code (`hookSpecificOutput.additionalContext`) and platform-neutral (`additional_context`) shapes. v5.0.3 swapped bash heredoc → `printf` and `#!/bin/bash` → `#!/usr/bin/env bash` (macOS bash 5.3+ hang fix). v5.0.7 adds `COPILOT_CLI` detection. **Our session-start hook should be compared against this.**
- **Multi-platform manifests.** Upstream ships `hooks/hooks-cursor.json` (camelCase, `version: 1`) and `gemini-extension.json` at repo root. Cursor plugin hooks coexist with Claude hooks.
- **Slash commands deprecated.** `/brainstorm`, `/write-plan`, `/execute-plan` now emit deprecation notices pointing to the corresponding skills. Brainstorming skill enforces hard gates + graphviz flow.
- **Brainstorm server** moved to `skills/brainstorming/scripts/`; dropped npm deps (Express/Chokidar/ws) for built-ins; renamed `.js` → `.cjs` (Node 22 ESM).

**Implication for audit:** divergences from upstream are deliberate product decisions (research pipeline, subagent-driven review, monolithic skills). The audit should **not** flag divergence as a finding per se — but should flag any place where we *claim* to be upstream-aligned and aren't, and any place where upstream has a bug fix we missed (e.g., the bash 5.3+ hang).

**Sources:** [obra/superpowers RELEASE-NOTES](https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md), [releases](https://github.com/obra/superpowers/releases), [fsck.com v5.0.7 blog](https://blog.fsck.com/releases/2026/03/31/superpowers-v5-0-7/).

### 5. Non-Claude-Code harnesses — current ground truth

#### 5a. Codex (OpenAI)

- **Current plugin dir convention:** `.codex-plugin/` with a `plugin.json` manifest.
- **Likely audit finding:** Ultrapowers ships `.codex/` (just `INSTALL.md`), not `.codex-plugin/`. If we claim Codex plugin support, this is a bug. If we only claim Codex CLI installation docs, it's naming confusion — the dir should be renamed or the claim scoped.
- **Tool-name mapping:** obsolete. Codex now consumes MCP tools natively (`.mcp.json`). Our `references/codex-tools.md` translation shim is dead weight as an active mapping layer — may still have value as documentation of Claude Code tool vocabulary, but not as a runtime translation.
- **Hooks stable as of Codex 0.124.0** (2026-04-23). Observe MCP tools + `apply_patch` + long-running Bash.
- **Marketplace:** `codex marketplace add` with GitHub / git / local / URL sources as of 0.121.0.
- **Skills:** Codex has its own `SKILL.md`-based skill format with progressive disclosure. Discovery walks `.agents/skills` → parents → `.agents/skills/` tree. Bundled-in-plugin skills sit at `./skills/<name>/SKILL.md`.

**Sources:** [Codex plugins](https://developers.openai.com/codex/plugins/build), [Codex skills](https://developers.openai.com/codex/skills), [Codex changelog](https://developers.openai.com/codex/changelog).

#### 5b. Cursor

- **Plugin format is new (Cursor 2.4, 2026-01-22).** `github.com/cursor/plugins` (MIT, Cursor org, pre-1.0 — no tagged releases yet).
- **Manifest:** `.cursor-plugin/plugin.json` with `name`, `version`, `description`, `author`, plus paths to `commands`, `skills`, `rules`. Marketplace adds `.cursor-plugin/marketplace.json`.
- **Two parallel mechanisms coexist:**
  - **Rules (MDC):** `.cursor/rules/*.mdc` with YAML frontmatter. Always-on context. Legacy root `.cursorrules` still works but is superseded by the directory format.
  - **Skills (new):** `SKILL.md` with `name` / `description` frontmatter, scoped at `.cursor/skills/` (repo) or `~/.cursor/skills/` (user). Slash-command invocation + automatic discovery.
- **Ultrapowers status:** ships `.cursor-plugin/plugin.json`. Audit should verify the manifest validates against the current (evolving) `cursor/plugins` schema and that skill files ship in an activation-compatible path.

**Sources:** [cursor/plugins](https://github.com/cursor/plugins), [Cursor 2.4 changelog](https://cursor.com/changelog/2-4), [Notion's cursor plugin example](https://github.com/makenotion/cursor-notion-plugin).

#### 5c. OpenCode (sst/opencode)

- **No `plugin.json` manifest.** Plugins are JS/TS modules exporting a `Plugin` function. Loaded from `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global), or declared as npm packages in `opencode.json`.
- **Agents** (not "skills") are Markdown files with YAML frontmatter: `description` (required), `mode` (`primary` | `subagent` | `all`), `model`, `temperature`, `permission`, `color`, `hidden`. Live at `.opencode/agents/` (project) or `~/.config/opencode/agents/` (global).
- **You cannot ship a bundle manifest.** You ship either a JS/TS plugin registered in `opencode.json`, or loose agent `.md` files.
- **Ultrapowers status:** `.opencode/` contains `INSTALL.md` and a `plugins/` dir. Audit should verify what's in `plugins/` is a valid plugin module or accept that this is an install-docs-only integration.

**Sources:** [OpenCode plugins](https://opencode.ai/docs/plugins/), [OpenCode agents](https://opencode.ai/docs/agents/), [sst/opencode](https://github.com/sst/opencode).

### 6. Gemini CLI extensions

- **Manifest:** `gemini-extension.json` at extension root. Required: `name` (lowercase, dash-separated, matches dir name), `version` (semver). Optional: `description`, `mcpServers`, `contextFileName` (default `GEMINI.md`), `excludeTools`, `migratedTo`, `plan.directory`, `settings[]`, `themes[]`.
- **GEMINI.md** is a prompt-context file, not a manifest. Three roles: extension context file (injected when extension is active), project/workspace context (walks hierarchy), user-customizable name (settings.json `context.fileName` accepts arrays like `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]` for agent-neutral naming).
- **Skills are first-class.** `SKILL.md` with `name` / `description` frontmatter. Discovery tiers: workspace (`.gemini/skills/` or `.agents/skills/`) > user (`~/.gemini/skills/` or `~/.agents/skills/`) > extension (`skills/` inside an installed extension). Within a tier, `.agents/skills/` beats `.gemini/skills/` — the `.agents/` alias is the cross-agent compatibility path.
- **Skill activation mechanism:** `activate_skill` tool with user consent flow. Plan Mode requires explicit confirmation (PR #24946).
- **Convention-based subdir discovery:** `commands/`, `hooks/`, `skills/`, `agents/`, `policies/` are discovered by directory presence — NOT declared in the manifest.
- **Tool-name mapping — no official translation layer.** Gemini uses `snake_case`:

  | Claude Code | Gemini CLI |
  | --- | --- |
  | `Read` | `read_file` |
  | `Write` | `write_file` |
  | `Edit` | `replace` |
  | `Bash` | `run_shell_command` |
  | `Grep` | `grep_search` |
  | `Glob` | `glob` |
  | `WebFetch` | `web_fetch` |
  | `WebSearch` | `web_search` |
  | `TodoWrite` | `todos` |
  | `Task` / subagent | `invoke_subagent` |

  Skills that hardcode Claude Code tool names (e.g., "use the `Read` tool") will typically still work because the model can translate, but `excludeTools` manifest entries and any command-generation logic that names tools explicitly will silently fail on Gemini. Portable phrasing: "read the file", "run the shell command" — describe the action, not the tool.

- **Ultrapowers status:** ships `GEMINI.md` + `gemini-extension.json` at repo root. Audit should verify: manifest fields are current; tool names in skill bodies are portable or have an explicit translation reference; skills are discoverable via one of the blessed tier paths.

**Sources:** [gemini-cli extensions reference](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/extensions/reference.md), [skills docs](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md), [activate_skill tool](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/tools/activate-skill.md), [system-prompt tool-name interpolation](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/system-prompt.md).

### 7. Our internal `writing-skills` rubric (inline read)

Our `skills/writing-skills/SKILL.md` prescribes:

- **TDD discipline for skill creation.** "Iron Law: no skill without a failing test first." Pressure scenarios with subagents are the test case; SKILL.md is the production code.
- **Description rules match Anthropic's official guidance:** third person, starts with "Use when...", describes triggering conditions only, does NOT summarize workflow.
- **Word-count targets:** getting-started workflows <150 words; frequently-loaded skills <200 words; other skills <500 words.
- **Flat namespace** — all skills in one searchable namespace.
- **File organization** — SKILL.md + optional supporting files (heavy reference 100+ lines, reusable tools).
- **Cross-reference pattern:** `**REQUIRED SUB-SKILL:** Use ultrapowers:test-driven-development` — no `@` links (which force-load and burn context).
- **Anti-patterns:** narrative storytelling, multi-language dilution, code in flowcharts, generic labels.

**Delta with Anthropic's published guidance:** our rubric is stricter on description purity ("no workflow summary ever") and enforces a TDD discipline that Anthropic's doc doesn't mention. These are additive, not conflicting. The audit should use our `writing-skills` rubric as the primary yardstick and cross-check against Anthropic's for additional fields we might miss (`when_to_use`, `allowed-tools`, `context: fork`, etc.).

## Recommended approach for the audit

Given the research, the audit lanes should be primed as follows:

### Lane A (skill quality)

Use two-layer rubric: our `writing-skills` rules as primary + Anthropic's official checklist as secondary. Verify:

- Required frontmatter (`name`, `description`) present and well-formed per both rubrics.
- Description starts with "Use when...", third person, no workflow summary.
- Optional CC-specific frontmatter fields used correctly when present (`when_to_use`, `allowed-tools`, `model`, `effort`, `context: fork`).
- Body ≤500 lines; no skills over 2000 words (likely-truncated).
- No deeply nested references (references inside references).
- Cross-references use `**REQUIRED SUB-SKILL:**` style; no `@` links.
- Platform adaptation: does the skill assume Claude Code tool names? If yes, is that claim qualified, or does the skill claim cross-harness support without a translation story?

### Lane B (workflow coverage)

Add these probes informed by research:

- Does our skill graph still make sense against Anthropic's current recommended flow patterns?
- Does README align with the actual skill graph? (research found this is a top source of divergence)
- Does our deliberate divergence from upstream Superpowers (monolithic skills, subagent review) break any cross-reference or claim?

### Lane C.1 (Claude Code dogfood)

No change. Fixed scenario remains as specified in the design.

### Lane C.2 (non-CC harness parity)

Use the research's harness-specific expected shape as the yardstick:

- **Codex:** expect `.codex-plugin/plugin.json`, not `.codex/`. Current state (`.codex/INSTALL.md` only) is either a naming bug or an "install docs only" integration — audit should force this to a decision.
- **Cursor:** expect `.cursor-plugin/plugin.json` matching `cursor/plugins` schema + skills discoverable at `.cursor/skills/`. Verify both pieces.
- **OpenCode:** there is no bundle manifest. Expect either a JS/TS `Plugin` module or loose agent `.md` files. `.opencode/INSTALL.md` alone may be an install-docs-only integration — force to a decision.
- **Gemini:** `gemini-extension.json` + `GEMINI.md` + (optionally) `skills/` discoverable via tier paths. Verify manifest field currency. Check skill bodies for hardcoded Claude Code tool names.

## Implementation notes

- **Version context for findings:** Claude Code v2.1.89+ (defer hook outcome), Codex 0.124.0 (hooks stable), Cursor 2.4 (skills), Gemini CLI v0.39.0 (April 2026), Superpowers v5.0.7. Any finding that depends on a feature newer than these should say so in the evidence line.
- **Gotchas for subagent dispatch:**
  - Research showed the Gemini tool-name translation table is not documented anywhere the audit can look up in our repo. The audit's Gemini lane needs access to the table above (include it verbatim in the lane C.2 subagent prompt).
  - Codex manifest dir convention (`.codex-plugin/` vs `.codex/`) is a non-obvious trap. Include this as a specific check.
  - OpenCode having no manifest is counter-intuitive for anyone who assumes harness parity. Subagent should be told explicitly.

## Deltas from training memory (flagged)

- Hook event list is ~3× larger than training memory would suggest. Audit rubric must use the current 28+ event list, not the "common 8."
- PreToolUse output format shifted — `hookSpecificOutput.permissionDecision` is current; top-level `{decision, reason}` is deprecated but still works.
- Anthropic now has an official skill-authoring best-practices page — this is a new authoritative source.
- Superpowers is now at v5.0.7 with skills split into a separate repo — rubric assuming "Superpowers is monolithic" is stale.
- Codex convention is `.codex-plugin/`, not `.codex/`.
- Cursor got Skills in v2.4 (Jan 2026) — previously only Rules (MDC).
- Gemini's `activate_skill` tool exists as a first-class mechanism — convergence with Claude Code's Skill model is stronger than training memory suggested.
- `.agents/skills/` is the cross-agent compatibility path recognized by both Codex and Gemini.

## Sources (aggregated)

**Anthropic / Claude Code:**
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/skills
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://github.com/anthropics/claude-code
- https://github.com/anthropics/skills
- https://github.com/hesreallyhim/claude-code-json-schema

**obra/superpowers:**
- https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md
- https://github.com/obra/superpowers/releases
- https://blog.fsck.com/releases/2026/03/31/superpowers-v5-0-7/

**Codex:**
- https://developers.openai.com/codex/plugins/build
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/changelog
- https://github.com/openai/skills

**Cursor:**
- https://github.com/cursor/plugins
- https://cursor.com/changelog/2-4
- https://github.com/makenotion/cursor-notion-plugin

**OpenCode:**
- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/agents/
- https://github.com/sst/opencode

**Gemini CLI:**
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/extensions/reference.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/extensions/writing-extensions.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/creating-skills.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/gemini-md.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/system-prompt.md
- https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/tools/activate-skill.md

**Community (skill failure modes):**
- https://dev.to/lizechengnet/why-claude-code-skills-dont-trigger-and-how-to-fix-them-in-2026-o7h
- https://dev.to/akari_iku/how-to-stop-claude-code-skills-from-drifting-with-per-step-constraint-design-2ogd
- https://dev.to/thestack_ai/i-built-a-diagnostic-cli-for-claude-code-skills-heres-what-8-rules-caught-that-i-missed-4142
- https://dev.to/thegdsks/claude-code-felt-off-for-a-month-here-is-what-broke-751
