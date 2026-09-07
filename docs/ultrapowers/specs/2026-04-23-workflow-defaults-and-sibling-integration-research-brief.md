# Research Brief: Workflow Defaults, Sibling-Pack Integration & Architecture Presets

**Date:** 2026-04-23
**Companion spec:** `2026-04-23-workflow-defaults-and-sibling-integration-design.md`
**Purpose:** Validate implementation mechanics (how skills detect plugins, where to put config files) and run the spec's own §5.3 continual validation against the seeded architecture defaults before implementation begins.

---

## Context

The spec makes three kinds of claims that needed verification before planning:

1. **Runtime mechanics** — "a skill can tell if a sibling plugin is installed by looking at the available-skills list" — needs confirmation that this list is actually observable from inside a skill, or whether a different mechanism (filesystem, CLI) is required.
2. **Config file locations** — `~/.claude/ultrapowers-architecture-defaults.json` and `<repo>/.claude/ultrapowers-architecture-defaults.json` are claimed safe and non-reserved. Needs confirmation against Claude Code's known filename conventions.
3. **Architecture defaults freshness** — every tool pinned in the two seeded profiles (Astro 5, Next.js 16, React 19, Tailwind 4, TypeScript 5, Clerk 7, Stripe 21, Supabase 2, Mux 12, Resend 6, Neon/Drizzle, Netlify, Vercel, Vitest 4, Playwright 1.58, @testing-library/react 16) needs a currency check to avoid seeding stale recommendations on day 1.

---

## Key Findings

### Finding 1 — Plugin detection via injected available-skills list is reliable

The Claude Code runtime injects the available-skills list into every session as a `<system-reminder>` block. Each installed plugin's skills appear with a `<plugin-name>:<skill-name>` prefix where `<plugin-name>` = the `name` field in the plugin's `.claude-plugin/plugin.json`. For `ultrapowers-dev` this is `ultrapowers-dev:<skill-name>`.

Because the list is in the agent's context, a skill can instruct its invoker to scan it — **no shell, no filesystem, no tool call required**.

**Fallbacks** (only if the primary mechanism ever breaks):
- `claude plugin list` (non-interactive CLI) — returns installed plugins with version + marketplace.
- `~/.claude/settings.json` → `enabledPlugins["<plugin>@<marketplace>"]` — authoritative enablement state.
- Filesystem probe: `~/.claude/plugins/installed_plugins.json` + `~/.claude/plugins/marketplaces/`.

**Caveat on prefix stability:** the marketplace name is NOT part of the prefix — only the plugin's own `name`. If a plugin omits `plugin.json`, its prefix defaults to the directory name, which can drift from author intent. For our sibling packs (both have `name` set explicitly: `ultrapowers-dev`, `ultrapowers-business`), the prefix is stable.

### Finding 2 — Config file locations in the spec are safe

`~/.claude/` is the canonical user-level Claude Code config directory. Reserved filenames the runtime manages: `settings.json`, `settings.local.json`, `CLAUDE.md`, `CLAUDE.local.md`, `keybindings.json`, `installed_plugins.json`, `known_marketplaces.json`, `blocklist.json`, `config.json`, `history.jsonl`, `.mcp.json`. The spec's chosen names (`ultrapowers-preferences.json`, `ultrapowers-architecture-defaults.json`) are not reserved and not documented as ever being written by the runtime without explicit user action. Same holds for repo-level `.claude/`.

**Implementation note:** skills should never silently create these files — always prompt first (already in the spec).

### Finding 3 — Sub-file referencing pattern

There's no include/import mechanism for skill sub-files. Convention: put supporting files (`sibling-pack-map.md`, `architecture-profile-matching.md`) next to `SKILL.md` and reference them in prose so Claude knows when to `Read` them. Use the substitution `${CLAUDE_SKILL_DIR}/<file>` for absolute paths that don't depend on cwd. This is exactly how the existing `brainstorming` skill references `visual-companion.md` and `spec-document-reviewer-prompt.md` — pattern is already in use in this codebase.

### Finding 4 — Plugin install UX

Primary user action to install a sibling pack:
- `/plugin install ultrapowers-dev@ultrapowers` (or via interactive `/plugin` → Discover)
- Non-interactive: `claude plugin install ultrapowers-dev --scope user`
- After install: `/reload-plugins` applies without restart.
- Requires the marketplace to be added first if not Anthropic's default: `/plugin marketplace add <url|path>`.

The spec's blocking-prompt wording ("run `/plugin` to install it, then say 'installed'") matches the primary UX.

### Finding 5 — Architecture defaults audit (spec §5.3 applied to seed data)

Running the spec's own continual-validation logic against the seeded profiles **right now** so the implementation plan starts from current data, not day-one-stale data.

#### Web frameworks

| Tool | Pinned | Latest | Status | Notes |
|---|---|---|---|---|
| Astro | 5 | 6.1.9 | ⚠️ new major | Astro 6.0.0 shipped 2026-03-10; React islands still supported |
| Next.js | 16 | 16.2.4 | ✅ current | App Router standard |
| React | 19 | 19.2.5 | ✅ current | No React 20 |
| Tailwind CSS | 4 | 4.2.4 | ✅ current | Oxide engine, stable |
| TypeScript | 5.x | 6.0.3 | ⚠️ new major | TS 6.0 stable 2026-03-23; review breaking type-checker changes before bump |
| next-intl | latest | 4.9.1 | ✅ current | De-facto i18n lib |
| @vercel/analytics | 2.x | 2.0.1 | ✅ current | — |

#### Services, data, testing

