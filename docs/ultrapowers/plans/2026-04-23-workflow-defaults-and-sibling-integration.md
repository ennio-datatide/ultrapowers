# Workflow Defaults, Sibling-Pack Integration & Architecture Presets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultrapowers:subagent-driven-development (recommended) or ultrapowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `ultrapowers` base-plugin skills so workflow preferences default to Ennio-biased values with a single confirm-or-tweak prompt, sibling plugins (`ultrapowers-dev`, `ultrapowers-business`) are detected transparently and referenced in specs/plans, and user-level architecture presets drive tool suggestions that deep-research revalidates on every run.

**Architecture:** Pure markdown + JSON edits. No new code, no test harness (manual smoke tests per spec §8). Edits are scoped to 8 existing skill files + 2 new reference files next to `skills/brainstorming/SKILL.md` + 1 user-level config seed in `~/.claude/`. Workflow prefs file gets an additive schema extension (`suggestSiblingPacks` object) — fully backward-compatible.

**Tech Stack:** Markdown (SKILL.md frontmatter + prose), JSON (config files). No runtime dependencies introduced.

**Companion docs:**
- Spec: `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-design.md`
- Research brief: `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-research-brief.md`
- Skills audit: `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-skills-audit.md`

**Skills referenced during implementation:**
- `@ultrapowers:writing-skills` — every SKILL.md edit
- `@ultrapowers:verification-before-completion` — before checking off any smoke test
- `@ultrapowers:finishing-a-development-branch` — after Task 14

**Reserved filenames to avoid (per research brief §Finding 2):**
`settings.json`, `settings.local.json`, `CLAUDE.md`, `CLAUDE.local.md`, `keybindings.json`, `installed_plugins.json`, `known_marketplaces.json`, `blocklist.json`, `config.json`, `history.jsonl`, `.mcp.json`. The names this plan uses (`ultrapowers-preferences.json`, `ultrapowers-architecture-defaults.json`, `sibling-pack-map.md`, `architecture-profile-matching.md`) are all clear.

**Workflow preferences for this plan's execution:**
The repo currently has no `.claude/ultrapowers-preferences.json`, so per existing skill rules commits are OFF by default. Task 0 creates the file with the new defaults (auto-commit on, auto-push on, commit design docs off), so subsequent task commit steps are enabled. If the implementer wants manual commits, they can edit the file before proceeding.

---

## File Inventory

| Path | Action | Purpose |
|---|---|---|
| `.claude/ultrapowers-preferences.json` | Create | Repo prefs with new defaults (this plan's own execution uses these) |
| `skills/brainstorming/SKILL.md` | Modify | New prefs UX; profile matching + sibling-pack scan steps; schema extension |
| `skills/brainstorming/sibling-pack-map.md` | Create | Keyword → skill map (from spec §5.2) |
| `skills/brainstorming/architecture-profile-matching.md` | Create | Profile matching rules + pseudocode |
| `skills/skills-audit/SKILL.md` | Modify | Recognize `ultrapowers-dev:*` / `ultrapowers-business:*` prefixes; seed from profile skills |
| `skills/deep-research/SKILL.md` | Modify | "Resolve architecture defaults" sub-step + research-brief section |
| `skills/writing-plans/SKILL.md` | Modify | Auto-annotate tasks with `@<skill-name>` from skills-audit output |
| `skills/project-setup/SKILL.md` | Modify | Preferences Mode uses the new confirm-or-tweak prompt |
| `skills/executing-plans/SKILL.md` | Verify (no edit expected) | Confirm extended prefs shape is read gracefully |
| `skills/subagent-driven-development/SKILL.md` | Verify (no edit expected) | Same |
| `skills/finishing-a-development-branch/SKILL.md` | Verify (no edit expected) | Same |
| `~/.claude/ultrapowers-architecture-defaults.json` | Document-only | Plan describes seed format; actual write happens via brainstorming's consent prompt, not as a plan task |
| `/Users/techno1731/.claude/projects/-Users-techno1731-Code-Personal-ultrapowers/memory/feedback_workflow_prefs.md` | Modify | Update memory note to reflect new defaults + confirm-or-tweak UX |

---

## Task 0: Setup — branch and prefs file

**Files:**
- Create: `.claude/ultrapowers-preferences.json`
- Check: `.gitignore`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/workflow-defaults-and-sibling-integration
```

- [ ] **Step 2: Create `.claude/` if missing and write prefs file**

```bash
mkdir -p /Users/techno1731/Code/Personal/ultrapowers/.claude
```

Write `/Users/techno1731/Code/Personal/ultrapowers/.claude/ultrapowers-preferences.json` with:

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": {
    "dev": true,
    "business": true
  }
}
```

- [ ] **Step 3: Ensure prefs file is gitignored**

Run:

```bash
grep -q "ultrapowers-preferences.json" /Users/techno1731/Code/Personal/ultrapowers/.gitignore 2>/dev/null || echo ".claude/ultrapowers-preferences.json" >> /Users/techno1731/Code/Personal/ultrapowers/.gitignore
```

Expected: silently succeeds; `.gitignore` now contains `.claude/ultrapowers-preferences.json` on its own line.

- [ ] **Step 4: Verify**

```bash
cat /Users/techno1731/Code/Personal/ultrapowers/.claude/ultrapowers-preferences.json
git check-ignore /Users/techno1731/Code/Personal/ultrapowers/.claude/ultrapowers-preferences.json
```

Expected: prefs content printed; `git check-ignore` prints the path (confirming it's ignored).

- [ ] **Step 5: Commit** *(only if user enabled auto-commit — enabled by Step 2)*

```bash
git add .gitignore
git commit -m "chore: gitignore ultrapowers-preferences.json"
```

---

## Task 1: Update `brainstorming/SKILL.md` Workflow Preferences section

**Goal:** Replace the 3-question block with confirm-or-tweak UX using the new defaults. Extend the schema to include `suggestSiblingPacks`. Document the deterministic parsing rules.

**Files:**
- Modify: `skills/brainstorming/SKILL.md` (the `## Workflow Preferences` section, currently lines 149-181)

- [ ] **Step 1: Replace the entire Workflow Preferences section**

Use Edit with:

**old_string:**

```
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

**new_string:**

```
## Workflow Preferences

**Step 4 — Load or ask workflow preferences:**

Read `.claude/ultrapowers-preferences.json` in the project root using the Read tool. If it exists and contains valid JSON, load the values silently and announce:

> "Using saved workflow prefs (auto-commit: on/off, auto-push: on/off, commit docs: on/off). Say 'change prefs' to update."

If the file does not exist or is invalid, ask the user **one** question with the defaults visible:

> "Workflow defaults for this repo: **auto-commit on**, **auto-push on**, **commit design docs off**. Reply `ok` to accept, or tell me what to change (e.g., `no auto-push`, `commit docs too`, `all off`)."

**Defaults:**
- `autoCommit`: **ON** (commit autonomously as tasks complete)
- `autoPush`: **ON** (push to remote after commits)
- `commitDesignDocs`: **OFF** (design specs/research briefs stay local)
- `suggestSiblingPacks.dev`: **ON** (suggest installing `ultrapowers-dev` when relevant and missing)
- `suggestSiblingPacks.business`: **ON** (suggest installing `ultrapowers-business` when relevant and missing)

**Deterministic reply parsing** (apply in order; multiple modifiers combine):

| User reply | Resulting change |
|---|---|
| `ok` / `yes` / `accept` / empty | all defaults as-is |
| `no auto-commit` / `manual commits` | `autoCommit: false` |
| `no auto-push` / `manual push` | `autoPush: false` |
| `commit docs` / `include design docs` | `commitDesignDocs: true` |
| `all off` | `autoCommit: false`, `autoPush: false`, `commitDesignDocs: false` |
| `all on` | `autoCommit: true`, `autoPush: true`, `commitDesignDocs: true` |

Combined example: `no auto-push, commit docs` → `autoPush: false`, `commitDesignDocs: true`.

If the reply is ambiguous (e.g., `push but not commit`), ask **one** targeted follow-up:

> "To confirm: auto-push on, auto-commit off, commit docs off — correct?"

Do not guess.

**Schema written to `.claude/ultrapowers-preferences.json`:**

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": {
    "dev": true,
    "business": true
  }
}
```

The `suggestSiblingPacks` object is additive and controls whether Step 6a (below) fires blocking "install missing sibling pack" prompts. If the file is missing this key, treat both flags as `true`. If a user replies `stop suggesting ultrapowers-dev` (or the flag is written via the sibling-pack scan step), persist `suggestSiblingPacks.dev: false` without touching other fields.

If `.claude/` directory doesn't exist, create it. Suggest adding `.claude/ultrapowers-preferences.json` to `.gitignore` if not already ignored.

All downstream skills (`writing-plans`, `subagent-driven-development`, `executing-plans`, `finishing-a-development-branch`, `project-setup`) read this file and respect the values. Unknown keys (like `suggestSiblingPacks` in older consumers) are ignored gracefully. If the file is missing, fall back to defaults documented above (all three workflow flags ON for auto-commit/auto-push, OFF for commitDesignDocs; both `suggestSiblingPacks` flags ON).
```

