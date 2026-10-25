# Upstream Sync Log

Chronological audit of `obra/superpowers` upstream changes, reviewed and either incorporated, adapted, or consciously skipped. Each entry advances the "last audited SHA" so future syncs only evaluate commits newer than the entry.

The mechanism: after each audit, the final step is `git merge -s ours upstream/main -m "<audit summary>"`. That records the formal merge without altering our tree — our "X commits behind" counter returns to 0 and only reflects commits we genuinely haven't looked at yet.

---

## 2026-04-24 — audit through `6efe32c`

**Audited range:** `eae439f..6efe32c` (53 commits since the previous merge on 2026-04-10).
**Auditor:** Ennio (via Claude Code session).
**Result:** `git merge -s ours upstream/main` — nothing added to our tree; all upstream changes either already present, superseded by local decisions, or inapplicable to our diverged feature set.

### Incorporated

**None this round.** The three upstream commits initially flagged as "take" all turned into no-ops:

- `4fd9aa2` — *fix(writing-skills): correct false 'only two fields' frontmatter claim*. The corrected text ("only the metadata (name and description)") is already present in our `skills/writing-skills/anthropic-best-practices.md` — it arrived via the earlier `b32726c` cherry-pick of the inline-self-review refactor. Cherry-pick came up empty.

### Skipped — not applicable after our local changes

- `9e3ed21` — *Separate brainstorm server content and state into peer directories* (hygiene fix). We **removed** the Visual Companion feature entirely in `cc538ae` (brainstorm server scripts, `visual-companion.md`, and the SKILL.md section). There is no brainstorm server in our fork to restructure. Mark the idea (separate publicly-served content from private server state) as noted, in case Visual Companion ever comes back in a different form.
- `9f04f06` — *Fix owner-PID lifecycle monitoring for cross-platform reliability*. Same reason — no brainstorm server.
- `f076bd3` — *Fix owner-PID false positive when owner runs as different user*. Same reason.
- `151cfb1` — *Move brainstorm server metadata to .meta/ subdirectory*. Upstream itself reverted this (`9e6e077`); superseded by `9e3ed21`. Also inapplicable for us.

### Skipped — divergent feature set

- All `sync-to-codex-plugin/*` commits (`6efe32c`, `34c17ae`, `bc25777`, `bcdd7fa`, `6149f36`, `777a977`, `ac1c715`, `8c8c5e8`, and related). Upstream's tooling to mirror superpowers → Codex plugin. Our fork is `ultrapowers`, a distinct plugin line; we don't mirror into Codex through upstream's tooling.
- `Merge pull request #1165 from obra/mirror-codex-plugin-tooling` (`f9b088f`) — ditto.
- `a569527` + `a5d36b1` (`chore: remove vestigial CHANGELOG.md`) — fork maintains its own changelog / release cadence.
- `da283df` (*remove things we dont need*) — vague upstream cleanup; our tree is independent.

### Skipped — upstream-only identity / governance

- Discord link updates (`917e5f5`, `a6b1a1f`) — fork uses its own community channels.
- README announcement/discord changes (`b7a8f76`, `4b1b20f`, `eeaf2ad`) — upstream-specific marketing.
- Contributor guidelines & guardrails (`dd23728`, `c0b417e`) — adopt later if we need to solicit external PRs; skipping for solo-dev phase.
- Issue / PR templates, Code of Conduct (`8ea3981`, `7642153`, `eccd453`) — same rationale as above.
- v5.0.6 / v5.0.7 release notes (`eafe962`, `1f20bef`) — upstream's release history; our fork has its own `RELEASE-NOTES.md` cadence.
- Formatting/whitespace-only commits (`b557648`, `9f42444`, `99e4c65`, `a5dd364`, `c4bbe65`) — no behavior change.
- Docs-only commits about codex tools and docs for codex app compatibility (`2b1bfe5`, `bd080e3`, `eb2b44b`, `80c0a45`, `c28b28f`, `33e9bea`, `74a0c00`, `f0df5ec`, `65d760f`) — targeting upstream's codex-publishing project, not relevant to our fork.

### Already present via earlier cherry-pick

- `e6221a4` / `3f80f1c` (*Replace subagent review loops with lightweight inline self-review*) — landed in our fork as `b32726c` before the 2026-04-10 sync. Fork also picked up the associated writing-plans "No Placeholders" section. No action needed.
- `4ae1a3d` / `b045fa3` (reverts of the self-review refactor) — superseded by the reapply that's already in our fork. Explicitly rejected.

