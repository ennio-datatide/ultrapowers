---
name: workspace-search
description: Routing policy for searching the current workspace — decides between exact lookup (Grep/rg) and semantic retrieval (zvec-grep), and how to spend the fewest tokens getting evidence. Use before any broad file read, before delegating discovery to a sub-agent, or whenever a skill needs a fact from the codebase.
---

# Workspace Search

Choose the **evidence source** before the retrieval mode, then choose the **cheapest route that answers the question**.

This skill exists because searching is the largest recurring token cost in the flow. Grilling needs environment facts, spec needs seams, tickets needs prefactoring candidates and blast radius, implement needs prior art, review needs standards and duplication. All of that is retrieval.

## Is this a workspace question at all?

Use the workspace as the evidence source when the user asks about local material, when prior context establishes it as relevant, or when the question concerns how the current project works, **even if the workspace is not mentioned explicitly**. A workspace may hold any mix of code, documents, configuration, and data.

Do **not** use workspace retrieval for unrelated open-world questions, current external facts, or web content that does not depend on local evidence.

## Route table

| Situation | Route |
|---|---|
| Exact string known: symbol, filename, path, config key, error message, literal, date, regex | exact route |
| An exhaustive occurrence list is required (blast radius, "every call site") | exact route |
| Wording or location unknown; semantic, conceptual, fuzzy or paraphrase discovery | semantic route |
| Relationships, chronology, causality, architecture, data or control flow | semantic route |
| Comparison or synthesis across files, sections, or documents | semantic route |
| Mixed: exact anchors present, but the answer spans files or needs synthesis | semantic route **with** the anchors, then exact follow-up |

**Semantic route**: `zvec_grep_search` if the host lists it.
**Exact route**: `zvec_grep_rg` if the host lists it, otherwise native `Grep` / `rg`.

## Availability: degrade, never block

zvec-grep is a **performance dependency, never a correctness dependency**.

1. `zvec_grep_search` when listed and an index exists
2. `zvec_grep_rg` when listed
3. native `Grep` / `rg` otherwise

The default zvec-grep toolset exposes **only** `zvec_grep_search`; `zvec_grep_rg` appears only under the `full` toolset. **Probe what the host actually lists. Never assume both exist.**

If no index exists but exact lookup answers the task, just use the exact route. Never block, error, or nag because zvec-grep is absent. Never tell a user their setup is wrong mid-task.

## Rules that make it cheap

- **Treat a sufficient returned snippet as already-read evidence.** Results carry bounded source snippets. Read the cited file only when a needed detail falls outside the snippet. This is where the saving lands, and it is the rule most easily lost.
- **Search before broad file reads**, and before delegating discovery to a sub-agent.
- **Never delegate solely to locate material.** A sub-agent is for multi-step exploration, not for finding a string.
- **Stop when the evidence is sufficient.** Don't collect more because it's available.
- Preserve the question's concepts, relationships and constraints in semantic queries. Inferred names are supplemental hypotheses, not replacements for the stated intent.

## Calling zvec-grep

- Pass a daemon-visible **absolute** `root` on every call.
- Read `freshness` and `background_refresh` from results. **Never run a status preflight.**
- When results are `served_from_current_index`, use them if sufficient rather than waiting for a background refresh.
- `query` makes one hybrid group; `queries` makes several; `fts` and `vector` add lexical-only or semantic-only supplemental groups. These are retrieval routes, not hard filters. Set `fuse: true` to collapse groups into one ranked plan.

## Index lifecycle

**Creating, rebuilding, or dropping a persistent index requires an explicit user request or authorization. Never do so silently.**

A stale index returns confidently wrong evidence, which is worse than no evidence. Read the `freshness` field on every result; where the index is missing or degraded, fall back to the exact route rather than trusting a stale hit.

Setting zvec-grep up for a repo belongs to `project-setup`, not here.