- [ ] **Step 2: Verify**

```bash
grep -c "Workflow defaults for this repo" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/SKILL.md
grep -c "suggestSiblingPacks" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/SKILL.md
```

Expected: both greps return `1` or higher (new prompt and new schema key present).

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat(brainstorming): confirm-or-tweak workflow prefs with new defaults"
```

---

## Task 2: Update `project-setup/SKILL.md` Preferences Mode

**Goal:** Make the "change my workflow preferences" path use the same confirm-or-tweak UX as brainstorming.

**Files:**
- Modify: `skills/project-setup/SKILL.md` (the `## Preferences Mode` section, currently lines 63-75)

- [ ] **Step 1: Replace the Preferences Mode section**

Use Edit with:

**old_string:**

```
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
```

**new_string:**

```
## Preferences Mode

When invoked as "project-setup preferences", "change my workflow preferences", or `change prefs`:

1. Read current `.claude/ultrapowers-preferences.json` if it exists.
2. Show current values in the prompt itself:

   > "Current workflow prefs: auto-commit {on|off}, auto-push {on|off}, commit design docs {on|off}, suggest `ultrapowers-dev` {on|off}, suggest `ultrapowers-business` {on|off}. Reply `ok` to keep, or tell me what to change (e.g., `no auto-push`, `stop suggesting dev`)."

3. Parse reply using the same rules documented in `skills/brainstorming/SKILL.md` Workflow Preferences section, extended with:

   | User reply | Resulting change |
   |---|---|
   | `stop suggesting dev` / `no dev suggestions` | `suggestSiblingPacks.dev: false` |
   | `stop suggesting business` / `no business suggestions` | `suggestSiblingPacks.business: false` |
   | `resume suggesting dev` / `suggest dev again` | `suggestSiblingPacks.dev: true` |
   | `resume suggesting business` / `suggest business again` | `suggestSiblingPacks.business: true` |
   | `reset sibling suggestions` | both `suggestSiblingPacks` flags to `true` |

4. Write updated values to `.claude/ultrapowers-preferences.json`. Preserve keys the user didn't change.
5. Suggest adding to `.gitignore` if not already ignored.
```

- [ ] **Step 2: Verify**

```bash
grep -c "stop suggesting dev" /Users/techno1731/Code/Personal/ultrapowers/skills/project-setup/SKILL.md
```

Expected: `1` or higher.

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/project-setup/SKILL.md
git commit -m "feat(project-setup): prefs mode uses confirm-or-tweak UX with sibling-pack flags"
```

---

## Task 3: Create `sibling-pack-map.md`

**Goal:** Extract the keyword → skill map from spec §5.2 into a standalone reference file that `brainstorming` reads on demand.

**Files:**
- Create: `skills/brainstorming/sibling-pack-map.md`

- [ ] **Step 1: Write the file**

Write `/Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/sibling-pack-map.md` with the content below. The `brainstorming` skill references this file via `${CLAUDE_SKILL_DIR}/sibling-pack-map.md`.

```markdown
# Sibling-Pack Keyword Map

This map is consulted by `skills/brainstorming/SKILL.md` during the "Scan for sibling-pack skills" step.

Matching is **case-insensitive, whole-word/phrase**. A signal must appear in the approved design or derived from user answers to trigger the suggestion. If the same signal matches multiple skills, include all matches.

## `ultrapowers-dev` map

