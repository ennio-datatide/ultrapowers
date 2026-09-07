# Ultrapowers System Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `ultrapowers:subagent-driven-development` (recommended) or `ultrapowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the three-lane parallel audit of the Ultrapowers plugin and produce the findings report + top-20 punch list defined in the design spec.

**Architecture:** Seven parallel audit subagents dispatched via `ultrapowers:dispatching-parallel-agents`. Four Lane A batches (skill quality), one Lane B agent (workflow coverage), two Lane C agents (dogfood + non-CC harness parity). Main agent synthesizes, dedupes, ranks, and writes the report. No code is written; output is one Markdown findings report.

**Tech Stack:** Markdown (primary). Trivial Node/Express for the Lane C.1 dogfood fixture only (disposable scratch dir, not committed). JSON validation for manifests.

**Spec:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md`
**Research brief:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-research-brief.md`
**Skills audit:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-skills-audit.md`

---

## Workflow preferences loaded

From `.claude/ultrapowers-preferences.json`:

- `autoCommit: true`
- `autoPush: true`
- `commitDesignDocs: false`

**Commit/push behavior for this plan:** Because the only artifacts produced are design-adjacent documents (findings report + subagent raw outputs) living under `docs/ultrapowers/specs/`, and `commitDesignDocs: false`, **no commits or pushes happen during this plan**. All commit steps below are explicitly marked "SKIP (commitDesignDocs: false)."

## Worktree decision

**No worktree.** This audit produces no code changes to the main repo. Lane C.1 uses a disposable scratch dir *outside* the repo. Creating an isolated worktree adds ceremony without benefit. Work in the main working copy on the main branch.

## File structure

Files created during this plan (all local, not committed):

- `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` — the final findings report (the deliverable)
- `.cache/audit/skill-inventory.json` — snapshot of the 18 skills + agents for subagents to work from (regenerated each run, gitignored)
- `.cache/audit/raw/batch-1.json`, `batch-2.json`, `batch-3.json`, `batch-4.json` — Lane A subagent raw outputs
- `.cache/audit/raw/lane-b.json` — Lane B subagent raw output
- `.cache/audit/raw/lane-c1.json` — Lane C.1 subagent raw output
- `.cache/audit/raw/lane-c2.json` — Lane C.2 subagent raw output
- `.cache/audit/merged-findings.json` — deduped + ranked findings, input to report composition

The `.cache/audit/` directory is a working scratchpad. It gets gitignored in Task 1.

## Task decomposition overview

| Task | What it does | Output | Subagents |
| --- | --- | --- | --- |
| 1. Prep | Create scaffolding, snapshot inventory, gitignore cache | `.cache/audit/skill-inventory.json`, skeleton files | 0 |
| 2. Fan-out | Dispatch 7 audit subagents in parallel | 7 raw finding sets | 7 (parallel, one message) |
| 3. Collect & validate | Verify schema compliance, re-dispatch malformed | validated raw files | up to 7 (re-dispatch only if needed) |
| 4. Dedupe | Merge duplicates, merge provenance | `merged-findings.json` | 0 |
| 5. Rank + punch list | Sort, take top 20, tag quick-wins | punch list data | 0 |
| 6. Write report | Fill skeleton per Section 3 of spec | findings report | 0 |
| 7. Sanity pass | End-to-end review of report | signed-off report | 0 |
| 8. Deliver | Summary message to user | — | 0 |

---

## Task 1: Prep — scaffolding, inventory, gitignore

**Skills referenced:** `ultrapowers-business:technical-writing` (for skeleton prose), plus general Bash.

**Files:**
- Create: `.cache/audit/skill-inventory.json`
- Create: `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` (empty skeleton)
- Modify: `.gitignore` (add `.cache/` if not present)

- [ ] **Step 1.1: Create `.cache/audit/raw/` directory**

```bash
mkdir -p .cache/audit/raw
```

- [ ] **Step 1.2: Generate skill inventory snapshot**

Produce a JSON file listing the 18 skills + the one agent, with path, name (from frontmatter), and line count. The subagents consume this so all four Lane A batches agree on what "all 18 skills" means.

Use this approach (writing the file via the `Write` tool, not via `jq`, to keep things portable):

```bash
ls skills/ && ls agents/
```

Expected: 18 skill directories + `code-reviewer.md`.

Then write `.cache/audit/skill-inventory.json` with this shape:

```json
{
  "generated_at": "2026-04-24",
  "skills_dir": "skills/",
  "agents_dir": "agents/",
  "skills": [
    {"path": "skills/brainstorming/SKILL.md", "name": "brainstorming", "batch": "batch-1"},
    {"path": "skills/deep-research/SKILL.md", "name": "deep-research", "batch": "batch-1"},
    {"path": "skills/skills-audit/SKILL.md", "name": "skills-audit", "batch": "batch-1"},
    {"path": "skills/skills-creation/SKILL.md", "name": "skills-creation", "batch": "batch-1"},
    {"path": "skills/using-ultrapowers/SKILL.md", "name": "using-ultrapowers", "batch": "batch-1"},
    {"path": "skills/writing-plans/SKILL.md", "name": "writing-plans", "batch": "batch-2"},
    {"path": "skills/executing-plans/SKILL.md", "name": "executing-plans", "batch": "batch-2"},
    {"path": "skills/subagent-driven-development/SKILL.md", "name": "subagent-driven-development", "batch": "batch-2"},
    {"path": "skills/dispatching-parallel-agents/SKILL.md", "name": "dispatching-parallel-agents", "batch": "batch-2"},
    {"path": "skills/test-driven-development/SKILL.md", "name": "test-driven-development", "batch": "batch-3"},
    {"path": "skills/systematic-debugging/SKILL.md", "name": "systematic-debugging", "batch": "batch-3"},
    {"path": "skills/verification-before-completion/SKILL.md", "name": "verification-before-completion", "batch": "batch-3"},
    {"path": "skills/requesting-code-review/SKILL.md", "name": "requesting-code-review", "batch": "batch-3"},
    {"path": "skills/receiving-code-review/SKILL.md", "name": "receiving-code-review", "batch": "batch-3"},
    {"path": "skills/using-git-worktrees/SKILL.md", "name": "using-git-worktrees", "batch": "batch-4"},
    {"path": "skills/finishing-a-development-branch/SKILL.md", "name": "finishing-a-development-branch", "batch": "batch-4"},
    {"path": "skills/project-setup/SKILL.md", "name": "project-setup", "batch": "batch-4"},
    {"path": "skills/writing-skills/SKILL.md", "name": "writing-skills", "batch": "batch-4"}
  ],
  "agents": [
    {"path": "agents/code-reviewer.md", "name": "code-reviewer", "batch": "batch-4"}
  ]
}
```

Verify the file by reading it and counting 18 skills + 1 agent.

- [ ] **Step 1.3: Create findings report skeleton**

Write `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` with the skeleton from Section 3 of the design spec. Sections as empty placeholders:

```markdown
# Ultrapowers System Audit — Findings Report

