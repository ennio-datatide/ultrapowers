# Skills Audit Report — Workflow Defaults, Sibling-Pack Integration & Architecture Presets

**Date:** 2026-04-23
**Companion:** `2026-04-23-workflow-defaults-and-sibling-integration-design.md` + `-research-brief.md`
**Input:** research brief from 2026-04-23 (see companion doc)

---

## Language/Stack

This is a **meta-skill project** — the deliverable is edits to markdown SKILL.md files and one or two JSON config files inside the `ultrapowers` base plugin. There is no compiled code, no test harness, no backend, no database, no external service calls beyond what deep-research already uses. Validation is manual smoke tests (per spec §8).

**Relevant categories:** essentially none of the usual foundational categories apply. The "stack" is prose (Markdown) + config (JSON).

## Language Best Practices

| Language | Status | Skill | Action |
|---|---|---|---|
| Markdown (skill prose) | External | `ultrapowers:writing-skills` | Reference in plan |
| JSON (config files) | N/A | — | No skill needed (format is trivial; edits are literal) |

## Category Skills

Most categories in the checklist don't apply. Only the few below are worth calling out:

| Category | Status | Skill | Action |
|---|---|---|---|
| Testing/TDD | Not applicable | — | No automated tests; manual smoke tests documented in spec §8 |
| Error handling | Not applicable | — | No runtime error surface — skills are prose |
| Design patterns | Not applicable | — | — |
| Architecture | Not applicable | — | Decisions documented in spec |
| Verification-before-completion | External | `ultrapowers:verification-before-completion` | Reference in plan (before claiming smoke tests pass) |

## Domain Competencies

Extracted from the research brief:

| Competency | Status | Existing Skill | Action |
|---|---|---|---|
| SKILL.md authoring (frontmatter, prose, sub-file references) | External | `ultrapowers:writing-skills` | Reference in plan |
| Plugin-prefix detection from session context (`ultrapowers-dev:*` etc.) | Plan-level knowledge | — | Embed the pattern directly in the modified `brainstorming/SKILL.md`; no new skill warranted (one-off knowledge, captured in research brief §Finding 1) |
| Architecture defaults resolution (per-tool latest version at research time) | External | `ultrapowers:deep-research` (being modified to add this sub-step) | Reference in plan |
| Config file safety / reserved filenames | Plan-level knowledge | — | Embed reserved-names list in the implementation plan's implementation notes (captured in research brief §Finding 2) |
| Keyword → skill mapping (sibling-pack-map.md) | Plan-level data | — | Full map lives in spec §5.2; plan task just copies it into the reference file |
| Blocking-prompt UX pattern (install missing sibling pack) | External | `ultrapowers:writing-skills` covers prompt-authoring style | Reference in plan |
| Manual smoke-testing approach for skill changes | Plan-level knowledge | — | Test list is in spec §8; plan task executes each and documents results |

## Coverage Summary

- Covered: 0
- Stale: 0
- Missing: 0
- External: 3 (`ultrapowers:writing-skills`, `ultrapowers:verification-before-completion`, `ultrapowers:deep-research`)
- Plan-level knowledge (not skill-worthy): 4

## Skills to Create/Update

**None.** This project doesn't generate new domain competencies that are reusable across projects. Everything it needs either already exists as an ultrapowers skill or is one-off knowledge that belongs in the implementation plan, not in a skill.

## Skills to Reference in Plan

- `ultrapowers:writing-skills` — for every SKILL.md edit
- `ultrapowers:verification-before-completion` — before checking off any smoke test
- `ultrapowers:deep-research` — the skill being modified also validates the modification (it's meta)
- `ultrapowers:subagent-driven-development` OR `ultrapowers:executing-plans` — execution sub-skill; user picks when `writing-plans` hands off

## Rationale for "no gaps"

The spec is a meta-modification of skills the user already has installed. Every new capability the implementation introduces (prefix detection, architecture resolution, keyword matching) is either:

1. A new behavior inside an existing ultrapowers skill (captured by editing that skill's SKILL.md — no new domain skill needed),
2. A small data file next to a SKILL.md (captured as plan tasks — not reusable enough to warrant a skill), or
3. Knowledge already present in the research brief (referenced from plan task descriptions — not reusable enough to warrant a skill).

The grouping rule **"one-off knowledge → put in implementation plan, not a skill"** applies to everything plan-level above. Creating skills for meta-plugin authoring knowledge would be over-engineering — that knowledge already lives in `ultrapowers:writing-skills` and in official Claude Code docs.

## Next Step

No gaps → skip `skills-creation`, invoke `writing-plans` directly per the skills-audit flow diagram.
