## Research Brief: Hooks Ecosystem & Project Setup

### Context
Adding PreToolUse, PostToolUse, and TaskCompleted hooks to ultrapowers (currently only has SessionStart). Also adding a project-setup skill for CLAUDE.md generation and persistent workflow preferences.

### Key Findings

**Claude Code Hooks API (23 events total):**
- PreToolUse: receives full JSON on stdin with `tool_name`, `tool_input`, `session_id`, `cwd`, `tool_use_id`. Blocks via exit code 2 (stderr = feedback) or structured JSON with `permissionDecision: "deny"`. Can also modify input via `updatedInput` or inject context via `additionalContext`.
- PostToolUse: same shape plus `tool_response` (not `tool_output`). Cannot block (tool already ran). Can inject `additionalContext` via `hookSpecificOutput`.
- TaskCompleted: fires when any task is marked complete. No matcher needed. Ideal boundary signal for compaction.
- Matchers are regex against tool_name (case-sensitive). Empty/`"*"`/omitted = match all.
- `async: true` = fire-and-forget, no blocking. Default timeout 600s for command hooks.
- `${CLAUDE_PLUGIN_ROOT}` = plugin install dir (changes on update). `${CLAUDE_PLUGIN_DATA}` = persistent data dir (survives updates).

**Formatter CLIs (all safe for hooks — exit 0 on success):**
- Biome: `npx @biomejs/biome format --write <file>` (scoped package `@biomejs/biome`, not bare `biome`). Config: `biome.json`, `biome.jsonc`.
- Prettier: `npx prettier --write <file>`. Config: `.prettierrc`, `.prettierrc.json`, `prettier.config.js`, `prettier.config.ts`, and many more variants.
- Ruff: `ruff format <file>` (in-place by default, no `--write` needed). Config: `.ruff.toml`, `ruff.toml`, `pyproject.toml [tool.ruff]`.

### Recommended Approach
- Use exit code 2 for PreToolUse blocking (simpler than structured JSON)
- Use `additionalContext` for PostToolUse suggestions (compaction)
- Use `TaskCompleted` event for boundary detection instead of parsing TaskUpdate through PostToolUse
- Use `${CLAUDE_PLUGIN_DATA}` for persistent counter storage instead of `/tmp`
- Keep all hooks as bash scripts — the API is simple enough

### Implementation Notes
- The `run-hook.cmd` polyglot wrapper needs to dispatch to new hook scripts (currently only handles `session-start`)
- PostToolUse hooks cannot block — design compaction-suggestion as advisory only
- `async: true` means the hook result is ignored — only use for auto-format where we don't need feedback
- Biome's npm package is scoped (`@biomejs/biome`), not bare `biome`

### Sources
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — complete event list, stdin schema, response contract
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) — practical examples, env vars
- [Hook Development SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) — plugin-specific patterns
- Biome docs — CLI format command, package name
- Prettier docs — CLI write mode, config file resolution
- Ruff docs — format subcommand, exit codes