**Date:** 2026-04-24
**Spec:** docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md
**Status:** In progress

## 1. Executive summary

_To be written after synthesis._

## 2. Punch list (top 20)

_To be filled from ranked findings._

## 3. Methodology & limits

_Dogfood scope, non-CC fidelity caveat, rubric, severity matrix — summarized from design spec._

## 4. Lane A — Skill quality

### 4.1 Summary table

### 4.2 Per-skill scorecards

## 5. Lane B — Workflow coverage

### 5.1 Pipeline diagram

### 5.2 Orphans / dead paths / missing flows / overlaps

## 6. Lane C.1 — Dogfood

### 6.1 Transcript summary

### 6.2 Friction log

## 7. Lane C.2 — Harness parity

### 7.1 Parity matrix

### 7.2 Structural issues

## 8. Appendix: all findings by ID
```

- [ ] **Step 1.4: Add `.cache/` to `.gitignore`**

Check `.gitignore` first:

```bash
grep -c "^\.cache" .gitignore || echo "not present"
```

If not present, append:

```
# Audit working scratchpad (2026-04-24 system audit)
.cache/
```

- [ ] **Step 1.5: Commit — SKIP (`commitDesignDocs: false`)**

No commits this task. The findings report lives under `docs/ultrapowers/specs/` and is local-only per workflow preferences.

---

## Task 2: Fan-out — dispatch 7 parallel audit subagents

**Skills referenced:** `ultrapowers:dispatching-parallel-agents`.

**Files:**
- Reads: `.cache/audit/skill-inventory.json`, `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md`, `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-research-brief.md`
- Writes (via subagent returns): `.cache/audit/raw/*.json`

**CRITICAL:** All 7 subagents must be dispatched in a **single message** with 7 `Agent` tool uses so they run concurrently. The dispatching-parallel-agents skill is the contract for this pattern.

The prompts below are long because each subagent has zero session context and must be briefed completely. The plan pre-writes each prompt so the executor just copies them into `Agent` tool calls.

### Findings schema (must appear in all 7 dispatch prompts verbatim)

All subagents return their findings as JSON conforming to:

```
{
  "lane": "A" | "B" | "C.1" | "C.2",
  "source_subagent": "batch-1" | "batch-2" | "batch-3" | "batch-4" | "lane-b" | "lane-c1" | "lane-c2",
  "summary": "one-paragraph high-level summary of what this lane found",
  "findings": [
    {
      "id": "A-001",
      "lane": "A" | "B" | "C.1" | "C.2",
      "severity": "blocker" | "high" | "medium" | "low",
      "rubric": ["2"] | ["3"] | ["2", "3"],
      "title": "one-line punchy statement",
      "evidence": "file/path.md:42-50 OR transcript reference OR graph-node reference",
      "finding": "2-4 sentence description of what's wrong",
      "recommendation": "1-3 sentence concrete fix",
      "effort_estimate": "S" | "M" | "L",
      "effort_note": "estimated from an experienced maintainer perspective, not a first-time contributor"
    }
  ],
  "lane_specific_artifacts": { /* optional, per lane — see per-lane instructions */ }
}
```

### Dispatch prompts

- [ ] **Step 2.1: Compose Lane A Batch 1 dispatch prompt**

```
You are an audit subagent. Your job is to read 5 specific skills in the Ultrapowers plugin and score each against the rubric below. Your output is JSON conforming to the findings schema.