| Tool | Pinned | Latest | Status | Notes |
|---|---|---|---|---|
| Clerk (@clerk/nextjs) | 7.x | 7.2.5 | ✅ current | — |
| Stripe (node SDK) | 21.x | 22.0.2 | ⚠️ new major | v22 released 2026-04-03; tightens types, bumps Node/TS targets |
| Supabase (@supabase/supabase-js) | 2.x | 2.104.1 | ✅ current | — |
| Resend | 6.x | 6.12.2 | ✅ current | — |
| Mux Node (@mux/mux-node) | 12.x | 14.0.1 | ⚠️ new major (2 skipped) | v13 and v14 shipped since 12.x pin |
| Mux player-react | 3.x | 3.11.8 | ✅ current | — |
| Neon (@netlify/neon) | 0.1.x | 0.1.2 | ✅ current | Pre-1.0 but actively maintained; for heavier use `@neondatabase/serverless` directly |
| Drizzle ORM | 0.45.x | 0.45.2 | ✅ current | — |
| Netlify | latest | latest | ✅ current | — |
| Vercel | latest | latest | ✅ current | — |
| Vitest | 4.x | 4.1.5 | ✅ current | — |
| Playwright | 1.58.x | 1.59.1 | ✅ current | 1.59 is minor — bump opportunistically |
| @testing-library/react | 16.x | 16.3.2 | ✅ current | Supports React 19 |

**Blocking issues (🚫):** none.
**Advisory updates (⚠️):** 4 — Astro 5→6, TypeScript 5→6, Stripe 21→22, Mux Node 12→14.

Per spec §5.3, `≥2 ⚠️` triggers the "update defaults?" prompt. Four show up here. This is the spec's own rule-set exercising itself; see "Recommended Approach" below for how to handle it during implementation.

---

## Recommended Approach

### For runtime mechanics (Findings 1-4)

Spec assumptions hold. Implementation plan can proceed as specified. One refinement worth baking in:

- In the `brainstorming` skill, when scanning for sibling-pack prefixes, instruct the agent to look in the **session's system-reminder context** — not to shell out or read files. This is cheaper, more reliable, and matches how `ultrapowers:using-ultrapowers` already documents the available-skills list as "listed in system-reminder messages in the conversation."
- Document the fallbacks (`claude plugin list`, `enabledPlugins`) only as a "if detection ever fails, here's how to verify" footnote — not a primary path.
- Use `${CLAUDE_SKILL_DIR}/sibling-pack-map.md` in the `Read` references — works from any cwd.

### For the architecture-defaults seed (Finding 5)

**Decision (user-confirmed):** seed with tool identity only — **no version pins**. Each deep-research run resolves current latest per tool. Spec §5.3 was updated to reflect this: validation now only blocks on 🚫 deprecations; "new major version" is dropped as a noise source (latest is always resolved fresh).

Consequence: the four ⚠️ findings above (Astro 5→6, TS 5→6, Stripe 21→22, Mux 12→14) are no longer "drift" — they're just the current latest versions that any deep-research run against these profiles will surface going forward. Zero 🚫 means nothing blocks implementation planning.

### For the implementation plan (consumed by skills-audit → writing-plans next)

- Order: workflow-prefs UX → sibling-pack detection → architecture profile matching → deep-research validation sub-step → writing-plans auto-annotation.
- The first three are independent; the last two have a natural sequencing (validation sub-step must emit output that skills-audit consumes).
- Each change is a ≤200-line edit to an existing skill or a new reference file; no large refactors.

---

## Implementation Notes

- **Reserved filenames to avoid** for any new config files: `settings.json`, `settings.local.json`, `CLAUDE.md`, `CLAUDE.local.md`, `keybindings.json`, `installed_plugins.json`, `known_marketplaces.json`, `blocklist.json`, `config.json`, `history.jsonl`, `.mcp.json`. The spec's chosen names (`ultrapowers-preferences.json`, `ultrapowers-architecture-defaults.json`) are safe.
- **Prefix observability:** available-skills list appears in `<system-reminder>` in every session. The `using-ultrapowers` meta-skill already documents this explicitly. No new mechanism needed.
- **No version pins in profile `stack`** — tool identity only. Each deep-research run resolves the current latest per tool and lists it in the research brief's "Architecture Defaults Resolved" table. Keeps the seed file future-proof.
- **No ⚠️ classification** — either a tool is current (✅, latest version noted) or deprecated (🚫, replacement suggested). Major-version bumps flow through silently as "this is the latest now."
- **Resolved table is the single source of truth** for version choices in the downstream implementation plan. `writing-plans` reads it to produce concrete `npm install` commands.

---

## Sources

- [Claude Code skills docs](https://code.claude.com/docs/en/skills) — confirms SKILL.md frontmatter, sub-file reference pattern, `${CLAUDE_SKILL_DIR}` substitution.
- [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference) — confirms `plugin-name:skill-name` prefix rule.
- [Claude Code discover-plugins docs](https://code.claude.com/docs/en/discover-plugins) — install UX (`/plugin install`, scope selection).
- [Claude Code settings docs](https://code.claude.com/docs/en/settings) — user-level `~/.claude/`, repo-level `.claude/`, reserved filenames.
- [GitHub issue: plugin commands always namespaced](https://github.com/anthropics/claude-code/issues/15882) — confirms no alias/rename, prefix = `name` field verbatim.
- Architecture audit sources: docs.astro.build, nextjs.org/blog, react.dev, tailwindcss.com/blog, platform changelogs for Clerk / Stripe / Supabase / Resend / Mux / Neon / Drizzle / Netlify / Vercel / Vitest / Playwright / Testing Library — dates and versions cross-referenced against npm registry.
- Session observation (this conversation's `<system-reminder>` block): confirms `ultrapowers-dev:*` and `ultrapowers-business:*` prefixes are observable from skill context right now.