| Signal | Suggested skill |
|---|---|
| python | `ultrapowers-dev:python-best-practices` |
| typescript / ts | `ultrapowers-dev:typescript-best-practices` |
| javascript / js (non-TS) | `ultrapowers-dev:javascript-best-practices` |
| react | `ultrapowers-dev:react-best-practices`, `ultrapowers-dev:react-patterns` |
| next.js / nextjs | `ultrapowers-dev:nextjs-patterns` |
| fastapi | `ultrapowers-dev:fastapi-patterns` |
| django | `ultrapowers-dev:django-patterns` |
| flask | `ultrapowers-dev:flask-patterns` |
| express | `ultrapowers-dev:express-patterns` |
| nestjs | `ultrapowers-dev:nestjs-patterns` |
| rails | `ultrapowers-dev:rails-patterns` |
| laravel | `ultrapowers-dev:laravel-patterns` |
| spring boot | `ultrapowers-dev:spring-boot-patterns` |
| angular | `ultrapowers-dev:angular-patterns` |
| tailwind | `ultrapowers-dev:tailwind-patterns` |
| supabase | `ultrapowers-dev:supabase-patterns` |
| rust | `ultrapowers-dev:rust-best-practices` |
| go / golang | `ultrapowers-dev:go-best-practices` |
| java | `ultrapowers-dev:java-best-practices` |
| kotlin | `ultrapowers-dev:kotlin-best-practices` |
| swift | `ultrapowers-dev:swift-best-practices` |
| dart | `ultrapowers-dev:dart-best-practices` |
| flutter | `ultrapowers-dev:dart-best-practices` *(no Flutter-specific skill today — Dart skill is closest match; revisit if a Flutter skill ships)* |
| c / c++ / cpp | `ultrapowers-dev:c-cpp-best-practices` |
| csharp / c# | `ultrapowers-dev:csharp-best-practices` |
| php | `ultrapowers-dev:php-best-practices` |
| ruby | `ultrapowers-dev:ruby-best-practices` |
| testing / tdd | `ultrapowers-dev:testing-tdd` |
| e2e / playwright / cypress | `ultrapowers-dev:e2e-testing` |
| sql / postgres / mysql / sqlite | `ultrapowers-dev:sql-best-practices` |
| database / schema | `ultrapowers-dev:database-design` |
| cache / caching | `ultrapowers-dev:caching` |
| auth / authentication / authorization | `ultrapowers-dev:auth-security` |
| api / rest / graphql | `ultrapowers-dev:api-design` |
| observability / logging / tracing | `ultrapowers-dev:observability` |
| resilience / retry / circuit breaker | `ultrapowers-dev:resilience` |
| background job / queue / worker | `ultrapowers-dev:background-jobs` |
| rag / embedding / vector | `ultrapowers-dev:rag-ai` |
| ci/cd / pipeline | `ultrapowers-dev:ci-cd` |
| type safety / generics | `ultrapowers-dev:type-safety` |
| error handling | `ultrapowers-dev:error-handling` |
| design pattern / solid | `ultrapowers-dev:design-patterns` |
| architecture / microservice / monolith | `ultrapowers-dev:architecture` |
| frontend design / ui | `ultrapowers-dev:frontend-design` |
| web design / accessibility | `ultrapowers-dev:web-design-guidelines` |
| browser automation | `ultrapowers-dev:browser-automation` |
| tool call / function call | `ultrapowers-dev:tool-calling` |
| agent loop | `ultrapowers-dev:agent-loop` |
| orchestrator / workers | `ultrapowers-dev:orchestrator-workers` |
| multi-agent debate | `ultrapowers-dev:multi-agent-debate` |
| multi-agent handoff | `ultrapowers-dev:multi-agent-handoffs` |
| dag / workflow | `ultrapowers-dev:dag-workflows` |
| parallelization | `ultrapowers-dev:parallelization` |
| ratatui / tui | `ultrapowers-dev:ratatui-patterns` |
| plugin | `ultrapowers-dev:plugin-development` |

## `ultrapowers-business` map

| Signal | Suggested skill |
|---|---|
| seo | `ultrapowers-business:seo-audit` |
| ai seo / llm seo | `ultrapowers-business:ai-seo` |
| copy / headline / landing page | `ultrapowers-business:copywriting` |
| page conversion / cro | `ultrapowers-business:page-cro` |
| pricing | `ultrapowers-business:pricing-strategy` |
| email sequence / drip | `ultrapowers-business:email-sequence` |
| cold email / outbound | `ultrapowers-business:cold-email` |
| social / linkedin / twitter | `ultrapowers-business:social-content` |
| paid ads / google ads / meta ads | `ultrapowers-business:paid-ads` |
| schema markup / structured data | `ultrapowers-business:schema-markup` |
| analytics / tracking / ga4 | `ultrapowers-business:analytics-tracking` |
| signup flow | `ultrapowers-business:signup-flow-cro` |
| onboarding | `ultrapowers-business:onboarding-cro` |
| form / lead capture | `ultrapowers-business:form-cro` |
| popup / modal | `ultrapowers-business:popup-cro` |
| paywall / upgrade | `ultrapowers-business:paywall-upgrade-cro` |
| churn / retention | `ultrapowers-business:churn-prevention` |
| referral / affiliate | `ultrapowers-business:referral-program` |
| launch / product hunt | `ultrapowers-business:launch-strategy` |
| site architecture / sitemap | `ultrapowers-business:site-architecture` |
| ab test / experiment | `ultrapowers-business:ab-test-setup` |
| pitch deck | `ultrapowers-business:pitch-deck` |
| sales enablement / battle card | `ultrapowers-business:sales-enablement` |
| lead magnet | `ultrapowers-business:lead-magnets` |
| free tool / calculator | `ultrapowers-business:free-tool-strategy` |
| revops / lead scoring / crm | `ultrapowers-business:revops` |
| content strategy | `ultrapowers-business:content-strategy` |
| programmatic seo | `ultrapowers-business:programmatic-seo` |
| competitor / alternatives | `ultrapowers-business:competitor-alternatives` |
| financial model / cap table | `ultrapowers-business:financial-modeling` |
| gdpr | `ultrapowers-business:gdpr-compliance` |
| soc 2 | `ultrapowers-business:soc2-compliance` |
| marketing ideas / growth | `ultrapowers-business:marketing-ideas` |
| marketing psychology | `ultrapowers-business:marketing-psychology` |
| technical writing / docs | `ultrapowers-business:technical-writing` |
| copy edit / proofread | `ultrapowers-business:copy-editing` |
| ad creative | `ultrapowers-business:ad-creative` |

## Usage

When `brainstorming` invokes this map:

1. Collect all signals from the approved design (architecture section, tech stack mentions, domain descriptions).
2. For each signal, collect matching skills from both tables.
3. For each matched skill, check the session's available-skills list (injected via `<system-reminder>`):
   - If `ultrapowers-dev:<skill>` or `ultrapowers-business:<skill>` appears in the list → **installed match**.
   - If the pack's prefix is entirely absent from the list → **missing match** (candidate for install prompt).
   - If the prefix is present but this specific skill isn't → treat as "installed, just not this specific skill" — don't trigger install prompt.
4. Deduplicate. Return two lists: `installed_matches`, `missing_matches`.

## Extending the map

