# Smoke Test Results — Workflow Defaults, Sibling-Pack Integration & Architecture Presets

**Date run:** 2026-04-24 (file-content checks only)
**Status:** 9/9 automatable checks ✅. 11 behavioral tests require a fresh Claude Code session and/or user action — marked with 🧑 below.
**Related spec §8 tests:** 1–11.

---

## Automated (this session)

| # | Check | Method | Result |
|---|---|---|---|
| A1 | `brainstorming/SKILL.md` has new confirm-or-tweak prompt | `grep -c "Workflow defaults for this repo"` → 1 | ✅ |
| A2 | `brainstorming/SKILL.md` checklist has 12 items | sed+grep on checklist block → 12 | ✅ |
| A3 | `project-setup/SKILL.md` has sibling-pack modifiers | `grep -c "stop suggesting dev"` → 2 | ✅ |
| A4 | `sibling-pack-map.md` exists with ≥90 table rows | `grep -c "^| "` → 94 | ✅ |
| A5 | `architecture-profile-matching.md` has both seed profiles | `grep -c '"id": "marketing-content-site"\|"id": "saas-product-app"'` → 2 | ✅ |
| A6 | `skills-audit/SKILL.md` classifies sibling prefixes External | `grep -c "Sibling-pack prefixes are always External"` → 1 | ✅ |
| A7 | `deep-research/SKILL.md` has "Resolve Architecture Defaults" sub-step | grep → 1 | ✅ |
| A8 | `writing-plans/SKILL.md` has task-annotation section | grep → 1 | ✅ |
| A9 | `.claude/ultrapowers-preferences.json` valid JSON, correct defaults | python parse + key assert → OK | ✅ |

---

## Behavioral — run in a fresh Claude Code session 🧑

These test what Claude does when it *reads* the modified skills — not verifiable from within this session, because skills are prose that future sessions consume.

For each test, open a fresh scratch repo (or the scratch dir `/tmp/ultrapowers-smoke-tests`) and start a fresh Claude Code session with the `ultrapowers` plugin active from this branch.

### §8.1 — Prefs fresh-repo prompt
1. `mkdir /tmp/smoke-1 && cd /tmp/smoke-1 && git init -q && git commit --allow-empty -m init -q`
2. Start Claude Code. Say: "let's build something small." Confirm brainstorming activates.
3. **Expected:** when prefs question fires, the exact prompt is:
   > "Workflow defaults for this repo: **auto-commit on**, **auto-push on**, **commit design docs off**. Reply `ok` to accept, or tell me what to change (e.g., `no auto-push`, `commit docs too`, `all off`)."
4. Reply `ok`. Verify `.claude/ultrapowers-preferences.json` is written with `autoCommit: true`, `autoPush: true`, `commitDesignDocs: false`, `suggestSiblingPacks: { dev: true, business: true }`.

### §8.2 — Modifier reply parsing
1. Delete `.claude/ultrapowers-preferences.json` from the scratch repo.
2. Re-invoke brainstorming. Reply: `no auto-push, commit docs`.
3. **Expected:** file shows `autoCommit: true, autoPush: false, commitDesignDocs: true, suggestSiblingPacks: { dev: true, business: true }`.

### §8.3 — Ambiguous reply
1. Delete prefs, re-invoke. Reply: `push but not commit`.
2. **Expected:** Claude asks a targeted follow-up like *"To confirm: auto-push on, auto-commit off, commit docs off — correct?"* — does not guess.

### §8.4 — Loaded-prefs announcement
1. With a valid prefs file in place, re-invoke brainstorming.
2. **Expected:** *"Using saved workflow prefs (auto-commit: on/off, …). Say `change prefs` to update."* — no re-prompt.

