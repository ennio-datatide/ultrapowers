# Ultrapowers: Workflow Defaults, Sibling-Pack Integration & Architecture Presets — Design

**Date:** 2026-04-23
**Status:** Approved (pending spec reviewer + user final review)
**Scope:** Modify `ultrapowers` base-plugin skills so (1) workflow preferences default to a sensible "Ennio stack" flavor with a single confirm-or-tweak prompt, (2) sibling packs `ultrapowers-dev` and `ultrapowers-business` are detected transparently and referenced in specs/plans, (3) user-level architecture presets drive smart tool suggestions that are continually validated by deep-research.

---

## 1. Motivation

Three pain points with the current flow:

1. **Workflow preference fatigue.** Brainstorming asks three separate questions every time preferences are missing (`autoCommit`, `autoPush`, `commitDesignDocs`). The user has repeatedly accepted the same defaults and doesn't want to tune every session. A memory note already captured this feedback — the preferences file was the first fix, but the prompt UX is still heavy.
2. **Sibling packs are invisible to the user.** `ultrapowers-dev` and `ultrapowers-business` contain ~90 skills between them, but there's no mechanism in the base-plugin skills that (a) detects their presence, (b) suggests installation when clearly relevant, or (c) automatically references the right skills in design/implementation docs. Users only benefit from these packs if they already know they exist.
3. **No captured architecture preferences.** The user has a consistent personal stack across three reference projects (`ultrapowers-web`, `datatide-web`, `WebPage` / `enniomaldonado.com`) but every brainstorming session re-discovers it from scratch. Tool choices are not captured, not suggested, and not revalidated over time as the ecosystem moves.

## 2. Goals

- Preferences: single confirm-or-tweak prompt with Ennio-biased defaults (auto-commit + auto-push on; no design-doc commits).
- Sibling packs: transparent detection → reference installed skills silently in specs; blocking prompt to suggest install when clearly relevant and absent.
- Architecture presets: user-level profiles matched by signals in the idea, baked into spec, and revalidated by deep-research on every run.
- No regression in consumer skills that read `ultrapowers-preferences.json`.

## 3. Non-goals