**Repo root:** /Users/techno1731/Code/Personal/ultrapowers/
**Your batch (read each SKILL.md completely):**
- skills/brainstorming/SKILL.md
- skills/deep-research/SKILL.md
- skills/skills-audit/SKILL.md
- skills/skills-creation/SKILL.md
- skills/using-ultrapowers/SKILL.md

**Authoritative rubrics (primary then secondary):**
1. PRIMARY: /Users/techno1731/Code/Personal/ultrapowers/skills/writing-skills/SKILL.md — this is the project's own authoritative rubric.
2. SECONDARY: Anthropic's official skill-authoring best practices (captured in the research brief §3; include the findings below in your checks).

**Anthropic-compatible frontmatter fields to check for:**
- Required: name (≤64 chars, lowercase+digits+hyphens, no "anthropic"/"claude"), description (≤1024 chars, third person)
- Optional CC extensions: when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, model, effort, context: fork, agent, hooks, paths, shell
- Combined description + when_to_use ≤ 1536 characters for listing
- Body ≤ 500 lines

**Rubric (apply to each skill):**
- Frontmatter: name + description present; description specific enough to trigger; description third person; description starts with "Use when..."; description does NOT summarize workflow
- Body size: line count ≤ 500
- Trigger clarity: would a fresh agent know when to invoke this? Is there ambiguous overlap with sibling skills?
- Checklist currency: numbered steps accurate? Any steps referencing removed features/paths?
- Cross-references: links/paths resolve? No "@" links (which force-load)?
- README alignment: does README.md describe this skill accurately?
- Examples / flowcharts: present and current; DOT diagrams parse?
- Platform adaptation: works on non-CC harnesses as claimed, or silently CC-only?

**Community failure modes to check for (from research brief §3):**
- Token budget truncation (verbose descriptions silently truncated)
- Vague / broad trigger descriptions
- "Do X" without success criteria
- Deeply nested references (refs inside refs — Claude only partial-reads those)
- Missing platform adaptation

**Output format:** Return a single JSON object conforming to the findings schema above.
- For each skill, produce at minimum one "no-issues-found" finding at severity: "low" if you genuinely find no issues, so every skill has a scorecard entry. Use id format "A-BATCH1-NNN".
- Actual issues take their real severity.
- Evidence lines MUST include file path + line range.
- Recommendations must be concrete (not "improve clarity" — say WHAT to change).
- effort_estimate: S = <30 min fix, M = <half day, L = bigger. Estimate from an experienced maintainer perspective.

**Write your JSON to:** /Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/batch-1.json

Return a single message to the controller with:
1. A one-sentence status ("done" / "error").
2. The absolute path of the file you wrote.

Do NOT return the full JSON in your message — the controller will read the file.
```

- [ ] **Step 2.2: Compose Lane A Batch 2 dispatch prompt**

Take Batch 1's prompt as the base and substitute ALL of these fields (verify each substitution before dispatching):

| Substitution point | New value |
| --- | --- |
| Skills list | `skills/writing-plans/SKILL.md`, `skills/executing-plans/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/dispatching-parallel-agents/SKILL.md` |
| `source_subagent` value | `"batch-2"` |
| ID prefix | `A-BATCH2-NNN` |
| Output file path | `/Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/batch-2.json` |

- [ ] **Step 2.3: Compose Lane A Batch 3 dispatch prompt**

| Substitution point | New value |
| --- | --- |
| Skills list | `skills/test-driven-development/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `skills/verification-before-completion/SKILL.md`, `skills/requesting-code-review/SKILL.md`, `skills/receiving-code-review/SKILL.md` |
| `source_subagent` value | `"batch-3"` |
| ID prefix | `A-BATCH3-NNN` |
| Output file path | `/Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/batch-3.json` |

- [ ] **Step 2.4: Compose Lane A Batch 4 dispatch prompt**

| Substitution point | New value |
| --- | --- |
| Skills + agent list | `skills/using-git-worktrees/SKILL.md`, `skills/finishing-a-development-branch/SKILL.md`, `skills/project-setup/SKILL.md`, `skills/writing-skills/SKILL.md`, `agents/code-reviewer.md` (apply the same rubric; the agent file is Markdown) |
| `source_subagent` value | `"batch-4"` |
| ID prefix | `A-BATCH4-NNN` |
| Output file path | `/Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/batch-4.json` |

