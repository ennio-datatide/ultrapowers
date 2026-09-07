# Ultrapowers 2.0: The Pocock Method, On Rails

**Date:** 2026-09-07
**Status:** Design — awaiting approval
**Supersedes:** the superpowers-derived pipeline (brainstorming → deep-research → skills-audit → skills-creation → writing-plans → subagent-driven-development)

## Plain-language summary

Ultrapowers is being rebuilt around Matt Pocock's `skills` repo, a set of AI coding skills proven in production by working engineers. His method runs an idea through five stages: **Grill** (the agent interviews you until the idea is airtight), **Spec** (it writes down what you agreed), **Tickets** (it splits the work into small demoable pieces), **Implement** (it builds them one at a time), and **Review** (it checks its own work and hands you a QA checklist).

His version is built for engineers, who are happy to memorise twenty-five commands and type the right one at the right moment. Ultrapowers users are not going to do that. So we keep his engineering rigor exactly as-is and change one thing: **the agent drives the flow instead of the user.** The user shares an idea; the rails do the rest.

## 1. Thesis

Pocock's skills are the **engine**. Ultrapowers supplies the **autopilot** and the **translation layer**.

His README is explicit that frameworks which own the process (GSD, BMAD, Spec-Kit) "take away your control and make bugs in the process hard to resolve." That critique is correct *for his audience*. His `.agents/writing-docs.md` states the assumption underneath it:

> "Most of these skills are user-invoked: the agent will never fire them for you, so *you* are the index that has to remember they exist. That memory is **cognitive load**."

He pays that cost down with published docs pages. Our users will never be that index, and no amount of documentation will make them one. Engineers who want the manual version already have his pack; ultrapowers must not compete on that ground.

Therefore: **port his substance faithfully, invert his invocation model, and translate his surface.**

## 2. The three adaptation levers

Every decision in this document derives from exactly three changes. Nothing else about his method is altered.

### Lever 1 — Invocation inversion

| | Pocock | Ultrapowers |
|---|---|---|
| Orchestrators | `disable-model-invocation: true` | model-invoked, auto-chained |
| Description style | human-facing one-liner | model-facing with rich triggers |
| Who routes | the human, by typing `/name` | the auto-router hook + phase chaining |
| Cross-skill calls | user-invoked may never call user-invoked | phases chain to the next phase automatically |

This is the **only** structural change to his model. It reframes ultrapowers' existing `auto-router` hook: it stops being a philosophical contradiction and becomes the mechanism that makes his flow reachable at all for a non-engineer.

His invariant that a skill names the Skill tool explicitly (`Call the Skill tool with "grilling"`) is **kept** — it is a reliability technique, not an invocation-policy artifact.

### Lever 2 — Plain-language surface, precise interior

His vocabulary is load-bearing *for the agent*: `seam`, `tracer bullet`, `deep module`, `blast radius`, `expand-contract`, `frontier`, `depth`, `locality`. Vague substitutes measurably degrade the skills.

- **Agent-facing text keeps every term verbatim.** Skill bodies, subagent prompts, ticket internals, ADRs.
- **User-facing text never surfaces a term raw.** Questions, approval gates, progress reports, QA plans.
- `technicalComfort` is promoted from a tone nicety to the **translation layer**, consulted at every user-facing render. `technical` users see his vocabulary directly; `non-technical` users get the plain-language rendering.

Mapping table (user-facing render on the right, agent-facing term unchanged on the left):

| Agent-facing | Non-technical render |
|---|---|
| tracer-bullet vertical slice | "a small piece you can actually see working" |
| seam | "the place we check it works" |
| deep module | "one well-organised piece that hides its complexity" |
| blocking edges | "what has to be finished first" |
| ADR | "Decisions Log entry" |
| `CONTEXT.md` | "Project Dictionary" |
| smart zone | (never surfaced; handled automatically) |

### Lever 3 — Automated context hygiene

His `PHASE-BOUNDARIES.md` is a five-question judgment tree an engineer walks at each boundary (Continue → `/clear` → `/handoff` → subagent → `/compact`). Our users cannot make that call and must never be asked it.

It becomes a **decision table the agent executes**:

| Boundary | Action | Rationale (his tree) |
|---|---|---|
| Grill → Spec → Tickets | Continue, one unbroken window | next phase needs the previous as a primary source |
| Approaching smart zone before Tickets | auto-`/compact` with a phase instruction | don't push on degraded |
| Tickets → Implement | fresh context per ticket | each ticket is self-contained by construction |
| Between tickets | auto-clear | last ticket's context is disposable |
| Review axes | parallel subagents | scoped, AFK-able |

