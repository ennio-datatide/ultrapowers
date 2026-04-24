# Ultrapowers Release Notes

> **Note on versioning:** Ultrapowers started at 1.0.0 on 2026-03-18 with its own release line. Earlier numbers (5.x) that appeared in plugin metadata were inherited from the upstream base and are no longer used. Upstream history remains credited in the README Attribution section; this changelog covers Ultrapowers' own releases only.

## v1.2.0 (2026-04-24)

### Workflow defaults & sibling-pack integration

- **Persistent workflow preferences per repo.** `.claude/ultrapowers-preferences.json` stores `autoCommit`, `autoPush`, `commitDesignDocs`, and sibling-pack suggestion flags. Brainstorming asks once — one confirm-or-tweak prompt — then every downstream skill (writing-plans, subagent-driven-development, executing-plans, finishing-a-development-branch) respects the setting. New defaults: auto-commit on, auto-push on, design docs local.
- **Transparent sibling-pack awareness.** When `ultrapowers-dev` or `ultrapowers-business` are installed, the workflow silently references their skills in specs, audits, and plan annotations. Missing pack triggers one blocking "install / skip / stop suggesting" prompt rather than passive mention.
- **Architecture profile matching.** Two seed profiles (`marketing-content-site` with Astro/Tailwind/Netlify, `saas-product-app` with Next.js/Clerk/Stripe/Supabase/Vercel) seed one of the 2–3 approaches proposed during brainstorming's step 5. Stacks store tool identity only — deep-research resolves the current latest version at each run, so the library never goes stale.
- **Tone calibration.** First brainstorming question reads the user's comfort with technical terms (dev/PM vs creator/founder). Stored in user-level `~/.claude/ultrapowers-user-profile.json`. Every downstream prompt adapts tone; recommended tech stays best-in-class regardless.
- **Auto-pick execution approach.** Subagent-driven development is selected automatically after a plan is written — the workflow only asks when it would not pick it. `finishing-a-development-branch` auto-picks push + PR when `autoPush` is on; destructive discard always requires typed confirmation.
- **Intentional recommendations during brainstorming.** Default is neutral presentation of approaches, but recommending is valid when there's strong signal (especially for non-technical users facing decision paralysis). One line of rationale grounded in the user's stated context.
- **Visual companion removed.** Browser-based companion scripts, helper UI, and the skill section were deleted — the feature did not work well enough to justify the complexity.

### Upstream sync

- **Documented sync process.** New `docs/ultrapowers/upstream-sync-log.md` captures the `obra/superpowers` audit workflow: `git log <last-audited>..upstream/main`, classify each commit (incorporated / skipped with rationale / noted for future), cherry-pick the keepers, then `git merge -s ours upstream/main` to reset the "N commits behind" counter while preserving an auditable record.
- **Sync through upstream `6efe32c`.** 53 upstream commits reviewed; nothing incorporated this round (all "take" candidates already present via earlier cherry-picks; others inapplicable to the fork's feature set).

### Branding

- Logo, social preview image, and status badges added to the README; assets under `.github/assets/`.

---

## v1.1.0 (2026-03-23)

### Hooks ecosystem

- **Hook profile gating** — three profiles (`minimal`, `standard`, `strict`) control which hooks activate. Configured per-repo.
- **config-protection hook** — blocks edits to linter/formatter config files unless explicitly whitelisted.
- **auto-format hook** — formats files automatically after Edit/Write tool use.
- **compaction-suggestion hook** — detects natural boundaries and suggests `/compact` when the context window is approaching pressure.
- **Hook registration** — `hooks.json` now registers `PreToolUse`, `PostToolUse`, and `TaskCompleted` events.

### project-setup skill

- Interactive CLAUDE.md generator that walks users through project conventions, team workflow, and stack choices, producing a tailored CLAUDE.md for the repo.

### Workflow preferences (initial)

- Persistent preferences per repo (foundation for the 1.2.0 defaults/UX refinement).
- Downstream skills read the preferences file and respect `autoCommit` / `autoPush` / `commitDesignDocs`.

### Platform expansion

- **Copilot CLI** — tool mapping, install docs, and platform detection for session-start context injection.
- **OpenCode** — inject bootstrap as user message (not system), align skills path across bootstrap/runtime/tests.
- **Codex** — named agent dispatch documentation in `references/codex-tools.md`.

### Fixes

- `writing-skills` frontmatter docs corrected: frontmatter is `name` and `description`, not "only two fields" ambiguity.
- `package.json` version pinned to `0.1.0` independently of the plugin version in `plugin.json`.

---

## v1.0.0 (2026-03-18) — Fork launch

Ultrapowers launches as a fork of Superpowers with a research-first twist.

### Research-driven pipeline

Three new skills that run automatically after brainstorming produces an approved spec:

- **deep-research** — researches the current state of the art for every technology and pattern in the spec before implementation planning begins. Uses documentation (context7), web search, and web fetch. Cross-references multiple sources. Runs 100% of the time (cannot be skipped).
- **skills-audit** — classifies every required competency as **Covered / Stale / Missing / External**. Two-part audit: foundational development skills (language best practices, testing, design patterns, architecture, etc.) and domain competencies from the research brief.
- **skills-creation** — creates new or updates existing skills to fill gaps. Knowledge compounds across sessions; each project makes the agent smarter at the next one.

### Foundational development skills checklist

- Language-agnostic **category** skills (one per concern: testing/TDD, error-handling, design-patterns, architecture, database, caching, API design, observability, resilience, auth, background jobs, RAG/AI, CI/CD, type safety).
- Language-specific **best-practices** skills (one per language: `<language>-best-practices`).
- Guidance for when each category applies based on spec characteristics.

### Companion plugins

- **ultrapowers-dev** — development skills (language best practices, framework patterns, agentic patterns, architecture fundamentals).
- **ultrapowers-business** — business skills (marketing, SEO, copywriting, conversion, compliance, finance, sales enablement).
- Self-hosted marketplace at `ennio-datatide/ultrapowers` serves all three plugins.

### Other changes

- README rewritten to emphasize the research-driven workflow and user-controlled commits as the key differentiators from upstream.
- Deprecated legacy slash commands removed.
- Plugin homepage points to `datatide.io/ultrapowers` docs.

---

**Superpowers attribution:** the original skill-system foundation (skills framework, brainstorming, TDD, systematic-debugging, and the collaboration skills) is the work of [Jesse Vincent](https://blog.fsck.com) and the team at [Prime Radiant](https://primeradiant.com). See the README Attribution section.
