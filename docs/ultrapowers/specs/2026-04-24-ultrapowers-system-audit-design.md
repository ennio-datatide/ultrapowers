# Ultrapowers System Audit — Design

**Date:** 2026-04-24
**Status:** Design approved, awaiting spec review
**Spec type:** Audit methodology (not feature implementation)

## Goal

Produce an honest, actionable assessment of the Ultrapowers plugin across three dimensions — skill quality, workflow coverage, and behavioral fidelity — prioritized by a dual rubric:

- **Rubric 2 — Pre-release hardening:** shipping blockers, contract breaks, regressions vs. README claims
- **Rubric 3 — OSS contributor readiness:** can a new contributor clone, navigate, and extend this?

When findings conflict between the two rubrics, **rubric 2 wins**. A user-facing broken contract is always worse than contributor friction; contributor onboarding is aspirational, the plugin is already in production.

## Deliverables

Two files:

1. `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md` — this file. Describes *how* the audit is conducted.
2. `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` — the audit's output. Full findings report with per-lane sections, each finding scored on severity × rubric, plus a top-20 punch list at the front.

## Success criteria

- Every skill in `skills/` has a scorecard entry in lane A, even if it's "no issues found."
- Lane B produces a pipeline diagram and an explicit orphan / dead-path / overlap / missing-flow list.
- Lane C produces one complete dogfood transcript summary and a harness-parity matrix for non-CC surfaces.
- Findings are deduped across lanes (same issue raised by A and B appears once with both sources cited).
- Punch list has no more than 20 items, sorted by severity × inverse-effort.
- Every finding cites its evidence (file path + line range, transcript reference, or graph-node reference).

## Non-goals

- **No fixes applied during the audit.** The punch list is input to a separate plan.
- **Sibling pack skills** (`ultrapowers-dev`, `ultrapowers-business`) are out of scope. Separate repos, separate lifecycles.
- **No upstream-drift analysis.** Tracked separately in `docs/ultrapowers/upstream-sync-log.md`.
- **Non-CC harnesses get static validation only, not live runs.** We can't execute Codex / Cursor / OpenCode / Gemini CLI from this session. The findings report states this limit explicitly.

## Scope & surface

Full surface audit across:

- **Skills** — all 18 in `skills/` (the 17 Ultrapowers skills + `using-ultrapowers`)
- **Docs & claims** — `README.md`, `RELEASE-NOTES.md`, `CHANGELOG.md`, `docs/ultrapowers/` (specs, plans, upstream-sync-log)
- **Hooks & agents** — `hooks/`, `agents/code-reviewer.md`
- **Plugin manifests** — `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- **Non-CC harnesses** — `.codex/`, `.cursor-plugin/`, `.opencode/`, `GEMINI.md`, `gemini-extension.json` (static validation only)

## Execution model

**One spec, one research pass, one plan, three parallel audit lanes dispatched during execution via `dispatching-parallel-agents`.** Seven subagents fan out concurrently, synthesis runs on the main agent.

### Lane A — Skill quality audit

**Audits:** all 18 skills in `skills/` + `agents/code-reviewer.md`

**Subagents:** 4 parallel, each handling a batch:

- **Batch 1 (research pipeline):** `brainstorming`, `deep-research`, `skills-audit`, `skills-creation`, `using-ultrapowers`
- **Batch 2 (planning/execution):** `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`
- **Batch 3 (TDD/debug/review):** `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`
- **Batch 4 (infra + meta):** `using-git-worktrees`, `finishing-a-development-branch`, `project-setup`, `writing-skills`, and `agents/code-reviewer.md`

**Rubric applied per skill:**

- **Frontmatter** — `name` and `description` present; description specific enough to trigger correctly (writing-skills "use when X" pattern).
- **Trigger clarity** — would a fresh agent know when to invoke this? Any overlap with sibling skills that would cause ambiguous triggers?
- **Checklist currency** — are numbered steps still accurate? Any steps referencing removed features or paths?
- **Cross-references** — links to other skills and files resolve? Paths still valid?
- **README alignment** — does the README's description of this skill match reality?
- **Examples / flowcharts** — present and current? DOT diagrams parse?
- **Platform adaptation** — does the skill work on non-CC harnesses as claimed, or is it silently CC-only?

**Output per skill:** scorecard following the findings schema (see Shared Artifacts).

### Lane B — Workflow coverage audit

**Audits:** the pipeline as a system. Skill-to-skill invocations, README's claimed workflow, what happens at each handoff, what's missing.

**Subagents:** 1.

**Methodology:**

- Build a directed graph: nodes = skills, edges = explicit invocations ("after X completes, invoke Y") stated *in the skill content itself* (SKILL.md files). The README's "Research-Driven Workflow" numbered list is a **separate** expected-graph; it is cross-checked against the skill-derived graph in the next step, not merged into it. Keeping the two graphs separate is how "README claims a handoff that doesn't exist in the skills" becomes a finding instead of being silently papered over.
- Cross-check the skill-derived graph against the README's "Research-Driven Workflow" numbered list. Any README edge without a matching skill-content edge is a finding; any skill-content edge that the README doesn't mention is also a finding (could be undocumented, could be dead).
- Identify **orphans** — skills that no other skill references and that aren't user-invokable entry points.
- Identify **dead paths** — skills that claim to invoke something that doesn't exist or has moved.
- Identify **missing flows** — common task shapes with no obvious entry point. Specifically probe: bugfix-only, docs-only, refactor-only, one-liner-change. Does the pipeline handle these, or force every task through full brainstorm+research?
- Identify **overlap** — two skills that could reasonably fire on the same trigger, causing ambiguity.

**Output:** pipeline diagram (mermaid or DOT), orphan list, dead-path list, missing-flow list, overlap list. Each item tagged with severity × rubric.

### Lane C — Behavioral dogfood + harness parity

**Two subagents.**

#### C.1 — Claude Code dogfood

**Fixed scenario (quoted verbatim to the subagent to prevent improvisation):**

> "Add a small change to an existing node/express starter: expose a `/health` endpoint that returns `{status: 'ok'}`. Include a test. Use the full Ultrapowers pipeline."

**Environment:** disposable scratch dir. Subagent creates a fresh minimal express app, runs the scenario, deletes it. No committed fixtures.

**Observations to log:**

- Which skills fired, in what order
- Questions asked (redundant? confusing?)
- Where subagents were dispatched
- Where the pipeline asked for human checkpoints
- Time-to-first-code (proxy for pipeline overhead)
- Number of user-attention moments (each ask = 1)

**Variant probe:** one additional short run — *"fix a failing test in the same repo"* — to exercise the bugfix flow. Does `systematic-debugging` fire, or does the pipeline force a fresh brainstorm?

**Output:** transcript summary + friction log, findings tagged by skill.

#### C.2 — Non-CC harness static parity

**Checks per harness:**

- `.codex/` — manifest validity, skill references, tool-name mapping (`references/codex-tools.md` exists and is current)
- `.cursor-plugin/` — manifest validity, skill exposure
- `.opencode/` — manifest validity
- `GEMINI.md` + `gemini-extension.json` — activation mechanism documented, tool mapping loaded automatically as claimed
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — valid, version fields coherent with README/RELEASE-NOTES

**Comparison:** the set of skills exposed on each non-CC harness vs. the Claude Code surface. Flag any CC skill without an equivalent path on another harness.

**Output:** harness-parity matrix (rows = skills, columns = harnesses, cells = exposed / missing / deferred) + structural issue list.

## Shared artifacts

All subagents write findings in the same shape so synthesis can dedupe and rank without reformatting. The prep step (first task of the plan) generates concrete templates from this section.

### Severity matrix

| Severity | Rubric-2 (pre-release) | Rubric-3 (OSS readiness) |
|---|---|---|
| **blocker** | Ships broken behavior to users, contract break, README claim false in a way that wastes user time | New contributor cannot complete a reasonable task without asking the maintainer personally |
| **high** | Skill fails in common path, silent wrong behavior, outdated recipe | Onboarding confusion in common areas; conventions undocumented |
| **medium** | Edge-case failure, stale reference, noisy trigger | Friction in secondary areas; stylistic inconsistency between skills |
| **low** | Typos, cosmetic, truly niche | Nice-to-have polish |

When a finding satisfies both rubrics, it takes the higher severity.

### Findings schema

```
id: A-001                         # lane letter + zero-padded counter
lane: A | B | C.1 | C.2
severity: blocker | high | medium | low
rubric: [2] | [3] | [2, 3]
title: one-line punchy statement
evidence: file_path:line_range OR transcript reference OR graph-node reference
finding: 2-4 sentence description of what's wrong
recommendation: 1-3 sentence concrete fix
effort_estimate: S | M | L         # S = <30min, M = <half-day, L = bigger
                                   # Estimate from the perspective of an experienced maintainer
                                   # of this repo, not a first-time contributor, to keep
                                   # estimates consistent across subagents.