## 3. The five phases

User-facing names replace the current skill names. Old names ship as thin deprecated forwarding skills for one release so the ultrapowers.dev course and existing users do not break.

```
Grill ──► Spec ──► Tickets ──► Implement ──► Review
  │                                              │
  └── Project Dictionary + Decisions Log ────────┘
        (built during Grill, consumed by all)
```

### Phase 1 — Grill

Ports `grilling` + `grill-me` + `grill-with-docs` + `domain-modeling`.

The `grilling` primitive is adopted **as written**: a design tree worked in rounds, where the **frontier** is every decision whose prerequisites are settled. Each round numbers its questions and pairs each with a recommended answer. Facts are the agent's job (dispatch subagents; never ask the user something lookup-able); decisions are the user's. The session ends when the frontier is empty.

His exact round format is preserved:

```
❓ **Q1** - **<title>**: <body, may include multiple choice>

➡️ <recommended answer>

---
```

Non-technical adaptations, and only these:

- Question bodies are rendered through the translation layer. The design tree itself is unchanged.
- The recommended answer becomes the **primary affordance**: "reply `ok` to accept all of these, or answer the ones you want to change." A user who approves defaults still walks the full tree.
- Multiple-choice is preferred over open-ended wherever the branch permits it.
- Round size follows the frontier, as his method requires: the tree decides how many questions are unblocked, not a quota. Where a frontier exceeds six questions, it is delivered in two consecutive rounds with the split stated, because an unbounded wall is a freeze risk for this audience. The tree is never truncated, only paced.

Grill always runs the with-docs variant when a working directory exists, since it is strictly better where a repo exists to leave a paper trail.

**Domain layer.** `domain-modeling` is adopted in full, with output renamed at the surface:

- `CONTEXT.md` → presented as the **Project Dictionary**: a glossary of the user's *own* business terms, in their words. His constraint holds: it is a glossary and nothing else, devoid of implementation detail.
- `docs/adr/` → presented as the **Decisions Log**. His three-part test for writing one is kept verbatim: hard to reverse, surprising without context, the result of a real trade-off. All three must hold.

Both are built inline during Grill, never batched, and never as a separate skill the user must invoke.

**Research.** `deep-research` merges with his `research` skill (background agent, cited Markdown in the repo) and remains **mandatory and auto-chained** before Spec. A non-technical user cannot detect a stale pattern, so the protection must be automatic. It feeds *into* the grill thread rather than gating it silently. `skills-audit` and `skills-creation` remain in the chain.

### Phase 2 — Spec

Ports `to-spec`. Synthesises the conversation; does **not** re-interview.

His spec template is adopted intact: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes. The **User Stories** section is the highest-value section for this audience and stays extensive — it is the artifact a non-technical user can actually review and the one the Review phase checks against.

His seam-sketching step is kept, rendered as "where we'll check this works," with his rule preserved: prefer existing seams, use the highest seam possible, fewest seams wins, ideal is one.

His prohibition on file paths and code snippets in specs is kept, including the prototype-snippet exception.

### Phase 3 — Tickets

Ports `to-tickets`. Tracer-bullet vertical slices, each declaring its blocking edges.

His `vertical-slice-rules` are adopted verbatim:

- each slice cuts a narrow but complete path through every layer, never a horizontal slice of one layer
- a completed slice is demoable or verifiable on its own
- each slice fits a single fresh context window
- prefactoring first

His **wide refactor** exception (expand → migrate in blast-radius batches → contract) is kept in full, agent-facing.

Adaptations:

- **Local files are the default tracker** (`.scratch/<feature>/issues/NN-slug.md`), one file per ticket, dependency-ordered. No `gh` CLI, no tracker choice to get stranded in. GitHub remains available for users who ask.
- Tickets surface to the user as a **progress board of demoable milestones**, not as issues. "Demoable on its own" is what makes progress legible to someone who cannot read a diff.
- His quiz step (granularity right? edges correct? merge or split?) is kept, rendered plainly.

### Phase 4 — Implement

Ports `implement`, whose whole body is seven lines because it delegates. Ours delegates the same way, wrapped in the loop from the screenshot: run the agent over the tickets until the board is clear.

- Work the **frontier**: any ticket whose blockers are all done.
- One fresh context per ticket, cleared between tickets (Lever 3).
- Drives TDD at the pre-agreed seams.
- Typecheck often, single test files often, full suite once at the end.
- `subagent-driven-development` becomes the internal executor of this loop rather than a user-facing skill.