Add new rows when a new sibling-pack skill is released. Keep the signal column lowercase. Prefer broad signals ("python") over narrow ones ("pytest fixtures") unless the narrow signal materially changes which skill is best.
```

- [ ] **Step 2: Verify**

```bash
wc -l /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/sibling-pack-map.md
grep -c "ultrapowers-dev:" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/sibling-pack-map.md
grep -c "ultrapowers-business:" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/sibling-pack-map.md
```

Expected: wc ≥ 100 lines; at least ~60 `ultrapowers-dev:` occurrences and ~40 `ultrapowers-business:` occurrences.

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/brainstorming/sibling-pack-map.md
git commit -m "feat(brainstorming): add sibling-pack keyword→skill reference map"
```

---

## Task 4: Create `architecture-profile-matching.md`

**Goal:** Extract profile-matching logic and seed-profile definitions into a reference file.

**Files:**
- Create: `skills/brainstorming/architecture-profile-matching.md`

- [ ] **Step 1: Write the file**

Write `/Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/architecture-profile-matching.md` with:

```markdown
# Architecture Profile Matching

This reference is consulted by `skills/brainstorming/SKILL.md` during the "Match architecture profile" step (runs between "Explore project context" and "Ask clarifying questions").

## Lookup order

1. Repo-level override: `<repo>/.claude/ultrapowers-architecture-defaults.json` — if present, its profiles **replace** (not merge) user-level ones.
2. User-level: `~/.claude/ultrapowers-architecture-defaults.json` — baseline profiles.
3. Neither file → skip this step silently; fall back to normal clarifying questions.

## File schema

```json
{
  "profiles": [
    {
      "id": "<stable-id>",
      "description": "<one-line human description>",
      "signals": ["<lowercase-phrase>", "..."],
      "stack": { "<role>": "<tool-identity>", "...": "..." },
      "skills": ["<skill-name-with-or-without-pack-prefix>"],
      "reference_projects": ["<project-name>"]
    }
  ]
}
```

**Important:** `stack` entries store **tool identity only** — no version pins. Each deep-research run resolves the current latest per tool. The seed file stays future-proof.

## Matching algorithm

```
match_profile(idea_text, profiles):
    normalized = lowercase(idea_text)
    scored = []
    for p in profiles:
        count = number of signals in p.signals that appear in normalized (word boundary)
        if count >= 1:
            scored.append((p, count))

    if len(scored) == 0:
        return None, "no match — skip"
    if len(scored) == 1:
        return scored[0][0], "suggest"
    return scored, "ambiguous — ask user to pick"
```

## Suggestion UX

**Single match:**

> "This looks like a **{profile.description}**. My default stack for these is {comma-separated stack values} (based on {reference_projects}). Want to use this stack, or discuss alternatives?"

- `use defaults` / `yes` → bake stack + skills into spec's Architecture section; seed `skills-audit` with the profile's `skills` list.
- `discuss alternatives` / `no` → proceed to clarifying questions, no stack bake-in.

**Multiple matches:**

> "This could fit {N} profiles:
> 1. **{profile[0].description}** — matches: {list of hit signals} ({count} signals)
> 2. **{profile[1].description}** — matches: {list} ({count} signals)
>
> Which fits, or `neither`?"

## Seed profiles

Seeded on first run of modified brainstorming via the consent prompt (see `skills/brainstorming/SKILL.md` §Architecture profile matching). The file is **not** written unilaterally.

### Profile: `marketing-content-site`

```json
{
  "id": "marketing-content-site",
  "description": "Brochureware, personal site, agency/consultancy, blog, content-heavy",
  "signals": ["marketing", "content", "blog", "landing", "personal site", "consultancy", "agency", "brochure"],
  "stack": {
    "framework": "astro",
    "ui": "react-islands",
    "styling": "tailwindcss",
    "language": "typescript",
    "database": "neon+drizzle (when needed)",
    "email": "resend",
    "icons": "astro-icon + @iconify-json/tabler",
    "deploy": "netlify"
  },
  "skills": [
    "ultrapowers-dev:typescript-best-practices",
    "ultrapowers-dev:tailwind-patterns",
    "ultrapowers-dev:react-best-practices",
    "neon-drizzle-patterns"
  ],
  "reference_projects": ["datatide-web", "WebPage (enniomaldonado.com)"]
}
```

### Profile: `saas-product-app`

```json
{
  "id": "saas-product-app",
  "description": "Authed product / dashboard / subscription / multi-tenant",
  "signals": ["saas", "app", "product", "auth", "subscription", "dashboard", "tenant", "billing"],
  "stack": {
    "framework": "next.js (app router)",
    "ui": "react",
    "styling": "tailwindcss",
    "language": "typescript",
    "auth": "clerk",
    "database": "supabase",
    "payments": "stripe",
    "email": "resend",
    "i18n": "next-intl (if multilingual)",
    "testing": "vitest + @testing-library + playwright",
    "analytics": "@vercel/analytics",
    "deploy": "vercel"
  },
  "skills": [
    "ultrapowers-dev:nextjs-patterns",
    "ultrapowers-dev:react-patterns",
    "ultrapowers-dev:react-best-practices",
    "ultrapowers-dev:typescript-best-practices",
    "ultrapowers-dev:tailwind-patterns",
    "ultrapowers-dev:testing-tdd",
    "ultrapowers-dev:e2e-testing",
    "ultrapowers-dev:supabase-patterns",
    "clerk-nextjs-patterns",
    "stripe-nextjs-patterns",
    "nextjs-i18n-patterns"
  ],
  "reference_projects": ["ultrapowers-web"]
}
```

## Extending profiles

Users can add profiles by editing `~/.claude/ultrapowers-architecture-defaults.json` directly or through a future `project-setup profiles` mode. Keep `id` stable — it's referenced in specs and plans.
```

- [ ] **Step 2: Verify**

```bash
wc -l /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/architecture-profile-matching.md
grep -c "marketing-content-site\|saas-product-app" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/architecture-profile-matching.md
```

