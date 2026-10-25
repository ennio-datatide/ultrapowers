# Ultrapowers Release Notes

> **Note on versioning:** Ultrapowers started at 1.0.0 on 2026-03-18 with its own release line. Earlier numbers (5.x) that appeared in plugin metadata were inherited from the upstream base and are no longer used. Upstream history remains credited in the README Attribution section; this changelog covers Ultrapowers' own releases only.

## v2.2.2 (2026-10-26)

- **Synced with Matt Pocock's skills** (audited through `5beb35b`; details in `docs/ultrapowers/upstream-sync-log.md`):
  - `test-driven-development` takes seams from the spec, decides missing ones through `autonomous-decision`, and notes in one line what each seam catches and misses.
  - `systematic-debugging` diffs against an untouched copy when a failing test had to be forced red.
  - `grilling` words each question so a plain `ok` accepts the recommendation.
  - `handoff` writes to `$TMPDIR` (falling back to `/tmp`, or `%TEMP%` on Windows) and reports the path.
  - `implement` and `review` dispatch their sub-agents in the foreground and wait for every report.
  - `wizard/template.sh` is upstream's current version.
- **`visual-design` ignores Impeccable's own update notices**, since its version comes pinned with ultrapowers. Tested in a fresh session: the grill shapes the page with Impeccable, then shows three directions plus the conventional one and stops at the checkpoint without building.

## v2.2.1 (2026-10-25)

- **Impeccable is declared as a dependency in the marketplace entry only, not in `plugin.json`.** A dependency in `plugin.json` that is missing stops ultrapowers from loading, and `claude plugin update` from 2.1.1 does not install a newly added one. A fresh install still brings Impeccable; an update that lacks it keeps working, and `visual-design` and `claude-code-setup` install it the first time it is needed.

## v2.2.0 (2026-10-25)

### Design is Impeccable, installed with ultrapowers

- **One plugin to install.** Impeccable is listed in the ultrapowers marketplace (fetched from its own repository, pinned to commit `3671d50`, version 4.7.1) and declared as a dependency, so installing or updating ultrapowers installs it too.
- **The user chooses the design direction.** `visual-design` hands each design task to Impeccable and makes the choice of direction a sanctioned checkpoint: three options, the user picks, nothing is built before. `autonomous-decision` and `no-permission-asks` say so.
- **One set of design files.** The root `PRODUCT.md` and `DESIGN.md` that Impeccable keeps; `docs/ultrapowers/design/` is merged into them and retired.
- **`design-review` runs Impeccable's audit, critique, clarify, harden and polish**, still reported rather than silently fixed.
- **Removed:** the condensed copies of Impeccable's material (`MOVES.md`, `AUDIT.md`, `HARDEN.md`).
- **claude-code-setup** no longer installs Impeccable from its own marketplace. It checks the copy that comes with ultrapowers and turns off an older second copy (`impeccable@impeccable`) so skills do not load twice.

## v2.1.1 (2026-10-17)

### claude-code-setup

- **Project tokens live in the project's `.env`, loaded, never opened.** The personal instructions now tell Claude to load `.env` into the command that needs it (`set -a; source .env; set +a`) without showing the values, and to save a token pasted in the chat into `.env` instead of refusing it. The secrets tool with an approval prompt stays for the most sensitive keys. The block on reading `.env` files is unchanged.
- **Plainer words.** Claude prefers the everyday word and explains each technical term the first time it comes up.

## v2.1.0 (2026-10-16)

### Recommended Claude Code setup

- **New `claude-code-setup` skill** (`skills/productivity/`). Takes a new macOS or Windows computer from "Claude Code is installed" to "ready to build": basic tools, safe storage for secrets with an approval prompt on every use, safety defaults merged into `~/.claude/settings.json`, personal instructions in `~/.claude/CLAUDE.md`, and the projects folder. Safe to re-run.
- **Installs the rest of the recommended plugins.** `ultrapowers-dev`, `ultrapowers-business` and the [Impeccable](https://github.com/pbakaus/impeccable) design plugin, each skipped when already present. ultrapowers itself is never reinstalled from inside its own skill.
- **The recommended configuration, merged without overriding anything already chosen.** Claude Code starts in auto mode with the block and ask rules for secrets, `.env` files, credentials, force pushes and deletes kept in place; fullscreen display, prose wrapped at 100 columns, dynamic workflows and phone notifications on.
- **A cross-platform status line** (`statusline.mjs`, Node only): session, folder, git branch with staged, changed and conflicted counts, model, and a context bar that turns amber at 70% and red at 85%.
- **The "ultrapowers" theme**, shipped by the plugin in `themes/`, keeps the user's messages, the dimmed working steps and Claude's answers clearly apart. The setup selects it (`custom:ultrapowers:ultrapowers`) only when no theme is set.
- **No-prompts mode stays a deliberate choice.** The personal instructions explain that Claude Code cannot switch itself into it: the user restarts with `claude --dangerously-skip-permissions`, only inside a project folder with git, never the home folder, and the block rules still protect secrets and force pushes.
- **GitHub login can wait.** The git identity is always set; `gh auth login` is optional and does not block the setup.

---

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

Ultrapowers launches with a research-first workflow.

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