**TDD.** Our `test-driven-development` merges his `tdd`: the red-green rules, the seam discipline ("no test is written at an unconfirmed seam"), and his three anti-patterns (implementation-coupled, tautological, horizontal-slicing). His rule that refactoring belongs to review rather than the red-green loop is adopted.

### Phase 5 — Review

Two artifacts, because this audience needs both and can only produce one of them.

**5a. Agent review** — ports `code-review` intact: two axes (**Standards** and **Spec**) run as parallel subagents so neither pollutes the other, reported side by side, never merged or reranked. The full Fowler smell baseline (twelve smells, each *what it is → how to fix*) is carried, with his two binding rules: the repo's documented standard always overrides, and every smell is a labelled judgement call rather than a hard violation.

The **Spec axis is the one that matters most here**: missing requirements, scope creep, requirements implemented wrongly, each quoting the spec line. It checks the build against the user stories the user personally approved in Phase 2.

**5b. Human QA plan** — the screenshot's Review, and not present in his repo. A click-through checklist in plain language, derived from the Phase 2 user stories, that a non-technical person can execute without reading code. This is the phase's user-facing output.

`requesting-code-review` and `receiving-code-review` fold into this phase.

## 4. Skills ported from Pocock that ultrapowers lacks

Ranked by value to a non-technical user.

| Skill | Why it matters more here than for engineers |
|---|---|
| **`wait-what`** | "That message didn't land, re-pitch it" — plain English, using the Project Dictionary. The single best non-technical affordance in his repo. Stays user-invoked; it is the one skill the user must be able to fire mid-anything. |
| **`wizard`** | Generates a guided script for steps only a human can take: credentials, CI secrets, third-party dashboards, DNS, one-off migrations. Exactly where these users strand today. Model-invoked, so the agent reaches for it on hitting a human-only wall. |
| **`prototype`** | Throwaway code answering one design question — a shareable HTML file for state/logic, or several UI variations on one route. Non-technical users cannot review a spec but can react to a screen. |
| **`codebase-design`** | Deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality). Prevents the ball of mud these users cannot dig out of. Agent-facing only. |
| **`improve-codebase-architecture`** | Periodic survey for deepening opportunities. Run on a cadence rather than user-remembered. |
| **`handoff`** | Portable context file. Lower priority since Lever 3 automates most boundaries. |
| **`wayfinder`** | Decision-ticket mapping for efforts too big for one session. Valuable for greenfield app builds; deferred to a later release for complexity reasons. |
| **`triage`** | Incoming bug/request state machine. Deferred; needs a real tracker to be worth it. |
| **`to-questionnaire`**, **`teach`** | Deferred. `teach` has obvious synergy with the ultrapowers.dev course and should be revisited. |

`diagnosing-bugs` merges into our existing `systematic-debugging` (his tight-feedback-loop discipline: refuse to theorise until one command goes red on *this* bug, then minimise → hypothesise → instrument → fix → regression-test).

## 4a. Workspace retrieval: zvec-grep

### Why it belongs in this design rather than beside it

Pocock's `grilling` skill carries the instruction that makes retrieval a first-class concern:

> "Finding *facts* is your job, never the user's. When a frontier question needs a fact from the environment, dispatch a sub-agent to find it."

Subagent dispatch is the most expensive operation in the flow, and the grilling phase issues it repeatedly by design. Every phase after it re-explores the same codebase: `to-spec` explores to find seams, `to-tickets` explores to find prefactoring opportunities, `tdd` hunts for prior art in existing tests, `domain-modeling` cross-references claims against code, `code-review` looks for duplication across the diff.