Expected: wc ≥ 80 lines; grep ≥ 2 (both profile IDs present).

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/brainstorming/architecture-profile-matching.md
git commit -m "feat(brainstorming): add architecture profile matching reference"
```

---

## Task 5: Add checklist entries to `brainstorming/SKILL.md`

**Goal:** Wire the two new steps (profile matching + sibling-pack scan) into brainstorming's checklist + process flow.

**Files:**
- Modify: `skills/brainstorming/SKILL.md` (Checklist section, lines 20-33)

- [ ] **Step 1: Expand the Checklist**

Use Edit with:

**old_string:**

```
## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Explore project context** — check files, docs, recent commits
2. **Offer visual companion** (if topic will involve visual questions) — this is its own message, not combined with a clarifying question. See the Visual Companion section below.
3. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
4. **Load or ask workflow preferences** — check for saved preferences in .claude/ultrapowers-preferences.json; if missing, ask and save (see Workflow Preferences section below)
5. **Propose 2-3 approaches** — with trade-offs and your recommendation
6. **Present design** — in sections scaled to their complexity, get user approval after each section
7. **Write design doc** — save to `docs/ultrapowers/specs/YYYY-MM-DD-<topic>-design.md` (commit only if user opted in)
8. **Spec self-review** — quick inline check for placeholders, contradictions, ambiguity, scope (see below)
9. **User reviews written spec** — ask user to review the spec file before proceeding
10. **Transition to research** — invoke deep-research skill to capture current state of the art
```

**new_string:**

```
## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Explore project context** — check files, docs, recent commits
2. **Match architecture profile** — read `~/.claude/ultrapowers-architecture-defaults.json` (then repo-level override if present); match signals from user's idea; if a profile fits, suggest its stack before asking clarifying questions (see Architecture Profile Matching section)
3. **Offer visual companion** (if topic will involve visual questions) — this is its own message, not combined with a clarifying question. See the Visual Companion section below.
4. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
5. **Load or ask workflow preferences** — check for saved preferences in .claude/ultrapowers-preferences.json; if missing, ask and save (see Workflow Preferences section below)
6. **Propose 2-3 approaches** — with trade-offs and your recommendation
7. **Present design** — in sections scaled to their complexity, get user approval after each section
8. **Scan for sibling-pack skills** — after design is approved, match the design against `${CLAUDE_SKILL_DIR}/sibling-pack-map.md`; bucket matches into installed vs missing; for missing packs, emit a blocking prompt per pack (see Sibling-Pack Scan section)
9. **Write design doc** — save to `docs/ultrapowers/specs/YYYY-MM-DD-<topic>-design.md` (commit only if user opted in). If a profile matched in step 2 or skills matched in step 8, include them in a `## Referenced Skills` section inside the spec.
10. **Spec self-review** — quick inline check for placeholders, contradictions, ambiguity, scope (see below)
11. **User reviews written spec** — ask user to review the spec file before proceeding
12. **Transition to research** — invoke deep-research skill to capture current state of the art
```

- [ ] **Step 2: Add the Architecture Profile Matching section**

**Anchor note:** This Edit anchors on the existing `## Visual Companion` heading, NOT on Task 1's output. This keeps Tasks 1 and 5 independent — if either is re-run or revised, the other still applies cleanly. Before running the Edit, verify there is exactly one `## Visual Companion` heading in the file:

```bash
grep -c "^## Visual Companion$" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/SKILL.md
```

Expected: `1`.

Use Edit with (exactly one `## Visual Companion` in the file, so the short anchor is unique):

**old_string:**

```
## Visual Companion
```

**new_string:**

```
## Architecture Profile Matching

**Step 2 — Match architecture profile:**

Before asking clarifying questions, check if the user's described idea matches a pre-defined architecture profile. Profiles encode the user's default stack choices and feed directly into the design's Architecture section + skills-audit's "External" list.

1. Read `~/.claude/ultrapowers-architecture-defaults.json` (user-level, baseline) and `<repo>/.claude/ultrapowers-architecture-defaults.json` (repo-level override — replaces user-level if present).
2. If neither file exists AND this is the first run of modified brainstorming:
   > "I don't see your architecture defaults file at `~/.claude/ultrapowers-architecture-defaults.json`. I can seed one with two profiles (marketing/content site + SaaS product app) based on your current reference projects. Want me to create it? (`yes` / `skip`)"

   On `yes`: write the seed file using the two profiles from `${CLAUDE_SKILL_DIR}/architecture-profile-matching.md`. On `skip`: proceed without matching, don't ask again this session.
3. If a file exists, apply the matching algorithm in `${CLAUDE_SKILL_DIR}/architecture-profile-matching.md` against the user's idea text.
4. Present the result:
   - **No match:** skip silently; proceed to clarifying questions.
   - **Single match:** suggest the profile using the wording in the reference file; user accepts or declines.
   - **Multiple matches:** present top 2-3 with signal counts; user picks or says `neither`.
5. If accepted, store the profile ID for the session and bake its `stack` values into the design's Architecture section when you reach step 7.

**Never auto-edit the defaults file.** Any change to profiles (including seed write) requires explicit user consent.

## Sibling-Pack Scan

**Step 8 — Scan for sibling-pack skills (runs after design is approved, before writing the spec):**

1. Read `${CLAUDE_SKILL_DIR}/sibling-pack-map.md`.
2. Extract signals from the approved design: architecture section, tech stack mentions, domain descriptions, profile `stack` values (if a profile was matched in step 2).
3. For each signal, look up matching skills in both the `ultrapowers-dev` and `ultrapowers-business` tables.
4. For each matched skill, scan the session's available-skills list (injected as `<system-reminder>`) for the corresponding prefix:
   - `ultrapowers-dev:<name>` present → **installed match** for `ultrapowers-dev`.
   - `ultrapowers-business:<name>` present → **installed match** for `ultrapowers-business`.
   - Pack prefix entirely absent from available-skills → **missing pack** (candidate for install prompt).
5. Handle results:
   - **Installed matches** (any count) → append a `## Referenced Skills` section to the spec (written in step 9) listing them with one-line rationale per skill. Done silently — no user prompt.
   - **Missing pack, relevant AND `suggestSiblingPacks.<pack>: true`** → emit a blocking prompt, one per missing pack, sequentially. Do not combine packs into a single prompt.

**Blocking prompt template (one per missing pack):**

> "This project looks like it would benefit from the **ultrapowers-{dev|business}** pack. Detected signals: `{signal1}`, `{signal2}`, `{signal3}`. It's optional but would give the implementation plan access to current best-practice skills. Options:
>
> 1. **Install** — I'll pause while you run `/plugin install ultrapowers-{dev|business}@ultrapowers` (or use the interactive `/plugin` menu). When done, say `installed` and I'll re-scan.
> 2. **Skip** — proceed without; I won't reference these skills in the spec.
> 3. **Skip and stop suggesting** — sets `suggestSiblingPacks.{dev|business}: false` in `.claude/ultrapowers-preferences.json` so I don't suggest this pack again in this repo."

Wait for user response:
- `installed` → call `/reload-plugins` if needed, re-read the available-skills list (ask the user to paste the updated list if not automatically visible), re-bucket matches, and proceed. If the pack still doesn't appear, ask the user to verify the install and fall back to `skip` after one retry.
- `skip` → drop matches for this pack for this session; don't write to prefs.
- `skip and stop suggesting` → read current `.claude/ultrapowers-preferences.json`, set `suggestSiblingPacks.<pack>: false`, write it back (preserving all other keys), drop matches for this session.