- Automated test harness for the skills (they're markdown; manual smoke tests only).
- Auto-editing architecture defaults based on research (research surfaces suggestions; user approves changes).
- Cross-repo preference sharing beyond the user-level file + repo-level override (no "organization profile" mechanism).
- Modification of `ultrapowers-dev` or `ultrapowers-business` skills themselves — only the base `ultrapowers` skills change.

## 4. Architecture overview

The base plugin already has a preference file at `.claude/ultrapowers-preferences.json`. This design extends that pattern with two new config files and adds logic in three existing skills. No new skills are created.

```
ultrapowers/
└── skills/
    ├── brainstorming/SKILL.md          ← modified (biggest change)
    ├── skills-audit/SKILL.md           ← modified (sibling-pack recognition)
    ├── deep-research/SKILL.md          ← modified (defaults audit sub-step)
    ├── writing-plans/SKILL.md          ← modified (auto-annotate tasks)
    ├── executing-plans/SKILL.md        ← checked (no change expected)
    ├── subagent-driven-development/SKILL.md ← checked (no change expected)
    ├── project-setup/SKILL.md          ← checked (no change expected)
    └── finishing-a-development-branch/SKILL.md ← checked (no change expected)

Config files (all user-owned, never created by skills without consent):
  ~/.claude/ultrapowers-architecture-defaults.json      (user-level, seeded)
  <repo>/.claude/ultrapowers-preferences.json           (per-repo, existing format extended)
  <repo>/.claude/ultrapowers-architecture-defaults.json (optional repo override)
```

### Data flow

```
brainstorming (load prefs, load arch-defaults, match profile, ask clarifying Qs, present design)
    │
    ├──→ Scan sibling-pack signals → installed_matches + missing_matches
    │       │
    │       ├── installed → silently add to spec "Referenced Skills"
    │       └── missing  → BLOCKING prompt (install / skip / skip-and-remember)
    │
    ├──→ Write spec (with profile stack + referenced skills)
    │
    └──→ deep-research
            │
            ├── Validate architecture defaults (per tool in profile)
            │       ├── ✅ current
            │       ├── ⚠️  new major version
            │       └── 🚫 deprecated → surface & block
            │
            └──→ skills-audit (recognizes ultrapowers-dev:* / ultrapowers-business:*)
                    │
                    └──→ writing-plans (auto-annotates tasks with @skill pointers)
```

## 5. Detailed design

### 5.1 Workflow preferences — new defaults & prompt UX

**File shape (extended, backward-compatible):**
```json
{
  "autoCommit": true,
  "autoPush": true,
  "commitDesignDocs": false,
  "suggestSiblingPacks": { "dev": true, "business": true }
}
```

Missing keys fall back to the documented defaults. Legacy files without `suggestSiblingPacks` continue to work — on first read, brainstorming may prompt once and then persist the extended shape.

**New prompt (brainstorming step 4, when file is missing):**

> Workflow defaults for this repo: **auto-commit on**, **auto-push on**, **commit design docs off**.
> Reply `ok` to accept, or tell me what to change (e.g., `no auto-push`, `commit docs too`, `all off`).

**Deterministic reply parsing** (documented in the skill so behavior is reproducible):

| User reply | Resulting settings |
|---|---|
| `ok` / `yes` / `accept` / empty | all defaults as-is |
| `no auto-commit` / `manual commits` | `autoCommit: false` |
| `no auto-push` / `manual push` | `autoPush: false` |
| `commit docs` / `include design docs` | `commitDesignDocs: true` |
| `all off` | all three false |
| `all on` | `autoCommit: true`, `autoPush: true`, `commitDesignDocs: true` |
| Anything ambiguous | ask one targeted follow-up question |

Multiple modifiers can be combined: `no auto-push, commit docs` → `autoPush: false`, `commitDesignDocs: true`.

**Loaded-prefs announcement** (when file exists):

> Using saved workflow prefs (auto-commit: on, auto-push: on, commit docs: off). Say `change prefs` to update.

### 5.2 Sibling-pack detection & transparent integration

**Detection signal.** The session's available-skills list already surfaces sibling-pack skills with `ultrapowers-dev:` / `ultrapowers-business:` prefixes when installed. Presence of any such prefix in the available-skills list = pack installed. No filesystem probing.

**Keyword → skill map (conservative starter set).** Lives in a new file `skills/brainstorming/sibling-pack-map.md` referenced from `brainstorming/SKILL.md`. Format: markdown table that the skill reads verbatim.

`ultrapowers-dev` (language/framework/concern keywords):

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
| flutter | `ultrapowers-dev:dart-best-practices` (no Flutter-specific skill today — Dart skill is closest match; revisit if a Flutter skill ships) |
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

`ultrapowers-business` (marketing/sales/compliance keywords):

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

Match is case-insensitive, whole-word/phrase. At least one keyword in the approved design or spec must match for a suggestion to fire.

**New brainstorming step (between "Present design" and "Write design doc"):**

1. Bucket matched skills into `installed_matches` (prefix found in available-skills list) and `missing_matches` (prefix absent).
2. `installed_matches` → silently add a `## Referenced Skills` section to the spec with the list + a one-line rationale per skill.
3. `missing_matches` — if non-empty AND the corresponding pack's `suggestSiblingPacks` flag is `true`:
   Emit a blocking prompt **per missing pack, sequentially** (e.g., if both `ultrapowers-dev` and `ultrapowers-business` are missing and relevant, prompt for `ultrapowers-dev` first, wait for response, then prompt for `ultrapowers-business`). Do not combine into a single prompt — packs are independent and the user may want to install one and skip the other.

   > This project looks like it would benefit from the **ultrapowers-dev** pack. Detected signals: `react`, `next.js`, `testing`. Options:
   > 1. Install — I'll pause while you run `/plugin` to install it, then say `installed`.
   > 2. Skip — proceed without; I won't reference these skills in the spec.
   > 3. Skip and stop suggesting — sets a repo-level flag so I don't suggest this pack again.

   Wait for user response. On `installed`, re-read available skills and re-bucket. On `skip`, drop the suggestions for this session. On `skip and stop suggesting`, write `suggestSiblingPacks.<pack>: false` to the prefs file, drop for this session, proceed.

4. If no matches → skip silently.

**`skills-audit` changes:**

- In the "External" classification, explicitly document that any skill whose name starts with `ultrapowers-dev:` or `ultrapowers-business:` is External.
- When producing the "Skills to Reference in Plan" list, prefer sibling-pack skills over base-plugin equivalents when both match (e.g., prefer `ultrapowers-dev:testing-tdd` over a less-specific reference).
- Surface the profile's `skills` list (from architecture defaults, if any) as a pre-populated External set at the top of the audit — skills-audit starts from this baseline rather than an empty slate.

**`writing-plans` changes:**

- Where a task touches a matched language/framework/concern, prepend `@<skill-name>` pointers in the task description (e.g., `@ultrapowers-dev:nextjs-patterns`). Source of truth = skills-audit output.
- Tasks that don't touch any matched area get no annotation. Do not sprinkle pointers gratuitously.

### 5.3 Architecture defaults — profiles, matching, and continual validation

**User-level file:** `~/.claude/ultrapowers-architecture-defaults.json` — seeded with the two profiles derived from the reference projects. Structure:

```json
{
  "profiles": [
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
    },
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
  ]
}
```

**Repo-level override:** `<repo>/.claude/ultrapowers-architecture-defaults.json` — if present, its profiles replace the user-level ones for that repo. No deep-merge; whole-file override keeps mental model simple.

**Profile matching (new brainstorming step between "Explore project context" and "Ask clarifying questions"):**

1. Read repo-level override if present, else user-level defaults, else skip.
2. For each profile, count signal matches against the user's described idea (case-insensitive word boundary).
3. If exactly one profile matches ≥1 signal, present:

   > This looks like a **marketing/content site**. My default stack for these is Astro + Tailwind v4 + TypeScript + Neon/Drizzle + Resend on Netlify (based on `datatide-web`, `enniomaldonado.com`). Want to use this stack, or discuss alternatives?

   - `use defaults` / `yes` → stack + skills baked into the spec's Architecture section; profile skills seed `skills-audit`.
   - `discuss alternatives` / `no` → proceed to normal clarifying questions; no stack baked in.
4. If ≥2 profiles match → show both with match counts and ask which fits, or `neither`.
5. If 0 matches → skip silently.

**Continual validation (new deep-research sub-step):**

Profile `stack` entries store **tool identity only** (no version pins). Each deep-research run resolves the current latest version for each tool and reports it inline in the research brief. This keeps the seed file future-proof — it never goes stale, and the research output is the single source of truth for "what version should we use right now."

After the main research runs, if a profile was selected, deep-research executes a **"Resolve architecture defaults"** pass. For each tool in the profile's `stack`:

- Query: (1) current latest stable version, (2) deprecation / replacement status, (3) one-line sanity check on "still recommended for <use case>".
- Classify:
  - ✅ **Current & recommended** — latest version noted, no user action required.
  - 🚫 **Deprecated / replaced** — e.g., `Vercel KV discontinued; use Marketplace Redis`. Blocking.

Results land in the research brief under a new **"Architecture Defaults Resolved"** section:

```
| Tool        | Latest  | Status | Notes                                    |
| ----------- | ------- | ------ | ---------------------------------------- |
| astro       | 6.1.9   | ✅     | Recommended for content sites            |
| next.js     | 16.2.4  | ✅     | App Router standard                      |
| vercel-kv   | —       | 🚫     | Discontinued — use marketplace-redis     |
```

If any 🚫 shows up, research pauses and prompts:

> Your default stack has a deprecated tool:
> - 🚫 `vercel-kv`: discontinued — suggested replacement: `marketplace-redis`
>
> Options:
> 1. Update `~/.claude/ultrapowers-architecture-defaults.json` to replace it.
> 2. Use the replacement for this project only (repo-level override).
> 3. Stick with current defaults.

Defaults file is **never auto-edited** — user approves each change. Simple major-version bumps (non-deprecating) are **not** blocking; they show up as ✅ with the latest version noted and flow naturally into the implementation plan. There is no separate ⚠️ classification — either the tool still works (✅) or it doesn't (🚫).

## 6. Files & changes

| File | Change type | Summary |
|---|---|---|
| `skills/brainstorming/SKILL.md` | Modify | New defaults; confirm-or-tweak prompt; profile matching step; sibling-pack scan step; blocking install prompt |
| `skills/brainstorming/sibling-pack-map.md` | Create | Keyword → skill map (tables in §5.2) |
| `skills/brainstorming/architecture-profile-matching.md` | Create | Detailed matching pseudocode + fallback rules |
| `skills/skills-audit/SKILL.md` | Modify | Recognize `ultrapowers-dev:*` / `ultrapowers-business:*` prefixes; seed from profile skills |
| `skills/deep-research/SKILL.md` | Modify | Add "Resolve architecture defaults" sub-step; research-brief table; blocking prompt on 🚫 only |
| `skills/writing-plans/SKILL.md` | Modify | Auto-annotate tasks with `@<skill-name>` pointers from skills-audit output |
| `skills/executing-plans/SKILL.md` | Verify | No behavioral change expected; confirm prefs-reading still matches file shape |
| `skills/subagent-driven-development/SKILL.md` | Verify | Same |
| `skills/project-setup/SKILL.md` | Verify | Same |
| `skills/finishing-a-development-branch/SKILL.md` | Verify | Same |
| `~/.claude/ultrapowers-architecture-defaults.json` | Seed (once) | Seeded with the two profiles above; user-owned afterward |

## 7. Edge cases & error handling

- **Malformed prefs JSON.** Skill falls back to documented defaults and warns once: *"Couldn't parse `.claude/ultrapowers-preferences.json` — using defaults. Fix the file or say `reset prefs` to overwrite."* No auto-overwrite.
- **Malformed architecture-defaults JSON.** Same pattern — fall back to "no profile," warn once.
- **Sibling pack partially installed** (e.g., `ultrapowers-dev:react-patterns` present but `ultrapowers-dev:react-best-practices` absent — unusual but possible). Treat as pack installed; skip missing individual skills silently. Don't fire the install prompt for a partial pack.
- **User has `suggestSiblingPacks.dev: false` but later wants suggestions back.** Document in the brainstorming skill that `reset sibling suggestions` flips both flags to `true` without touching other prefs.
- **Profile mismatch across sessions.** If last session used a profile but this session's idea doesn't match it, don't auto-apply the last profile. Match fresh each time.
- **Repo-level override shadows a profile the user wanted.** The override wins by design. Document the precedence clearly in the skill.
- **Deep-research resolution times out or fails for a tool.** Per-tool best-effort — on failure, mark that row as "unable to verify" in the resolved table and proceed. Don't block the full research step on this sub-step. Fall back to no pinned version in the implementation plan; the plan step that installs the dep resolves latest at install time.
- **Ambiguous reply to confirm-or-tweak prompt** (e.g., "push but not commit"). Skill asks one targeted follow-up question (*"To confirm: auto-push on, auto-commit off, commit docs off — correct?"*), doesn't guess.

## 8. Testing & validation

No automated test harness. Manual smoke tests before declaring done:

1. **Prefs: fresh repo.** Delete `.claude/ultrapowers-preferences.json`. Invoke brainstorming. Verify new prompt appears with new defaults. Reply `ok`. Verify file is written with `autoCommit: true, autoPush: true, commitDesignDocs: false, suggestSiblingPacks: { dev: true, business: true }`.
2. **Prefs: modifier reply.** Same as #1 but reply `no auto-push, commit docs`. Verify file has `autoPush: false, commitDesignDocs: true`.
3. **Prefs: ambiguous reply.** Reply `push but not commit`. Verify skill asks one follow-up question instead of guessing.
4. **Prefs: loaded announcement.** Second invocation in same repo. Verify "Using saved workflow prefs" message and no re-prompt.
5. **Profile match.** Fresh brainstorming session with idea: *"Build a marketing landing page for a new consultancy"*. Verify `marketing-content-site` profile is suggested with Astro stack. Accept. Verify spec's Architecture section contains the full stack.
6. **Profile override.** Same as #5 but create a repo-level `architecture-defaults.json` with a dummy profile `{id: "repo-only", signals: ["landing"], stack: {framework: "hugo"}, skills: []}`. Verify repo override wins and Hugo is suggested.
7. **Sibling pack: installed & relevant.** Idea: *"React/Next.js app with Clerk + Stripe"*. Verify `## Referenced Skills` section in spec lists `ultrapowers-dev:nextjs-patterns`, `clerk-nextjs-patterns`, `stripe-nextjs-patterns` (silently, no install prompt).
8. **Sibling pack: missing & relevant.** Simulate `ultrapowers-dev:*` prefix absent from available-skills list (e.g., by inspecting a session that has the main pack but not dev). Verify blocking prompt fires with matched signals. Reply `skip and stop suggesting`. Verify `suggestSiblingPacks.dev: false` is written.
9. **Sibling pack: stop-suggesting flag.** With flag false from #8, invoke brainstorming again with React signals. Verify no install prompt fires.
10. **Defaults resolved: current tools.** Run deep-research with the `saas-product-app` profile active. Verify "Architecture Defaults Resolved" table exists in the research brief with a latest-version entry per tool, all ✅.
11. **Defaults resolved: deprecation detection.** Manually edit the user-level defaults to include a known-deprecated tool (e.g., add `"cache": "vercel-kv"` to a profile). Run deep-research. Verify 🚫 classification, blocking prompt with three options, user-approved update writes the replacement back correctly.
12. **Consumer regression.** Grep `writing-plans`, `executing-plans`, `project-setup`, `finishing-a-development-branch`, `subagent-driven-development` for `ultrapowers-preferences.json`. Confirm they read `autoCommit` / `autoPush` / `commitDesignDocs` and handle the extended `suggestSiblingPacks` key gracefully (ignore it — they don't need it).

Manual checklist lives as a section in the implementation plan (produced by `writing-plans` after research).

## 9. Rollout

- Single PR (or local-only if `commitDesignDocs: false` sticks) with all skill edits.
- `~/.claude/ultrapowers-architecture-defaults.json` is seeded on first run of the modified brainstorming (prompt: *"I don't see your architecture defaults file. Want me to seed one with profiles based on `ultrapowers-web`, `datatide-web`, `enniomaldonado.com`? (yes / skip)"*). Not seeded silently.
- No migration needed for `ultrapowers-preferences.json` — extended shape is backward-compatible.

## 10. Open questions (none blocking — noted for tracking)

- Should the keyword map live inline in `brainstorming/SKILL.md` or in a separate `sibling-pack-map.md` reference? Decided: separate file to keep SKILL.md focused.
- Should profile matching be AI-inferred instead of keyword-based? Decided: keyword-based for v1 — deterministic, debuggable, user can extend. Revisit if false-match rate is high.
- Should `ultrapowers-business` suggestions fire for business-aimed specs that aren't traditional dev projects (e.g., "write a pricing strategy")? Decided: yes — keyword map already covers these, and the blocking prompt mechanism handles the "not installed" case gracefully.
- Should profile `stack` entries pin major versions or store tool identity only? Decided: **identity only**. Each deep-research run resolves current latest — the seed file stays future-proof and doesn't accrete stale pins. Drift detection shrinks to deprecation checks (🚫); "new major" warnings are dropped as noise. Re-evaluate if the implementation plan needs pinned versions for other reasons (e.g., reproducible profile matching).
- Simulating "sibling pack absent" for smoke test #8: the cleanest method is to temporarily uninstall the pack via `/plugin remove ultrapowers-dev` in a scratch session, run the test, then reinstall. This is documented in the implementation plan's manual-test section so future testers don't have to figure it out.

## 11. Referenced skills (this spec)

- `ultrapowers:brainstorming` (current — being modified)
- `ultrapowers:skills-audit` (current — being modified)
- `ultrapowers:deep-research` (current — being modified)
- `ultrapowers:writing-plans` (current — being modified)
- `ultrapowers:writing-skills` (use when editing the skill markdown files)
- `ultrapowers:verification-before-completion` (use before claiming the manual smoke tests pass)