[zvec-grep](https://github.com/zvec-ai/zvec-grep) (`zg`) collapses a large share of those dispatches into a single indexed query that returns **bounded source snippets**, which are treated as already-read evidence rather than a pointer to go read a file. That is the token saving: fewer subagents, and fewer whole-file reads behind them.

The audience makes this matter twice over. A non-technical user pays for those tokens, and a blind exploratory subagent is dead air they cannot interpret while they wait.

Validated on this repo during design: the cross-file question *"how does the auto-router hook decide which skill to invoke"* was answered from four bounded snippets across four files, with no file reads.

### What it is

Local-first search unifying ripgrep, BM25 and vector search behind one interface. Apache 2.0, npm-installable, **macOS / Linux / Windows**, Node.js 22+. Indexes live in `.zvec-grep/` in the project root. Local embedding models by default; files, indexes and models stay on the machine, and remote embeddings are opt-in per workspace.

### Integration principle: optional, never required

**zvec-grep is a performance dependency, never a correctness dependency.** Every skill that searches degrades cleanly:

1. `zvec_grep_search` (MCP) when an index exists and the tool is listed by the host
2. `zvec_grep_rg` when listed
3. native `Grep` / `rg` otherwise

No skill may block, error, or nag when `zg` is absent. This is non-negotiable given the audience: a Windows user whose Node install is too old must still get the full flow, only slower.

Note the default `agent` toolset exposes **only** `zvec_grep_search`; `zvec_grep_rg` appears only under the `full` toolset. Skills must therefore probe for what the host actually lists rather than assuming both, and fall back to native `Grep`/`rg` for exact lookups.

### New skill: `workspace-search`

A model-invoked skill in `engineering/`, following Pocock's convention that reusable discipline is extracted as its own skill and reached via the Skill tool rather than by cross-directory file references. It owns the routing policy so that every other skill carries a one-line pointer instead of a duplicated copy.

The policy it codifies:

| Situation | Route |
|---|---|
| Exact string known: symbol, filename, path, config key, error message, literal, regex; or an exhaustive occurrence list is required | `zvec_grep_rg` if listed, else native `Grep`/`rg` |
| Wording or location unknown; semantic, conceptual or paraphrase discovery | `zvec_grep_search` |
| Relationships, chronology, causality, architecture, data or control flow | `zvec_grep_search` |
| Comparison or synthesis across files, sections or documents | `zvec_grep_search` |
| Mixed: exact anchors but cross-file synthesis needed | `zvec_grep_search` with the concept **plus** the anchors, then exact follow-up |
| Open-world question, current external facts, web content | Not workspace retrieval at all |

Binding rules, carried from the routing policy already proven in the user's global configuration:

- Pass a daemon-visible **absolute** `root` on every call.
- Read `freshness` and `background_refresh` from results; never run a status preflight.
- When results are `served_from_current_index`, use them if sufficient rather than waiting on a background refresh.
- **Treat a sufficient returned snippet as already-read evidence.** Read the cited file only when a needed detail falls outside the snippet. This rule is where the token saving actually lands, and it is the one most easily lost.
- Search before broad file reads, and before delegating discovery to a subagent. Never delegate *solely* to locate material.
- Stop when the evidence is sufficient.
- **Creating, rebuilding, or dropping a persistent index requires explicit user authorization. Never do so silently.**

### Per-phase use

| Phase | Retrieval role |
|---|---|
| **Grill** | Answers frontier questions that need environment facts, replacing subagent dispatches. `domain-modeling` uses it to cross-reference the user's claims against what the code actually does, and to check a proposed term against existing usage before it enters the Project Dictionary. |
| **Spec** | Seam discovery: locating where behaviour is already observed so existing seams can be preferred over new ones, per his rule. |
| **Tickets** | Prefactoring candidates, and **blast-radius estimation** for the wide-refactor path, which is an exhaustive occurrence count and therefore an exact-lookup route, not a semantic one. |
| **Implement** | Prior art for tests, which his spec template requires under Testing Decisions. Conventions and naming for the module under construction. |
| **Review** | The Standards axis locates repo standards docs; the Duplicated Code smell is a similarity question the semantic route answers better than a regex. |
| **`improve-codebase-architecture`** | Index-wide survey for deepening opportunities. |

### Setup, inside `project-setup`

`project-setup` (which already absorbs `setup-matt-pocock-skills`) gains a retrieval step, run once per repo and phrased for a non-technical user:

1. **Detect.** Is `zg` on PATH? Is `.zvec-grep/` present and its index ready (`zg status`)?
2. **Offer, do not impose.** If absent, offer the one-liner with a plain-language benefit ("makes me faster and cheaper to run on this project") and a stated prerequisite (Node 22+). Declining is a first-class outcome that is never re-prompted for that repo.
   - `npm install -g @zvec/zvec-grep`
   - `zg install --target claude --yes` wires the MCP server and local tool pre-approval automatically
   - `zg index` builds the workspace index
3. **Gitignore `.zvec-grep/`.** The index is machine-specific and must never be committed. *(Already applied to this repo during design; it was untracked and unignored.)*
4. **Record the outcome** in `.claude/ultrapowers-preferences.json` under a `workspaceSearch` key so the offer is made once, not every session.
5. **Never auto-index a repo without consent**, consistent with the index-lifecycle rule above.

Windows is a first-class target here: `zg` supports it, and ultrapowers already carries Windows hook infrastructure (`run-hook.cmd`, `docs/windows/polyglot-hooks.md`), so the setup path must be verified on Windows rather than assumed.

### Risk

Retrieval quality varies with index freshness, and a stale index returns confidently wrong evidence. Mitigation: skills read the `freshness` field that every result carries and fall back to exact search when an index is missing or degraded, rather than trusting a stale hit.

## 5. Fate of every current ultrapowers skill

| Current skill | Fate |
|---|---|
| `brainstorming` | → **`grill`**. Deprecated alias one release. |
| `writing-plans` | → **`tickets`**. Deprecated alias one release. |
| `subagent-driven-development` | → internal executor of **`implement`**. No longer user-facing. |
| `requesting-code-review`, `receiving-code-review` | → fold into **`review`**. |
| `test-driven-development` | Keep; merge his `tdd` seam discipline and anti-patterns. |
| `systematic-debugging` | Keep; merge his `diagnosing-bugs`. |
| `deep-research` | Keep, mandatory; merge his `research` background-agent shape. |
| `skills-audit`, `skills-creation` | Keep in the auto-chain. |
| `project-setup` | Absorb `setup-matt-pocock-skills` (tracker default, Dictionary/Decisions-Log layout). |
| `executing-plans` | Keep as the cross-session resume path. |
| `using-git-worktrees`, `finishing-a-development-branch`, `dispatching-parallel-agents`, `verification-before-completion` | Keep unchanged. |
| `no-permission-asks`, `autonomous-decision`, `consulting-the-advisor` | **Keep.** No longer in tension with the philosophy: they are the rails the audience requires. |
| `using-ultrapowers` | **Rewrite.** Drop the coercive "you do not have a choice" framing; becomes the rails explanation plus the phase map. Its job shifts from compelling skill use to describing the flow. |
| `writing-skills`, `writing-claude-code-hooks` | Keep (meta-skills). |

## 6. Repo structure

Adopt his bucket layout and its invariants:

```
skills/
  flow/          the five phases (grill, spec, tickets, implement, review)
  engineering/   model-invoked disciplines (tdd, codebase-design, debugging, …)
  productivity/  non-code tools (wait-what, handoff, …)
  meta/          writing-skills, writing-claude-code-hooks
  deprecated/    forwarding aliases, removed next release
```

Kept from his repo conventions:

- Every promoted skill has a README entry and a `plugin.json` `skills` entry; non-promoted buckets appear in neither.
- Supporting reference docs live **inside** the skill that owns them; other skills reach them by calling the Skill tool, never by `../other-skill/FILE.md` cross-references.
- Cross-skill dependencies are written as explicit Skill-tool instructions, one skill per call.
- `claude plugin validate . --strict` after manifest changes.

Dropped: his `disable-model-invocation` default (Lever 1), his `agents/openai.yaml` policy blocks for user-invoked skills (only `wait-what` keeps one), and the no-em-dash house rule (his prose convention, not ours to inherit).

The `obra/superpowers` upstream-sync relationship ends. `docs/ultrapowers/upstream-sync-log.md` records the pivot as its final entry; the new upstream reference of interest is `mattpocock/skills`, tracked by audit rather than merge.

## 7. Attribution

The method is Matt Pocock's and the README must say so plainly, linking `github.com/mattpocock/skills`, alongside a clear statement of what ultrapowers adds (the rails and the translation layer) and who each is for. Engineers should be pointed at his pack directly.

## 8. Out of scope

- `wayfinder`, `triage`, `to-questionnaire`, `teach` (deferred to a later release).
- Real-tracker integrations beyond optional GitHub.
- Changes to `ultrapowers-dev` / `ultrapowers-business` sibling packs.
- Rewriting ultrapowers.dev course material (aliases exist so it keeps working; content update is a separate effort).
- Publishing docs pages in his `docs/<bucket>/<skill>.md` style — the rails make the human-index problem moot, so the docs-page system is not ported.

## 9. Open risks

1. **Alias drift.** Deprecated forwarding skills must not accumulate logic. They forward and nothing else, and are deleted on schedule.
2. **Translation-layer leakage.** The main failure mode is his vocabulary leaking into user-facing text, or plain language leaking into agent-facing text and degrading skill precision. Needs an explicit check during implementation.
3. **Auto-chain debuggability.** His critique of process-owning frameworks — that bugs in the process become hard to resolve — still applies to us. Mitigation: every phase transition is announced and every phase remains individually invokable, so a user or a developer can enter the flow at any point.
4. **Round size.** Uncapped frontier rounds are his proven design but untested with this audience. The six-question split rule is a guess and should be validated.