- [ ] **Step 2.5: Compose Lane B dispatch prompt (workflow coverage)**

```
You are an audit subagent. Your job is to analyze the Ultrapowers plugin's workflow as a system — skill-to-skill invocations, orphans, dead paths, missing flows, and overlaps.

**Repo root:** /Users/techno1731/Code/Personal/ultrapowers/
**What to read:**
- All 18 skills in skills/ (see .cache/audit/skill-inventory.json for the full list)
- README.md (section "The Research-Driven Workflow")
- RELEASE-NOTES.md (context only)

**Methodology:**

1. Build a directed graph:
   - Nodes = skills (+ the code-reviewer agent as a node)
   - Edges = explicit invocations stated in SKILL.md ("after X completes, invoke Y", "hand off to Y", "next skill: Y", etc.)
   - ONLY use edges stated in skill content. Do NOT infer edges from the README.

2. Separately build the "README expected graph" from README.md's numbered "Research-Driven Workflow" list.

3. Cross-check:
   - README edge with no matching skill-content edge = finding (README claim not backed by skills)
   - Skill-content edge not mentioned in README = finding (undocumented; could be dead or just missing from README)

4. Identify:
   - Orphans: skills that no other skill references AND are not user-invokable entry points (no /slash-command, no in the available-skills list marked user-invocable)
   - Dead paths: skill-content edges pointing to skills/files that don't exist or have moved
   - Missing flows: does the pipeline handle these task shapes?
     - Bugfix-only (someone says "fix this crash") — is there an entry point that doesn't force full brainstorm?
     - Docs-only change (add a README section)
     - Refactor-only (restructure with no new behavior)
     - One-liner change (e.g., bump version)
   - Overlaps: two skills that could reasonably fire on the same trigger, causing ambiguity

**Output format:** Return a single JSON object conforming to the findings schema.

Additionally, include `lane_specific_artifacts`:
```json
{
  "pipeline_diagram_dot": "<DOT source, simplified — only primary edges>",
  "orphans": ["skill-name", ...],
  "dead_paths": [{"from": "skill-A", "to": "skill-B-or-path", "evidence": "file:line"}],
  "missing_flows": [{"name": "bugfix-only", "analysis": "brief description of whether pipeline handles it"}, ...],
  "overlaps": [{"skills": ["a", "b"], "trigger": "description", "evidence": "..."}]
}
```

Each gap becomes a finding in the `findings` array. ID format: `B-NNN`. `source_subagent: "lane-b"`.

**Write your JSON to:** /Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/lane-b.json

Return a single message with status + file path. Do NOT return the full JSON in your message.
```

- [ ] **Step 2.6: Compose Lane C.1 dispatch prompt (dogfood)**

```
You are an audit subagent. Your job is to run (or simulate-running) the Ultrapowers pipeline on a fixed scenario and produce a friction log + transcript summary.

**Scenario (execute this verbatim):**

> "Add a small change to an existing node/express starter: expose a /health endpoint that returns {status: 'ok'}. Include a test. Use the full Ultrapowers pipeline."

**Environment:** Create a disposable scratch directory OUTSIDE the ultrapowers repo:

```bash
mkdir -p /tmp/ultrapowers-audit-dogfood-$$
cd /tmp/ultrapowers-audit-dogfood-$$
npm init -y
npm install express supertest --no-fund --no-audit
```

Create a minimal express app (index.js) with one existing route, a package.json with test scripts, and a tests/ directory. Then from this scratch dir, simulate running the Ultrapowers pipeline for the /health task.

**Simulation method (important — read carefully):**

You cannot literally invoke the Skill tool as a subagent. Instead, walk through each pipeline skill in order, acting BOTH as the user and as the pipeline. For each skill:

1. Read the SKILL.md file from /Users/techno1731/Code/Personal/ultrapowers/skills/<skill-name>/SKILL.md
2. Follow its checklist
3. When the skill asks the user a question, answer as a reasonable developer would (plausibly, briefly) and LOG the question verbatim
4. Note every skill invocation, every subagent dispatch (these would happen in real execution; log "would dispatch: <spec>"), every user-attention moment

Walk through: brainstorming → deep-research → skills-audit → (skills-creation if needed) → writing-plans → subagent-driven-development (or executing-plans). For each, log friction.

**Observations to log:**
- Which skills fire, in what order
- Questions asked by each skill (verbatim, numbered)
- For each question: was it redundant (asked earlier)? Ambiguous? Confusing?
- Where subagents would be dispatched (count them)
- Where the pipeline requests human checkpoints
- Time-to-first-line-of-code: how many user-attention moments before the implementer would actually write the /health endpoint?
- Number of user-attention moments total

**Variant probe:** After the /health walkthrough, do a SHORTER walkthrough for the scenario: *"Fix a failing test in the same repo."* Log which skills fire and whether systematic-debugging activates, or whether the pipeline forces a fresh brainstorm.

**Output format:** JSON conforming to findings schema, with each friction point as a finding. ID format: `C1-NNN`. `source_subagent: "lane-c1"`.

Additionally, include `lane_specific_artifacts`:
```json
{
  "transcript_summary": {
    "health_endpoint": {
      "skills_fired_in_order": ["brainstorming", "deep-research", ...],
      "total_questions": 12,
      "time_to_first_code_steps": 8,
      "user_attention_moments": 15,
      "subagent_dispatches": 3
    },
    "bugfix_variant": { /* same shape, shorter */ }
  },
  "questions_asked": ["Q1 verbatim", "Q2 verbatim", ...]
}
```

**Cleanup:** At the end, rm -rf the scratch dir.

**Write your JSON to:** /Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/lane-c1.json

Return a single message with status + file path.
```