## Visual Companion
```

- [ ] **Step 3: Verify all three sections are present**

```bash
grep -c "Architecture Profile Matching\|Sibling-Pack Scan\|Workflow Preferences" /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/SKILL.md
```

Expected: `3` (each section heading appears at least once).

- [ ] **Step 4: Verify the checklist has 12 numbered items**

```bash
sed -n '/^## Checklist/,/^## Process Flow/p' /Users/techno1731/Code/Personal/ultrapowers/skills/brainstorming/SKILL.md | grep -cE '^[0-9]+\.'
```

Expected: `12`.

- [ ] **Step 5: Commit** *(if auto-commit enabled)*

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat(brainstorming): add profile matching and sibling-pack scan steps"
```

---

## Task 6: Update `skills-audit/SKILL.md` for sibling-pack recognition

**Goal:** Classify `ultrapowers-dev:*` / `ultrapowers-business:*` skills as **External** explicitly, and seed the audit from any matched profile's `skills` list.

**Files:**
- Modify: `skills/skills-audit/SKILL.md` (Checking installed skills section, around line 107; and the domain-competency classification table)

- [ ] **Step 1: Update "Checking installed skills" paragraph**

**old_string:**

```
### Checking installed skills

Many category skills may already be installed as plugins. Check the available skills list in the current session. Mark installed ones as **External** — they don't need to be created, just referenced in the plan.
```

**new_string:**

```
### Checking installed skills

Many category skills may already be installed as plugins. Check the available-skills list in the current session (injected as `<system-reminder>`). Mark installed ones as **External** — they don't need to be created, just referenced in the plan.

**Sibling-pack prefixes are always External.** Any skill whose name starts with `ultrapowers-dev:` or `ultrapowers-business:` is part of a sibling plugin and is classified **External** without further investigation. If a matched profile from brainstorming provided a pre-populated `skills` list, seed the External set from that list before scanning domain competencies — this avoids re-deriving skills the profile already resolved.

When a base-plugin skill and a sibling-pack skill both cover the same concern, **prefer the sibling-pack version** (it's more specialized). Example: prefer `ultrapowers-dev:testing-tdd` over a less-specific reference.
```

- [ ] **Step 2: Verify**

```bash
grep -c "Sibling-pack prefixes are always External" /Users/techno1731/Code/Personal/ultrapowers/skills/skills-audit/SKILL.md
```

Expected: `1`.

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/skills-audit/SKILL.md
git commit -m "feat(skills-audit): recognize ultrapowers-dev/business prefixes as External"
```

---

## Task 7: Update `deep-research/SKILL.md` with "Resolve architecture defaults" sub-step

**Goal:** Add a sub-step that resolves the current latest version for each tool in the matched profile's `stack`, emits a table, and blocks on 🚫 deprecations.

**Files:**
- Modify: `skills/deep-research/SKILL.md` (insert a new section after "5. Produce Research Brief" and before "Red Flags")

- [ ] **Step 1: Insert the new section**

**old_string:**

```
### 5. Produce Research Brief

```markdown
## Research Brief: [Topic]

### Context
What we're building and why research was needed.

### Key Findings
- **Pattern 1**: Description, trade-offs, when to use
- **Pattern 2**: Description, trade-offs, when to use

### Recommended Approach
Which pattern fits our use case and why.

### Implementation Notes
- Libraries and versions
- Configuration gotchas
- Common pitfalls

### Sources
- [Source 1]: What it confirmed
- [Source 2]: What it confirmed
```

## Red Flags
```

**new_string:**

```
### 5. Produce Research Brief

```markdown
## Research Brief: [Topic]

### Context
What we're building and why research was needed.

### Key Findings
- **Pattern 1**: Description, trade-offs, when to use
- **Pattern 2**: Description, trade-offs, when to use

### Recommended Approach
Which pattern fits our use case and why.

### Implementation Notes
- Libraries and versions
- Configuration gotchas
- Common pitfalls

### Architecture Defaults Resolved
(Include this section only if brainstorming matched an architecture profile — see step 6 below.)

| Tool | Latest | Status | Notes |
|---|---|---|---|
| astro | 6.1.9 | ✅ | Recommended for content sites |
| next.js | 16.2.4 | ✅ | App Router standard |

### Sources
- [Source 1]: What it confirmed
- [Source 2]: What it confirmed
```

### 6. Resolve Architecture Defaults (conditional sub-step)