source_subagent: batch-1 | batch-2 | lane-b | lane-c1 | lane-c2
```

### Duplicate detection

Two findings are duplicates if:

- they point to the same `evidence` (regardless of severity), OR
- their `title` fuzzy-matches AND they share the same severity.

Dedup rule in both branches: keep the one with higher severity; when severities are equal, keep the one with more specific evidence. Merge `source_subagent` and `lane` lists on the survivor so provenance isn't lost.

### Punch list construction

- Sort all findings by: `severity` desc, then `effort_estimate` asc (S before L), then lane order (A, B, C.1, C.2).
- Take top 20.
- Add a "quick wins" callout for rows where severity ≥ medium AND effort = S.
- Each punch list row links to its full entry in the findings report appendix.

### Report skeleton

Output file `2026-04-24-ultrapowers-system-audit-findings.md`:

```
1. Executive summary (≤300 words)
2. Punch list (top 20, table format)
3. Methodology & limits (dogfood scope, non-CC fidelity caveat)
4. Lane A — Skill quality
   4.1 Summary table (18 rows, skill → issue count by severity)
   4.2 Per-skill scorecards
5. Lane B — Workflow coverage
   5.1 Pipeline diagram
   5.2 Orphans / dead paths / missing flows / overlaps
6. Lane C.1 — Dogfood
   6.1 Transcript summary
   6.2 Friction log
7. Lane C.2 — Harness parity
   7.1 Parity matrix
   7.2 Structural issues
8. Appendix: all findings by ID (ordered for cross-referencing)
```

## Execution flow

1. **Prep step** — main agent, no subagent. Generate concrete rubric checklists and findings-schema templates from this spec; create the findings-report skeleton file; snapshot the skill inventory so subagents work from a fixed list.
2. **Fan-out (parallel)** — dispatch Lane A batches 1–4, Lane B, Lane C.1, Lane C.2. Seven subagents concurrent via `dispatching-parallel-agents`.
3. **Collect** — gather each subagent's scorecard / report / friction log; validate findings shape against the schema; bounce back any subagent that returned malformed output (max 1 re-dispatch per subagent).
4. **Dedupe** — main agent runs the duplicate-detection rule, merges provenance.
5. **Rank + punch list** — sort, take top 20, annotate quick-wins.
6. **Write findings report** — fill in the skeleton.
7. **Sanity pass** — main agent re-reads the findings report end-to-end. Every finding has evidence and a recommendation. Every punch list item links to its full entry.
8. **Deliver** — report path + one-paragraph summary to user.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Subagents produce inconsistent findings shape → synthesis breaks | Schema is the contract; prep step ships a concrete template; main agent validates and re-dispatches malformed responses once |
| Lanes overlap heavily → duplicated findings bloat the report | Dedup rule; provenance is merged, not lost |
| Lane C.1 dogfood produces noisy / non-reproducible friction log | Fixed scenario specified above; transcript summary is anchored to which skills fired in what order, not to vibes |
| Non-CC harnesses can't be live-tested → false confidence | Non-goal stated; findings report states fidelity limit; C.2 is static-only and named so in output |
| Subagent invents a scenario instead of using the fixed one | Scenario is quoted verbatim; prep step includes it in the dispatch prompt as a quoted string |
| Punch list becomes a dumping ground (40+ items) | Cap at 20; overflow lives in the full report, not the punch list |
| Audit has blind spots (e.g., skills the audit doesn't know to look at) | Non-goals make scope explicit; anything outside scope goes to a "deferred" list in the report appendix, not the punch list |
| Audit takes hours of subagent time for a report that goes unread | Output format is a punch list you can attack top-down in one sitting; audit is valuable even if you only fix the quick-wins |

## Open questions resolved during brainstorming

- **Scope** — option 4: full surface including non-CC harnesses (static only)
- **Rubric** — options 2 and 3 combined; rubric 2 wins conflicts
- **Output format** — option 4: single report + top-20 prioritized punch list (no GitHub issues, no auto-fix PRs)
- **Approach** — approach 1: static parallel + light dogfood
- **Dogfood environment** — option 1: disposable scratch dir
- **Lane A batching** — 4 batches grouped by functional cluster (research pipeline / planning-execution / TDD-debug-review / infra-meta)

## Workflow preferences for this audit

Loaded from `.claude/ultrapowers-preferences.json`:

- `autoCommit: true` — downstream tasks commit as work completes
- `autoPush: true` — commits pushed to remote
- `commitDesignDocs: false` — this spec, the research brief, the skills audit, and the findings report are **local only, not committed**

The audit plan's final step is a branch-finishing decision; with `autoPush: true` it will default to "push + PR" when there are code changes, or "keep local" if the audit produced no code changes (pure report).