- [ ] **Step 2.7: Compose Lane C.2 dispatch prompt (non-CC harness parity)**

The full content of research brief §1, §2, §5a, §5b, §5c, §6 (the tool-name table) should be inlined here. The executor pastes them in.

```
You are an audit subagent. Your job is to statically validate the Ultrapowers plugin's non-Claude-Code harness integrations against current ground truth.

**Repo root:** /Users/techno1731/Code/Personal/ultrapowers/
**What to check:**
- .codex/ (currently contains only INSTALL.md — investigate what's there)
- .cursor-plugin/ (currently contains plugin.json)
- .opencode/ (currently contains INSTALL.md + plugins/)
- gemini-extension.json and GEMINI.md at repo root
- .claude-plugin/plugin.json and .claude-plugin/marketplace.json (for version-field coherence with README)

**Ground truth (do NOT fetch; this is the current state as of 2026-04-24):**

=== CLAUDE CODE ===
plugin.json required: `name` (kebab-case). CLI requires `version` in practice.
plugin.json optional: version, description, author {name, email, url}, homepage, repository, license, keywords, category, tags, commands, agents (FILES only, not dirs), skills, outputStyles, hooks, mcpServers, lspServers, settings.
Component paths accept ./-prefixed relative path OR array of such paths. hooks/mcpServers also inline objects. Auto-discovery of skills/, agents/, commands/, hooks/ when manifest omits paths.

marketplace.json required: name, owner {name}, plugins[]. Plugin entries require name + source.

Hook events (28+, current list):
Session: SessionStart, SessionEnd
Per-turn: UserPromptSubmit, UserPromptExpansion, Stop, StopFailure
Tool loop: PreToolUse, PermissionRequest, PermissionDenied, PostToolUse, PostToolUseFailure, PostToolBatch
Agent/Task: SubagentStart, SubagentStop, TaskCreated, TaskCompleted, TeammateIdle
Context/config: InstructionsLoaded, ConfigChange, CwdChanged, FileChanged
Compaction: PreCompact, PostCompact
MCP/notification: Elicitation, ElicitationResult, Notification
Worktree: WorktreeCreate, WorktreeRemove

PreToolUse output: current shape is `hookSpecificOutput.permissionDecision` with values allow|deny|ask|defer. Top-level {decision, reason} is deprecated but works.
Handler types: command, http, mcp_tool, prompt, agent.

=== CODEX ===
Current plugin dir convention: `.codex-plugin/` with `plugin.json`.
Manifest schema: name (kebab-case), version (semver), description, author, homepage, repository, license, keywords, skills (./skills/), mcpServers, apps, interface {displayName, shortDescription, longDescription, capabilities, defaultPrompt, brandColor, composerIcon, logo, screenshots, legal URLs}.
Install location: ~/.codex/plugins/cache/$MARKETPLACE/$PLUGIN/$VERSION/
Tool-name translation is OBSOLETE — Codex consumes MCP natively via .mcp.json. A static tool-name mapping file is documentation only, not a runtime layer.
Skills are SKILL.md files with name+description frontmatter; progressive disclosure. /skills or $skill invocation.
Discovery walk: $CWD/.agents/skills → parents → $REPO_ROOT/.agents/skills → $HOME/.agents/skills → /etc/codex/skills.

=== CURSOR ===
Current plugin spec: github.com/cursor/plugins (pre-1.0, no tagged releases).
Manifest: `.cursor-plugin/plugin.json` with name, version, description, author, paths to commands, skills, rules.
Marketplace: `.cursor-plugin/marketplace.json`.
Two mechanisms coexist:
- Rules (MDC): .cursor/rules/*.mdc with YAML frontmatter (always/auto-attached/agent-requested/manual activation)
- Skills (new in Cursor 2.4, 2026-01-22): SKILL.md with name/description frontmatter at .cursor/skills/ or ~/.cursor/skills/

=== OPENCODE ===
NO bundle manifest. Plugins are JS/TS modules exporting Plugin function:
  export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => ({ /* hooks */ })
Loaded from .opencode/plugins/ (project) or ~/.config/opencode/plugins/ (global), or declared in opencode.json as "plugin": ["pkg-name"].
Types: @opencode-ai/plugin.
Agents (not "skills") are .md files with frontmatter: description (required), mode (primary|subagent|all), model, temperature, permission {edit, bash, webfetch, task}, color, hidden.
At .opencode/agents/ (project) or ~/.config/opencode/agents/ (global). Filename = agent ID.
You CANNOT ship a plugin bundle. Either npm package or loose agent .md files.

=== GEMINI CLI ===
Manifest: gemini-extension.json at extension root.
Required: name (lowercase, dash-separated, matches dir name), version (semver).
Optional: description, mcpServers, contextFileName (default GEMINI.md), excludeTools, migratedTo, plan.directory, settings[], themes[].
GEMINI.md is a PROMPT-CONTEXT FILE, not a manifest. Three roles: extension context (injected when active), project/workspace context, user-customizable name.
Skills are first-class: SKILL.md with name+description frontmatter.
Discovery tiers: workspace (.gemini/skills/ or .agents/skills/) > user (~/.gemini/skills/ or ~/.agents/skills/) > extension (skills/ inside installed extension).
activate_skill tool + user consent flow. Plan Mode requires explicit confirmation.
Convention-based subdir discovery: commands/, hooks/, skills/, agents/, policies/ — NOT declared in manifest.

Tool-name mapping (Claude Code → Gemini CLI):
  Read → read_file
  Write → write_file
  Edit → replace
  Bash → run_shell_command
  Grep → grep_search
  Glob → glob
  WebFetch → web_fetch
  WebSearch → web_search
  TodoWrite → todos
  Task/subagent → invoke_subagent
Gemini names are snake_case. Skills hardcoding Claude names may still work narratively (model translates) but `excludeTools` entries and command-generation code will silently fail.

**What to audit:**

1. Claude Code plugin manifest (.claude-plugin/plugin.json):
   - Validate all required fields present
   - Check version coherence with README and RELEASE-NOTES
   - Flag any deprecated fields or unknown fields
   - Marketplace manifest: same treatment
   - Verify schema URL (if referenced) is not the known-broken anthropic.com one

2. Hooks:
   - Read hooks/hooks.json or similar
   - Check all event names against the current 28+ list
   - Check PreToolUse output shape uses hookSpecificOutput.permissionDecision (modern) vs deprecated top-level
   - Flag any events that are misspelled or no longer exist

3. Codex integration:
   - `.codex/` currently contains only INSTALL.md. Verify this.
   - Expected for full plugin support: `.codex-plugin/plugin.json` + skills/
   - DECISION POINT: this is either a naming bug (dir should be renamed) OR an install-docs-only integration (should be scoped as such in README). Finding: force the decision.
   - If `references/codex-tools.md` exists anywhere in the repo: note that Codex now uses MCP natively; this file is documentation only, not a runtime layer — verify the README doesn't claim otherwise.

4. Cursor integration:
   - `.cursor-plugin/plugin.json` exists. Validate against current cursor/plugins schema (fields: name, version, description, author, paths to commands/skills/rules).
   - Check whether skills are actually discoverable — i.e., does the plugin expose them via .cursor/skills/ or similar?

5. OpenCode integration:
   - `.opencode/` contains INSTALL.md + plugins/. No bundle manifest expected.
   - Inspect plugins/ — is it a valid JS/TS Plugin module, or empty/stub?
   - If INSTALL.md is the only real integration, flag as "install-docs-only" and recommend README scoping.

6. Gemini integration:
   - gemini-extension.json exists at repo root. Validate required fields (name, version, lowercase-dash-match-dir convention note: since this is repo root, the "dir" is the repo name).
   - Check optional fields for currency (migratedTo, settings[], themes[], contextFileName).
   - GEMINI.md exists at repo root. Validate its role (context file, injected at session start).
   - Are skills discoverable on Gemini? Walk the discovery tier. Does the plugin use .agents/skills/ or .gemini/skills/?
   - Check skill bodies for hardcoded Claude Code tool names. Any skill that says "use the Read tool" or "Bash tool" etc. — flag as potential Gemini-side silent failure risk if it's in `excludeTools` or command-generation context (but OK if purely narrative). Read each skill's SKILL.md to check.

**Output format:** JSON conforming to findings schema. ID format: `C2-NNN`. `source_subagent: "lane-c2"`.

Additionally include `lane_specific_artifacts`:
```json
{
  "parity_matrix": {
    "skills": ["brainstorming", "deep-research", ...],
    "harnesses": ["claude-code", "codex", "cursor", "opencode", "gemini"],
    "cells": {
      "brainstorming": {"claude-code": "exposed", "codex": "missing", "cursor": "exposed", "opencode": "deferred", "gemini": "exposed"},
      ...
    }
  },
  "structural_issues": [{"harness": "codex", "issue": "...", "severity": "..."}, ...]
}
```

**Write your JSON to:** /Users/techno1731/Code/Personal/ultrapowers/.cache/audit/raw/lane-c2.json

Return a single message with status + file path.
```