### §8.5 — Profile match
1. Ensure `~/.claude/ultrapowers-architecture-defaults.json` exists with the two seeded profiles (Claude will offer to seed on first run).
2. Fresh scratch repo. Invoke brainstorming: *"Build a marketing landing page for a new consultancy."*
3. **Expected:** Claude suggests `marketing-content-site` profile with Astro stack before asking clarifying questions. Accept. Spec's Architecture section mentions Astro + Tailwind + TS + Neon/Drizzle + Resend + Netlify.

### §8.6 — Profile override (repo-level)
1. In a scratch repo, create `.claude/ultrapowers-architecture-defaults.json`:
   ```json
   {"profiles":[{"id":"repo-only","description":"repo-only hugo site","signals":["landing"],"stack":{"framework":"hugo"},"skills":[],"reference_projects":[]}]}
   ```
2. Invoke brainstorming: *"Build a landing page."*
3. **Expected:** Claude suggests the `repo-only` Hugo profile (not Astro).

### §8.7 — Sibling pack installed & relevant
1. In a scratch repo with `ultrapowers-dev` and `ultrapowers-business` both installed, brainstorm: *"React/Next.js app with Clerk and Stripe."*
2. **Expected:** spec's `## Referenced Skills` section lists `ultrapowers-dev:nextjs-patterns`, `clerk-nextjs-patterns`, `stripe-nextjs-patterns` silently — no install prompt.

### §8.8 — Sibling pack missing & relevant
1. Temporarily uninstall: `/plugin remove ultrapowers-dev`.
2. Scratch repo. Brainstorm: *"Build a React app."*
3. **Expected:** blocking prompt fires with detected signals and three options.
4. Reply `skip and stop suggesting`. Verify `.claude/ultrapowers-preferences.json` has `suggestSiblingPacks.dev: false`.
5. **Restore:** `/plugin install ultrapowers-dev@ultrapowers`.

### §8.9 — Stop-suggesting flag respected
1. Continuing from §8.8 with `suggestSiblingPacks.dev: false`, invoke brainstorming with React signals.
2. **Expected:** NO install prompt.
3. **Reset:** edit prefs to `suggestSiblingPacks.dev: true`.

### §8.10 — Defaults resolved (current tools)
1. Run deep-research with `saas-product-app` profile active.
2. **Expected:** "Architecture Defaults Resolved" table in the brief with one row per tool in the profile's `stack`, all ✅, latest version noted.

### §8.11 — Defaults resolved (deprecation detection)
1. Edit `~/.claude/ultrapowers-architecture-defaults.json` to add `"cache": "vercel-kv"` to `saas-product-app`'s stack.
2. Run deep-research.
3. **Expected:** 🚫 row for `vercel-kv`, blocking prompt with three options. Pick option 1 (update user-level file) — Claude shows diff, asks `apply`. Confirm. File updates to replace `vercel-kv` with `marketplace-redis` (or equivalent).
4. Revert manually if not desired.

---

## Suggested order

1. §8.1 → §8.4 in one scratch repo (tests prefs UX; fast).
2. §8.5 → §8.6 in another scratch repo (tests profile matching).
3. §8.7 → §8.9 in a third scratch repo (tests sibling-pack detection — requires plugin uninstall).
4. §8.10 → §8.11 last (tests deep-research; slowest — waits on network lookups).

Record outcomes inline in this file.

---

## Current branch

`feat/workflow-defaults-and-sibling-integration` — all 6 commits present:

```
faf9280 feat: sibling-pack awareness in skills-audit, deep-research, writing-plans
46b1204 feat(brainstorming): add profile matching and sibling-pack scan steps
a0269db feat(brainstorming): add sibling-pack and architecture profile reference files
f854241 feat(project-setup): prefs mode uses confirm-or-tweak UX with sibling-pack flags
136d672 feat(brainstorming): confirm-or-tweak workflow prefs with new defaults
aaf664b chore: gitignore ultrapowers-preferences.json
```

Behavioral tests can proceed as soon as this branch is merged or used directly in a fresh session.
