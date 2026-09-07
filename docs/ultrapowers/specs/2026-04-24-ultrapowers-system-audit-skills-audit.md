# Skills Audit — Ultrapowers System Audit

**Date:** 2026-04-24
**Feeds:** writing-plans
**Spec:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-design.md`
**Research brief:** `docs/ultrapowers/specs/2026-04-24-ultrapowers-system-audit-research-brief.md`
**Conclusion:** All competencies Covered or External. **Skipping skills-creation.** Handing off directly to writing-plans.

## Framing note

This project is itself an audit of a plugin, not a typical feature implementation. "Supporting skills" in this context means *what the 7 audit subagents need to do their work competently*. There is no traditional application language/stack. The skills audit below maps each subagent role to the knowledge it requires.

## Language / Stack

No primary application language. The audit produces Markdown reports. The only code touched is a disposable Node/Express fixture in Lane C.1 (dogfood), which is itself a test of the pipeline — not production code of this project.

| Lane | Knowledge type | Primary surface |
| --- | --- | --- |
| Lane A (skill quality, 4 batches) | Markdown rubric application | `skills/*/SKILL.md`, `agents/code-reviewer.md` |
| Lane B (workflow coverage) | Markdown + graph construction | Skill content + README |
| Lane C.1 (CC dogfood) | Node/Express (trivial), pipeline execution | Disposable scratch dir |
| Lane C.2 (non-CC parity) | JSON schema validation, manifest formats | `.codex/`, `.cursor-plugin/`, `.opencode/`, `gemini-extension.json`, `GEMINI.md` |
| Main agent (synthesis) | Markdown report composition, dedup logic | Findings report skeleton |

## Category Skills (Language-Agnostic)

| Category | Status | Skill | Source | Notes |
| --- | --- | --- | --- | --- |
| **Testing / TDD** | External | `ultrapowers-dev:testing-tdd` | sibling pack | Lane C.1 writes one test for the /health endpoint; trivial application. |
| **Technical writing** | External | `ultrapowers-business:technical-writing` | sibling pack | Main agent uses this discipline when composing the findings report. |
| **Error handling** | N/A | — | — | Audit doesn't build error-heavy code. Dogfood fixture is throwaway. |
| **Design patterns** | N/A | — | — | Audit doesn't design systems. |
| **Architecture** | N/A | — | — | Audit reviews architecture; doesn't design it. |
| **Database** | N/A | — | — | No DB. |
| **Caching** | N/A | — | — | No caching. |
| **API design** | N/A | — | — | Dogfood /health endpoint is trivial; no API-design decisions. |
| **Observability** | N/A | — | — | Audit is offline / synchronous. |
| **Resilience** | N/A | — | — | Not applicable. |
| **Auth/Security** | N/A | — | — | Not applicable. |
| **Background jobs** | N/A | — | — | Not applicable. |
| **RAG / AI** | N/A | — | — | Not applicable. |
| **CI/CD** | N/A | — | — | Not applicable. |
| **Type safety** | N/A | — | — | Not applicable. |

## Language Best Practices

| Language | Status | Skill | Source | Notes |
| --- | --- | --- | --- | --- |
| **JavaScript** | External | `ultrapowers-dev:javascript-best-practices` | sibling pack | Only used in Lane C.1 dogfood fixture (throwaway). |
| **(no others)** | — | — | — | Audit is Markdown-first. |

## Domain Competencies

Extracted from the research brief and the audit design spec:

| Competency | Status | Skill / Source | Action |
| --- | --- | --- | --- |
| **Claude Code plugin manifest (`plugin.json`)** — required fields, optional extensions, component paths, auto-discovery | External | `ultrapowers-dev:plugin-development` + research brief §1 | None |
| **Claude Code marketplace manifest (`marketplace.json`)** — required triple, plugin entries, source references | External | `ultrapowers-dev:plugin-development` + research brief §1 | None |
| **Claude Code hooks schema** — event names, handler types, PreToolUse output shape | External | `ultrapowers-dev:plugin-development` + research brief §2 | Note: hook event list of 28+ events is captured in the research brief; `plugin-development` may lag if not recently updated, but brief is authoritative for this audit. |
| **Skill frontmatter rubric** — CC-specific fields, description purity, body cap | Covered | `ultrapowers:writing-skills` (in-repo) + Anthropic best-practices doc referenced in brief §3 | None |
| **Skill quality failure modes** — token truncation, drift, nested refs, context degradation | Covered | `ultrapowers:writing-skills` + brief §3 (community consensus) | None |
| **obra/superpowers current state** — v5.0.7 structure, skills-repo split, inline review | One-off | Research brief §4 | Captured in brief. Not a reusable skill. |
| **Codex plugin format** — `.codex-plugin/plugin.json`, `SKILL.md`, MCP-native tools | One-off | Research brief §5a | Captured in brief. Too niche to warrant a dedicated skill. |
| **Cursor plugin format** — `.cursor-plugin/plugin.json`, dual rules+skills mechanism | One-off | Research brief §5b | Captured in brief. |
| **OpenCode plugin format** — no manifest, JS/TS `Plugin` modules + agent `.md` files | One-off | Research brief §5c | Captured in brief. Explicitly counter-intuitive; subagent prompt will call this out. |
| **Gemini CLI extensions** — `gemini-extension.json` schema, `GEMINI.md` roles, `activate_skill` tool, tier-based discovery | One-off | Research brief §6 | Captured in brief. |
| **Gemini tool-name translation table** — Claude Code → Gemini snake_case mapping | One-off | Research brief §6 (table) | Embed verbatim in Lane C.2 subagent prompt. |
| **Dispatching parallel audit subagents** — fan-out, prompt shaping, failure handling | Covered | `ultrapowers:dispatching-parallel-agents` | None |
| **Subagent-driven review / two-stage review** | Covered | `ultrapowers:subagent-driven-development` | Main agent dispatches with review built in. |
| **Pipeline graph analysis** — building directed graphs from skill cross-references, orphan/overlap detection | One-off | Design spec §Lane B | Audit-specific methodology, not reusable. |
| **Findings deduplication + severity ranking** | One-off | Design spec §Shared artifacts | Specific rule defined in spec; no reusable skill needed. |
| **Node/Express `/health` endpoint (dogfood fixture)** | External | `ultrapowers-dev:express-patterns` | Trivial use; throwaway code. |
| **Markdown report composition** | External | `ultrapowers-business:technical-writing` | Main agent's synthesis step. |
| **Disposable scratch-dir hygiene (create/run/delete)** | One-off | Design spec §Lane C.1 | Standard shell pattern. No skill needed. |

## Coverage Summary

| Status | Count | Percentage |
| --- | --- | --- |
| **Covered** (in-repo ultrapowers) | 4 | 22% |
| **External** (sibling packs) | 6 | 33% |
| **One-off** (captured in research brief / design spec) | 8 | 44% |
| **Missing** | 0 | 0% |
| **Stale** | 0 | 0% |

**No skills to create. No skills to update.** The research brief captures one-off knowledge that is too niche or audit-specific to warrant promoting to a reusable skill.

## Skills to Reference in the Plan

When writing tasks in the implementation plan, annotate each with the relevant skills:

**Main agent / synthesis tasks:**
- `ultrapowers:dispatching-parallel-agents` (fan-out)
- `ultrapowers-business:technical-writing` (report composition)

**Lane A subagent prompts (skill quality):**
- `ultrapowers:writing-skills` (primary rubric)
- `ultrapowers-dev:plugin-development` (CC-specific frontmatter fields)
- Research brief §3 (Anthropic best-practices + failure modes)

**Lane B subagent prompt (workflow coverage):**
- Design spec §Lane B (methodology)
- No domain skill required beyond reading the repo's skill content

**Lane C.1 subagent prompt (dogfood):**
- `ultrapowers-dev:express-patterns` (for the /health endpoint)
- `ultrapowers-dev:testing-tdd` (for the one test)
- The fixed scenario and observation checklist from design spec §Lane C

**Lane C.2 subagent prompt (harness parity):**
- `ultrapowers-dev:plugin-development` (Claude Code manifest side)
- Research brief §1, §5a–c, §6 — include the relevant sections verbatim in the dispatch prompt so the subagent has ground truth without fetching
- Gemini tool-name translation table (brief §6) — include verbatim

## Gaps Intentionally Left Open

Two candidate skills were considered and *not* created:

- **`plugin-auditing-methodology`** — a reusable methodology for auditing a skill plugin. Rejected: too project-specific. If we run this audit quarterly, we can promote the eventual findings + design spec into a skill later. Premature now.
- **`cross-harness-portability`** — reference of plugin formats across Claude Code / Codex / Cursor / OpenCode / Gemini. Rejected: the research brief captures the current snapshot, and each harness is evolving fast enough that a skill would be stale within months. Refresh via deep-research at audit-time is the right cadence.

Both decisions are revisitable after the audit produces findings. If multiple findings suggest these competencies would be load-bearing in future audits, create them then.

## Next Step

All competencies are Covered or External. Skipping `skills-creation`.

**Next skill:** `ultrapowers:writing-plans` — produce the implementation plan for running the audit.