- [ ] **Step 2.8: Dispatch all 7 agents in a SINGLE message**

Send one message containing 7 `Agent` tool calls. All `subagent_type: "general-purpose"`. Each gets its composed prompt from Steps 2.1–2.7. They run concurrently.

- [ ] **Step 2.9: Wait for all 7 to return**

The controller will receive 7 tool results. Each should contain: status ("done" / "error") + the absolute path of its output file. Proceed to Task 3 regardless of any individual errors; errors are handled in the collect step.

- [ ] **Step 2.10: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 3: Collect & validate subagent outputs

**Skills referenced:** None beyond general Bash / JSON validation.

**Files:**
- Reads: `.cache/audit/raw/batch-1.json`, `batch-2.json`, `batch-3.json`, `batch-4.json`, `lane-b.json`, `lane-c1.json`, `lane-c2.json`

- [ ] **Step 3.1: Verify all 7 raw files exist**

```bash
ls -la .cache/audit/raw/
```

Expected: 7 files. If any missing, note which subagent failed and skip to Step 3.3.

- [ ] **Step 3.2: Validate each JSON file**

For each file:
- Is it valid JSON?
- Does it have `lane`, `source_subagent`, `findings` at the top level?
- Are all required finding fields present (`id`, `severity`, `rubric`, `title`, `evidence`, `finding`, `recommendation`, `effort_estimate`)?
- Are severities in the allowed set?
- Are IDs unique within the file?