### Already present via earlier release sync

- `0a1124b` (*fix(opencode): inject bootstrap as user message*) — in our fork as `4e50a56`.
- `2d942f3` (*fix(opencode): align skills path across bootstrap, runtime, and tests*) — in our fork as `63e52e0`.
- `8b16692` (*feat: add Copilot CLI tool mapping*) — in our fork as `d6e5c14`.
- `a2964d7` (*fix: add Copilot CLI platform detection*) — included via the same import path that landed Copilot support.

### Ideas noted for future consideration

- **Separate publicly-served content from private server state** — if we ever add back a local-server feature (visual companion alternative, browser-based preview, etc.), mirror this structure: serve a `content/` directory, keep operational state in a peer directory outside the HTTP route.

---

## Process for future syncs

1. `git fetch upstream`
2. `git log <last-audited-SHA>..upstream/main --oneline` — enumerate new work.
3. Classify each commit: **incorporated** (cherry-pick or adapt), **skipped with rationale** (listed above categories), or **noted for future** (idea worth revisiting).
4. Cherry-pick or adapt the "incorporated" items with fork-native commit messages that reference upstream SHAs.
5. `git merge -s ours upstream/main -m "chore: upstream audit through <SHA>; see docs/ultrapowers/upstream-sync-log.md"` to record the formal merge and reset the "behind" counter.
6. Append a new entry to this log with the date, audited SHA range, and classifications.
7. Push.

**Rule of thumb:** adapt ideas, don't copy implementations. Preserve the fork's essence (workflow-defaults UX, sibling-pack integration, architecture profile inspiration, tone calibration, auto-pick behavior). Upstream's code is the source — ours is the product.

---

## 2026-09-07 — Final entry: pivot to the Pocock method

Ultrapowers 2.0 is rebuilt on [mattpocock/skills](https://github.com/mattpocock/skills). **The upstream-sync relationship with `obra/superpowers` ends here.** No further merges or audits are performed against it.

The new upstream reference of interest is `mattpocock/skills`, tracked by **audit rather than merge**: read his changes, decide what applies to a non-technical audience, port deliberately. There is no shared git history to reconcile, so no `merge -s ours` bookkeeping is needed.

Note on licensing: the inherited code has now been replaced, not merely renamed. Measured line-for-line against `obra/superpowers`, substantive identical content went from **814 lines to zero**; what remains are skill names, headings that restate them, and three lines of git plumbing that have only one correct spelling. Six skills were replaced outright (`systematic-debugging`, `test-driven-development`, `writing-skills` from Pocock's equivalents; `verification-before-completion`, `dispatching-parallel-agents`, `executing-plans` written fresh) along with `subagent-driven-development` and its three prompt templates, `using-git-worktrees`, `finishing-a-development-branch`, and the Codex tool reference.

The MIT copyright notice for that work has therefore been removed from `LICENSE`, which now carries Ultrapowers' own notice and Matt Pocock's for the ported material.

---

## 2026-10-25 — mattpocock/skills audit through `5beb35b`

- **Base:** `3cca18b` (4 Sep 2026), the upstream commit the rebuild (`a08ee87`, 7 Sep) was adapted from.
- **Audited through:** `5beb35b` (19 Oct 2026), on 25 Oct 2026.
- **Taken:** wizard `template.sh` from `49dd158`/`868c4cf` (private `.env`, safe quoting, stops at end of input); grilling words questions so `ok` accepts (`95249b0`); TDD notes what each seam catches and misses (`3f59913`); debugging proves a forced red (`f3fc563`); handoff temp directory and path (`4f4e943`, `0f5e033`); review sub-agents in the foreground (`3da8c01`).
- **Not taken, on purpose:** `CONTEXT.md` renamed to `GLOSSARY.md` (`d80fa0f`; student projects already have `CONTEXT.md`); removal of `resolving-merge-conflicts` (`daa01d8`; our users cannot resolve conflicts by hand); `implement-spec` parallel worktrees (more failure modes than a non-technical user can recover from); `pr`, `chief-of-staff`, `teach`, `wayfinder`, `triage`. `retro` may come later, rewritten in plain language.

Impeccable is installed as a dependency, not adapted (see NOTICE), pinned to `3671d50` (4.7.1).