**Runs only when brainstorming matched an architecture profile** (stored as a session identifier in the spec's Architecture section or as a `profile_id` field).

For each tool listed in the profile's `stack`:

1. Query current latest stable version (npm registry / upstream docs).
2. Check deprecation / replacement status.
3. One-line sanity check on "still recommended for <use case>".
4. Classify:
   - **✅ Current & recommended** — latest version noted, no user action required.
   - **🚫 Deprecated / replaced** — EOL or strongly superseded; name the replacement.

**Dispatch in parallel** — each tool is independent. Use general-purpose subagents for batches.

**Minor-version drift** (e.g., 1.58 → 1.59) is NOT a classification — it's just the current latest. Only deprecations block.

**Populate the "Architecture Defaults Resolved" table** in the research brief (above) with one row per tool in the profile's `stack`.

**Blocking behavior:** if any 🚫 shows up, pause research and prompt:

> "Your default stack has a deprecated tool:
> - 🚫 `<tool>`: <reason> — suggested replacement: `<replacement>`
>
> Options:
> 1. Update `~/.claude/ultrapowers-architecture-defaults.json` to replace it (I'll show the diff first).
> 2. Use the replacement for this project only (creates `<repo>/.claude/ultrapowers-architecture-defaults.json` as an override).
> 3. Stick with current defaults and proceed anyway."

On option 1, read the user-level file, swap the deprecated tool for the replacement in the matching profile's `stack`, show a diff, and write only after user confirms `apply`.

On option 2, generate the repo-level override file with just the affected profile + replacement.

On option 3, note the deprecation in the research brief and proceed.

**Failure mode:** if a per-tool resolution query fails (timeout, no source available), mark that row as `"unable to verify"` in the table and proceed. Don't block the research step on sub-step failures.

## Red Flags
```

- [ ] **Step 2: Verify**

```bash
grep -c "Resolve Architecture Defaults" /Users/techno1731/Code/Personal/ultrapowers/skills/deep-research/SKILL.md
grep -c "Architecture Defaults Resolved" /Users/techno1731/Code/Personal/ultrapowers/skills/deep-research/SKILL.md
```

Expected: both `1` or higher.

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/deep-research/SKILL.md
git commit -m "feat(deep-research): add Resolve Architecture Defaults sub-step"
```

---

## Task 8: Update `writing-plans/SKILL.md` for task annotation

**Goal:** When the upstream skills-audit produces "Skills to Reference in Plan" including sibling-pack skills, `writing-plans` should annotate relevant tasks with `@<skill-name>` pointers.

**Files:**
- Modify: `skills/writing-plans/SKILL.md` (insert a new section between "Task Structure" and "Remember")

- [ ] **Step 1: Locate the insertion point and insert**

**old_string:**

```
## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD
- **Commit steps are conditional** — include them in the plan but mark them as "only if auto-commit enabled". If the user chose manual commits, skip commit steps during execution.
- **NEVER include design docs in commit steps** — design docs are local only
```

**new_string:**

```
## Annotating Tasks with Skill Pointers

When the upstream `skills-audit` output includes a "Skills to Reference in Plan" list:

1. Include the full list in the plan's header (under a "Skills referenced during implementation:" subheading).
2. For each task, identify which of those skills apply (match against files touched, languages used, concerns involved).
3. Prepend applicable skills to the task body as `@<skill-name>` pointers, one per line. Examples:

   ```
   ### Task 3: Add Clerk auth middleware

   @ultrapowers-dev:nextjs-patterns
   @clerk-nextjs-patterns

   **Files:**
   - Modify: ...
   ```

4. Do not sprinkle pointers gratuitously — only on tasks where the skill materially shapes the implementation. A task that just writes a JSON file doesn't need every language skill appended.
5. If skills-audit did not produce a list (or the project has no sibling-pack skills), skip annotation entirely. No placeholder `@nothing` pointers.

The implementation skill (`subagent-driven-development` or `executing-plans`) reads these annotations when dispatching per-task subagents, ensuring they invoke the right skills.

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax (see Annotating Tasks above)
- DRY, YAGNI, TDD
- **Commit steps are conditional** — include them in the plan but mark them as "only if auto-commit enabled". If the user chose manual commits, skip commit steps during execution.
- **NEVER include design docs in commit steps** — design docs are local only
```

- [ ] **Step 2: Verify**

```bash
grep -c "Annotating Tasks with Skill Pointers" /Users/techno1731/Code/Personal/ultrapowers/skills/writing-plans/SKILL.md
```

Expected: `1`.

- [ ] **Step 3: Commit** *(if auto-commit enabled)*

```bash
git add skills/writing-plans/SKILL.md
git commit -m "feat(writing-plans): document task annotation with @skill pointers"
```

---

## Task 9: Consumer-skill regression check (read-only)

**Goal:** Verify that `executing-plans`, `subagent-driven-development`, and `finishing-a-development-branch` still read `.claude/ultrapowers-preferences.json` correctly and ignore the new `suggestSiblingPacks` key gracefully. No edits expected.

**Files:**
- Read-only: `skills/executing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: Grep for prefs reads**

```bash
grep -n "ultrapowers-preferences\|autoCommit\|autoPush\|commitDesignDocs" /Users/techno1731/Code/Personal/ultrapowers/skills/executing-plans/SKILL.md /Users/techno1731/Code/Personal/ultrapowers/skills/subagent-driven-development/SKILL.md /Users/techno1731/Code/Personal/ultrapowers/skills/finishing-a-development-branch/SKILL.md
```

Expected output (verbatim current state):

```
skills/executing-plans/SKILL.md:18:Before executing, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its values for `autoCommit` and `autoPush` to determine whether to commit after each task and whether to push. If the file is missing, default to all OFF (no auto-commit, no auto-push).
skills/subagent-driven-development/SKILL.md:89:Before dispatching implementer subagents, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its values for `autoCommit` and `autoPush`. Pass these to implementer subagents so they know whether to commit after each task and whether to push. If the file is missing, default to all OFF (no auto-commit, no auto-push).
skills/finishing-a-development-branch/SKILL.md:18:Before presenting options, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its `autoPush` value to determine whether to push automatically. If the file is missing, default to OFF (no auto-push).
```

Each consumer reads only the keys it needs (`autoCommit`, `autoPush`) — so the new `suggestSiblingPacks` key is ignored by virtue of the consumer never looking at it. ✅ No regression risk; no edits required.

- [ ] **Step 2: Sanity-load current prefs file and confirm it parses**

```bash
python3 -c "import json; json.load(open('/Users/techno1731/Code/Personal/ultrapowers/.claude/ultrapowers-preferences.json'))" && echo OK
```

Expected: `OK`.

- [ ] **Step 3: No commit** — read-only task.

---

## Task 10: Manual smoke tests (spec §8, all 11 tests)

**Goal:** Execute every manual smoke test documented in the spec. Mark each as pass/fail inline in this plan and in a fresh file at `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-smoke-tests.md`.

Use `@ultrapowers:verification-before-completion` — evidence before assertions.

**Files:**
- Create: `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-smoke-tests.md`

- [ ] **Step 1: Create a scratch repo for isolated tests**

```bash
mkdir -p /tmp/ultrapowers-smoke-tests && cd /tmp/ultrapowers-smoke-tests && git init -q && git commit --allow-empty -m "init" -q
```

- [ ] **Step 2: Prefs fresh-repo test (spec §8.1)**

In the scratch repo, delete any existing `.claude/ultrapowers-preferences.json`, invoke brainstorming with the modified skill active, verify the new prompt appears verbatim, reply `ok`, verify the file is written with:

```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": { "dev": true, "business": true }
}
```

Record pass/fail in the smoke-tests file.

- [ ] **Step 3: Modifier reply test (spec §8.2)**

Delete the prefs file, re-invoke brainstorming, reply `no auto-push, commit docs`. Verify:

```json
{ "autoCommit": true, "autoPush": false, "commitDesignDocs": true, "suggestSiblingPacks": { "dev": true, "business": true } }
```

- [ ] **Step 4: Ambiguous reply test (spec §8.3)**

Delete prefs, re-invoke, reply `push but not commit`. Verify the skill asks one follow-up question instead of guessing.

- [ ] **Step 5: Loaded-prefs announcement (spec §8.4)**

Second invocation in same repo (prefs file present). Verify "Using saved workflow prefs" message and no re-prompt.

- [ ] **Step 6: Profile match (spec §8.5)**

Fresh scratch repo; ensure `~/.claude/ultrapowers-architecture-defaults.json` contains the seed. Invoke brainstorming with idea: "Build a marketing landing page for a new consultancy". Verify `marketing-content-site` profile is suggested with Astro stack. Accept. Verify the spec (once written) has an Architecture section mentioning Astro, Tailwind, TS, Neon/Drizzle, Resend, Netlify.

- [ ] **Step 7: Profile override (spec §8.6)**

In a scratch repo, create `.claude/ultrapowers-architecture-defaults.json` with:

```json
{ "profiles": [{ "id": "repo-only", "description": "repo-only hugo site", "signals": ["landing"], "stack": {"framework": "hugo"}, "skills": [], "reference_projects": [] }] }
```

Invoke brainstorming with idea "Build a landing page." Verify repo override wins (suggests Hugo, not Astro).

- [ ] **Step 8: Sibling pack installed & relevant (spec §8.7)**

In a scratch repo with both `ultrapowers-dev` and `ultrapowers-business` installed, brainstorm "React/Next.js app with Clerk and Stripe." Verify the spec's `## Referenced Skills` section lists `ultrapowers-dev:nextjs-patterns`, `clerk-nextjs-patterns`, `stripe-nextjs-patterns` silently (no install prompt).

- [ ] **Step 9: Sibling pack missing & relevant (spec §8.8)**

Uninstall `ultrapowers-dev` temporarily: `/plugin remove ultrapowers-dev`. Invoke brainstorming with React/Next.js idea. Verify the blocking prompt fires with matched signals. Reply `skip and stop suggesting`. Verify `suggestSiblingPacks.dev: false` written to prefs. Reinstall: `/plugin install ultrapowers-dev@ultrapowers`.

- [ ] **Step 10: Stop-suggesting flag respected (spec §8.9)**

With `suggestSiblingPacks.dev: false` from previous test, re-invoke brainstorming with React signals. Verify NO install prompt fires.

Reset: `/plugin install ultrapowers-dev@ultrapowers` and set `suggestSiblingPacks.dev: true` in prefs.

- [ ] **Step 11: Defaults resolved — current tools (spec §8.10)**

Run deep-research with the `saas-product-app` profile active. Verify "Architecture Defaults Resolved" table appears in the research brief with a latest-version entry per tool, all ✅.

- [ ] **Step 12: Defaults resolved — deprecation detection (spec §8.11)**

Manually edit `~/.claude/ultrapowers-architecture-defaults.json` to add `"cache": "vercel-kv"` to the `saas-product-app` profile's stack. Run deep-research. Verify 🚫 classification, blocking prompt with three options. Pick option 1, verify diff shown, apply, verify file updated to replace `vercel-kv` with `marketplace-redis`. Revert manually if undesired.

- [ ] **Step 13: Write smoke-tests summary file**

Write `docs/ultrapowers/specs/2026-04-23-workflow-defaults-and-sibling-integration-smoke-tests.md` with one section per test, each listing: inputs, expected output, actual output (paste), pass/fail.

- [ ] **Step 14: Commit** *(if auto-commit enabled; smoke tests file is a DESIGN DOC — skip per `commitDesignDocs: false`)*

**IMPORTANT:** Do not commit the smoke-tests file. It's in `docs/ultrapowers/specs/` which is design-doc territory. Per prefs `commitDesignDocs: false`, keep local.

```bash
# No commit for this task. Record pass/fail in TodoWrite or in the task body.
```

---

## Task 11: Update auto-memory

**Goal:** Update the user's memory system to reflect the new defaults + confirm-or-tweak UX, so future sessions don't regress.

**Files:**
- Modify: `/Users/techno1731/.claude/projects/-Users-techno1731-Code-Personal-ultrapowers/memory/feedback_workflow_prefs.md`

- [ ] **Step 1: Update the memory note**

Use Edit with:

**old_string:**

```
Do not ask workflow preferences (auto-commit, auto-push, commit design docs) every brainstorming session. Save them once per git repo and reuse.

**Why:** The user finds it annoying to answer the same three questions every time brainstorming runs. Once set, preferences rarely change.

**How to apply:** Store preferences in a file per repo (e.g., `.claude/ultrapowers-preferences.json` or similar). Brainstorming should check for existing preferences before asking, and only ask if none exist. Include an override mechanism (e.g., "want to change your workflow preferences?") but don't prompt by default.
```

**new_string:**

```
Do not ask workflow preferences (auto-commit, auto-push, commit design docs) as three separate questions. Save them once per git repo and reuse. When the file is missing, use a single confirm-or-tweak prompt with the defaults visible.

**Why:** The user finds it annoying to answer three questions every time. Once set, preferences rarely change. Less-experienced users can accept defaults with `ok`; experienced users can tune with free-form modifiers like `no auto-push, commit docs`.

**How to apply:** Store preferences in `.claude/ultrapowers-preferences.json` per repo. Defaults: `autoCommit: true`, `autoPush: true`, `commitDesignDocs: false`, `suggestSiblingPacks: { dev: true, business: true }`. Brainstorming checks for existing prefs before asking, and only asks if none exist. The single prompt shows defaults inline and accepts deterministic modifiers (see `skills/brainstorming/SKILL.md` Workflow Preferences section for the parsing table). Override mechanism: user says `change prefs` or invokes `project-setup preferences`.
```

- [ ] **Step 2: Verify**

```bash
grep -c "single confirm-or-tweak prompt" /Users/techno1731/.claude/projects/-Users-techno1731-Code-Personal-ultrapowers/memory/feedback_workflow_prefs.md
```

Expected: `1`.

- [ ] **Step 3: No commit** — memory files are outside the repo.

---

## Task 12: Finish the development branch

**Goal:** Run final tests, merge or PR per user preference.

- [ ] **Step 1: Announce** "I'm using the finishing-a-development-branch skill to complete this work."

- [ ] **Step 2: Invoke `@ultrapowers:finishing-a-development-branch`** and follow its process.

The sub-skill reads `.claude/ultrapowers-preferences.json` and picks the right option (auto-push → PR; manual → leave branch for user to push). Since this plan's Task 0 set `autoPush: true`, expect the finish-branch flow to:

1. Run a final lint / syntax check on all modified SKILL.md files (no automated test runner — use `grep` sanity checks like those in individual tasks).
2. Push the branch: `git push -u origin feat/workflow-defaults-and-sibling-integration`.
3. Offer PR creation. If accepted, the PR body should cite the spec path, the research brief, the skills-audit, and the smoke-test summary.

---

## Plan Review Self-Check

- [x] Every task has exact file paths.
- [x] Every edit shows exact `old_string` / `new_string` or full file content for new files.
- [x] Commit steps are conditional (marked "only if auto-commit enabled").
- [x] Design docs are NOT in any commit step (spec, research brief, skills-audit, smoke-tests — all local per `commitDesignDocs: false`).
- [x] No "TBD" / "add appropriate handling" / "similar to Task N" / vague instructions.
- [x] Skill pointers (`@ultrapowers:writing-skills`, etc.) appear in the header and relevant tasks.
- [x] Task 0 handles branch + prefs file creation up front so subsequent tasks have a predictable environment.
- [x] Task 9 (regression check) is read-only; no accidental edits to consumer skills.
- [x] Task 10 (smoke tests) includes a note that the smoke-tests summary file is NOT committed (it's a design doc).
- [x] Task 11 updates memory outside the repo — correctly no-commit.