Use `python3 -c "import json; d=json.load(open('...')); ..."` for checks. Or inline with the Read tool + manual inspection.

Any file that fails validation → that subagent's output is malformed. Note which.

- [ ] **Step 3.3: Re-dispatch any failed/malformed subagents (max 1 retry each)**

For each failed subagent: re-dispatch with the same prompt, but **prepend a one-line correction note** identifying the specific schema violation observed in the first attempt. Example: `"Previous attempt was missing the 'rubric' field on each finding — include it as an array of strings from {\"2\", \"3\"} this time."` Re-dispatching the identical prompt risks identical malformed output. If it fails validation a second time: exclude from synthesis and add a "procedural finding" to the report noting the gap. Do NOT retry more than once per subagent.

- [ ] **Step 3.4: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 4: Dedupe findings

**Skills referenced:** None.

**Files:**
- Reads: all 7 validated raw files
- Creates: `.cache/audit/merged-findings.json`

- [ ] **Step 4.1: Load all findings into memory**

Concatenate the `findings` arrays from all 7 files. Preserve original IDs. Track `source_subagent` on each.

- [ ] **Step 4.2: Apply dedup rule**

For every pair of findings, check:

- Same `evidence` (exact match) → duplicate (regardless of severity)
- Same/similar `title` (fuzzy match: lowercase + strip punctuation + ≥70% token overlap) AND same severity → duplicate

For each duplicate cluster:
- Keep the one with higher severity; tie → keep the one with more specific evidence (longer / line-ranged evidence beats bare file path).
- Merge `source_subagent` lists on the survivor — this is how multi-lane findings preserve provenance.
- Discard the dropped finding.

- [ ] **Step 4.3: Write merged-findings.json**

Write the deduped list to `.cache/audit/merged-findings.json`:

```json
{
  "generated_at": "2026-04-24",
  "total_raw_findings": N,
  "total_after_dedup": M,
  "duplicates_merged": K,
  "findings": [ /* deduped list */ ]
}
```

- [ ] **Step 4.4: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 5: Rank + build punch list

**Skills referenced:** None.

**Files:**
- Reads: `.cache/audit/merged-findings.json`
- Updates: in-memory (fed to Task 6)

- [ ] **Step 5.1: Sort findings**

Order: `severity` desc (blocker → high → medium → low), then `effort_estimate` asc (S → M → L), then lane order (A, B, C.1, C.2), then `id` ascending as a final deterministic tiebreaker so the punch list is reproducible across runs.

- [ ] **Step 5.2: Take top 20 for punch list**

Slice the first 20 from the sorted list.

- [ ] **Step 5.3: Tag quick-wins**

Any punch-list row where `severity ∈ {blocker, high, medium}` AND `effort_estimate == "S"` gets a `quick_win: true` flag.

- [ ] **Step 5.4: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 6: Write findings report

**Skills referenced:** `ultrapowers-business:technical-writing`.

**Files:**
- Reads: `.cache/audit/merged-findings.json`, all 7 `lane_specific_artifacts`, the empty skeleton from Task 1
- Writes: `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` (complete)

- [ ] **Step 6.1: Write Section 1 — Executive summary (≤300 words)**

Cover: total findings count, count by severity, count by rubric, the 3 most important takeaways, the recommended first action (top-1 punch-list item).

- [ ] **Step 6.2: Write Section 2 — Punch list (top 20, table format)**

Columns: `#`, `Severity`, `Rubric`, `Effort`, `Title`, `Quick win?`, `Link to appendix`.
Each row links to its full entry in Section 8.

- [ ] **Step 6.3: Write Section 3 — Methodology & limits**

Summarize: rubric (dual, rubric-2 wins), severity matrix, dogfood scope limit ("one walkthrough scenario + one variant"), non-CC fidelity caveat ("static-only; cannot execute Codex/Cursor/OpenCode/Gemini from this session").

- [ ] **Step 6.4: Write Section 4 — Lane A (skill quality)**

Subsection 4.1: Summary table — rows = 18 skills + 1 agent, columns = `blocker`, `high`, `medium`, `low`, `total`. One cell per skill-severity count.

Subsection 4.2: Per-skill scorecards. For each skill, list its findings grouped by severity with evidence + recommendation inline.

- [ ] **Step 6.5: Write Section 5 — Lane B (workflow coverage)**

Subsection 5.1: Pipeline diagram — use the DOT source from lane-b's `lane_specific_artifacts.pipeline_diagram_dot` in a code fence.

Subsection 5.2: Orphans / dead paths / missing flows / overlaps — one subsection per category, list items with evidence.

- [ ] **Step 6.6: Write Section 6 — Lane C.1 (dogfood)**

Subsection 6.1: Transcript summary — skills fired, question counts, attention moments, time-to-first-code for both scenarios (health + bugfix variant).

Subsection 6.2: Friction log — each friction point as a row with skill involved, what happened, severity.

- [ ] **Step 6.7: Write Section 7 — Lane C.2 (harness parity)**

Subsection 7.1: Parity matrix — render the JSON matrix as a Markdown table. Rows = skills, columns = harnesses, cells = exposed/missing/deferred.

Subsection 7.2: Structural issues — list items with harness + issue + severity.

- [ ] **Step 6.8: Write Section 8 — Appendix: all findings by ID**

Order: lane (A first, then B, C.1, C.2), then within lane by severity desc. Each finding: full finding body + evidence + recommendation + source_subagent list.

- [ ] **Step 6.9: Change header status from "In progress" → "Complete"**

Update the `**Status:** In progress` line near the top of the report.

- [ ] **Step 6.10: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 7: Sanity pass

**Skills referenced:** `ultrapowers:verification-before-completion` (applied in spirit — verify claims, no rubber-stamping).

- [ ] **Step 7.1: Re-read the entire findings report end-to-end**

In one pass. No skipping.

- [ ] **Step 7.2: Check: every finding has evidence AND recommendation**

Grep pattern or systematic scan. Every finding row in every section. No empty cells.

- [ ] **Step 7.3: Check: every punch-list item links to its appendix entry**

Click every link, verify it resolves within the document. Broken links = fix before Task 8.

- [ ] **Step 7.4: Check: severity counts in the summary table match the per-skill scorecards**

Sum each row of the 4.1 summary table; confirm the total equals the count in 4.2's per-skill findings.

- [ ] **Step 7.5: Check: parity matrix cells are internally consistent**

If Section 7.1 says skill X is "missing" on Codex, Section 7.2's structural issues should mention it OR the executive summary should note "complete parity except…" — surface any contradictions.

- [ ] **Step 7.6: Fix any issues found**

Edit the report to resolve. No new findings are added — only wording/link fixes.

- [ ] **Step 7.7: Commit — SKIP (`commitDesignDocs: false`)**

---

## Task 8: Deliver

**Skills referenced:** None.

- [ ] **Step 8.1: Print summary message to user**

One paragraph. Include:
- Report path: `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md`
- Total findings count and breakdown by severity
- Top 3 punch-list items (verbatim titles)
- Scope limit reminder: "non-CC harnesses were statically validated; no live runs"
- Next suggested action: "The audit's recommendations are input to a separate plan. Invoke brainstorming when you're ready to decide which findings to act on."

- [ ] **Step 8.2: Final state check**

Confirm:
- `.cache/audit/` exists, gitignored
- `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-findings.md` exists and is complete
- No stray commits to the repo (workflow pref: commitDesignDocs false)
- No worktree to clean up (none was created)

---

## Post-plan notes

- **Audit rerun cadence:** If the plugin evolves significantly, this audit can be re-run by re-invoking the plan and regenerating `.cache/audit/raw/`. The research brief will need refresh (deep-research fetches current state) because harness formats change fast — don't reuse a brief more than ~3 months old.
- **Findings report is input, not output-of-record.** The audit surfaces issues; a separate plan decides which to act on. The punch list is the natural hand-off to that next brainstorm.
- **No branch-finishing step.** Because no commits or pushes happen (design docs local only), there's nothing to merge or PR. The audit's output is a local Markdown file you review, then you decide how to act on it.
