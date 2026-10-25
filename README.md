<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
    <img src=".github/assets/logo.png" alt="Ultrapowers" width="140" />
  </picture>
</p>

<h1 align="center">Ultrapowers</h1>

<p align="center">
  <strong>Real engineering discipline for people who aren't engineers.</strong><br/>
  Grill &rarr; Spec &rarr; Tickets &rarr; Implement &rarr; Review — driven for you, on rails.
</p>

<p align="center">
  <a href="https://github.com/ennio-datatide/ultrapowers/releases"><img alt="Version" src="https://img.shields.io/badge/plugin-v2.0.0-6d28d9?style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/ennio-datatide/ultrapowers?color=6d28d9&style=flat-square"></a>
  <a href="https://github.com/ennio-datatide/ultrapowers/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/ennio-datatide/ultrapowers?color=6d28d9&style=flat-square"></a>
  <a href="https://github.com/ennio-datatide/ultrapowers/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-6d28d9?style=flat-square"></a>
  <a href="https://docs.claude.com/en/docs/claude-code"><img alt="Claude Code" src="https://img.shields.io/badge/Claude%20Code-plugin-6d28d9?style=flat-square"></a>
</p>

<p align="center">
  <a href="https://datatide.io/ultrapowers"><strong>Documentation</strong></a> ·
  <a href="https://ultrapowers.dev"><strong>Course</strong></a> ·
  <a href="https://github.com/ennio-datatide/ultrapowers/issues"><strong>Issues</strong></a> ·
  <a href="RELEASE-NOTES.md"><strong>Release Notes</strong></a>
</p>

---

Ultrapowers takes [Matt Pocock's engineering skills](https://github.com/mattpocock/skills) — a method proven daily by working engineers — and **drives it for you**.

His version asks you to be the router: you learn twenty-five commands and type the right one at each step. That's a fair trade if you're an engineer. If you're a founder, creator, or business owner who just wants to describe an idea and get it built properly, it's a wall.

So Ultrapowers keeps the engineering rigor exactly as-is and changes one thing: **the agent drives the flow, not you.** You share an idea. It grills you until the idea is airtight, writes it up, breaks it into pieces you can see working, builds them test-first, then hands you a checklist to try it yourself.

> **If you're an engineer, use [his pack directly](https://github.com/mattpocock/skills).** It's excellent, and you don't need the rails.

## Learn to Build with Ultrapowers

**New to AI-powered building?** The [Ultrapowers Course](https://ultrapowers.dev) teaches non-technical professionals to build real software using this system in 5 weeks. No coding experience required.

**Need custom consulting?** [DataTide](https://datatide.io) is the AI consulting practice behind Ultrapowers. For enterprise projects, custom solutions, and hands-on help.

| Resource            | For                                   | Link                                       |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| Ultrapowers Course  | Learn to build with AI yourself       | [ultrapowers.dev](https://ultrapowers.dev) |
| DataTide Consulting | Custom AI solutions for your business | [datatide.io](https://datatide.io)         |
| This Repository     | The open source skill system          | You're here                                |

## What's New in 2.0

**Ultrapowers is now built on [Matt Pocock's skills](https://github.com/mattpocock/skills).** The whole flow was rebuilt around his method.

- **Five phases, one mental model.** `Grill → Spec → Tickets → Implement → Review`.
- **Grilling.** The agent interviews you in rounds, walking a design tree until nothing is left assumed. Every question comes with a recommended answer, so you can reply `ok` and still have walked the whole tree.
- **A Project Dictionary and Decisions Log.** The agent builds a glossary of *your* words as you talk, and records the decisions that would be expensive to reverse. This is what stops session two re-litigating session one.
- **Work you can see.** Tickets are vertical slices, each demoable on its own and sized to a single fresh context window, so the agent never runs out of room to think mid-build.
- **Two-axis review, plus a QA plan.** Parallel sub-agents check standards and spec compliance separately, so neither masks the other. Then you get a plain-language checklist you can run yourself.
- **Local semantic search.** Optional [zvec-grep](https://github.com/zvec-ai/zvec-grep) integration makes the agent faster and cheaper by finding things without reading whole files. Fully local, and it degrades to normal search when absent.
- **New skills:** `wait-what` (re-pitch anything that didn't land, in plain English), `wizard` (guides you through steps only a human can do, like credentials and dashboards), `prototype`, `domain-modeling`, `codebase-design`, `workspace-search`, `improve-codebase-architecture`, `handoff`.

See [RELEASE-NOTES.md](RELEASE-NOTES.md) for the full changelog and migration notes.

## Installation

### Claude Code (via Ultrapowers Marketplace)

Register the marketplace:

```bash
/plugin marketplace add ennio-datatide/ultrapowers
```

Then install:

```bash
/plugin install ultrapowers@ultrapowers
```

### From Source

```bash
git clone https://github.com/ennio-datatide/ultrapowers.git
```

### Verify Installation

Start a new session and ask for something that should trigger a skill — for example, *"help me plan this feature"* or *"let's debug this issue"*. The agent should invoke the relevant skill automatically.

### Other Harnesses

Ultrapowers is **first-class on Claude Code**; other harnesses run the skills in best-effort mode. Support tiers:

| Harness       | Tier          | Install guide                                  |
| ------------- | ------------- | ---------------------------------------------- |
| Claude Code   | First-class   | Sections above                                 |
| OpenCode      | First-class   | [.opencode/INSTALL.md](.opencode/INSTALL.md)   |
| Codex         | Best-effort — skills + agents via plugin manifest (clone + symlink install) | [.codex/INSTALL.md](.codex/INSTALL.md) / [.codex-plugin/plugin.json](.codex-plugin/plugin.json) |
| Cursor        | Best-effort — skills + agents via plugin manifest | [.cursor-plugin/plugin.json](.cursor-plugin/plugin.json) |
| Gemini CLI    | Best-effort — skills via extension manifest; `Task()` parallel dispatch not supported | [gemini-extension.json](gemini-extension.json) |

Best-effort means: the skills load and the workflow principles apply, but a handful of primitives (notably `<system-reminder>` injection and Claude Code's `Task(...)` tool) don't have a direct equivalent. The platform-notes in individual skills flag where this matters.

## How it works

You describe an idea. The agent runs it through five phases and tells you where you are at each step. You're asked to decide things, never to remember which command to type.

## The Flow

| Phase | What happens |
|---|---|
| **1. Grill** | The agent interviews you in rounds until every branch of the idea is settled, building a glossary of your terms as it goes. It looks up facts itself and only asks you to *decide* things. Then it researches the current state of the art so the build isn't based on stale knowledge. |
| **2. Spec** | Everything you agreed, written up: the problem, the solution, a long list of user stories, and the decisions made. No new questions — this is synthesis. You review it before anything is built. |
| **3. Tickets** | The work is split into small vertical slices, each one demoable on its own and sized to fit a single fresh context window. You see them as a progress board of things you'll be able to try. |
| **4. Implement** | The agent works the board in order, test-first, with a fresh context per piece so it never degrades mid-build. It tells you what you can see working as each piece lands. |
| **5. Review** | Two parallel reviews — does the code follow this project's standards, and does it do what the spec asked — reported separately so neither hides the other. Then a plain-language QA checklist for you to run yourself. |

Small features skip Tickets and go straight from Spec to Implement. Bug reports skip the flow entirely and enter at `systematic-debugging`.

## Example

> "Build me a real-time notification system using WebSockets."

The agent grills you on what "notification" means here, who sees them, what happens when someone's offline, and what counts as read — recommending an answer to each so you can move fast. It researches current WebSocket practice, writes a spec you approve, splits it into six slices, builds each test-first, then hands you a checklist: *open two browser windows, send a message in one, you should see it appear in the other within a second.*

## What's Inside

**27 skills, organised by what they're for.** Discipline that only one phase uses lives *inside* that phase rather than as a separate skill, so it doesn't cost context on every turn.

### The flow

- **grill** — Interview until the idea is airtight, building the project's vocabulary as it goes
- **spec** — Problem, solution, user stories, decisions. Synthesis, not a second interview
- **tickets** — Vertical slices, each demoable and sized to one fresh context window
- **implement** — Works the board test-first, fresh context per ticket, two-stage review each time
- **review** — Standards and spec checked separately, plus a QA checklist you can run yourself

### Engineering

- **grilling** — The interview primitive: a design tree walked in rounds, every question carrying a recommended answer
- **domain-modeling** — Builds your Project Dictionary and Decisions Log as you talk
- **workspace-search** — Routing policy for finding things cheaply, with optional local semantic search
- **codebase-design** — Deep-module vocabulary: a lot of behaviour behind a small interface
- **visual-design** — Hands every design task to Impeccable and has you choose the direction from three options before anything is built
- **design-review** — Audit, critique, clarify, harden and polish through Impeccable, reported for you to decide
- **test-driven-development** — Red-green at pre-agreed seams
- **systematic-debugging** — Phase-gated diagnosis; no theorising before a command goes red on the bug
- **deep-research** — Current state of the art, before the spec is written
- **prototype** — Throwaway code that answers one design question
- **wizard** — A guided script for steps only a human can do: credentials, dashboards, DNS
- **improve-codebase-architecture** — Periodic survey for deepening opportunities
- **project-setup** — Configures tickets, domain docs, and optional local search

### Productivity

- **wait-what** — Re-pitch anything that didn't land, in plain English. You invoke this one
- **handoff** — Portable summary so another session or person can continue
- **claude-code-setup**: First-time setup of Claude Code on macOS or Windows: basic tools, safe storage for secrets, safety defaults, a readable theme and status line, personal instructions, and the companion plugins

### The rails

- **using-ultrapowers** — The phase map and how the flow drives itself
- **no-permission-asks**, **autonomous-decision** — Why the agent decides instead of asking
- **consulting-the-advisor** — Strong-model consultation on faster executor sessions

### Meta

- **writing-skills** — Writing documents that agents consume

### Not loaded by default

`skills/misc/` holds **using-git-worktrees**, **writing-claude-code-hooks**, **skills-audit**, and **skills-creation**. They're real and they work, but they're off the path for someone describing an idea, so they don't sit in context. Ask for one by name and it'll be used.

## Companion Plugins

Ultrapowers focuses on the core workflow. Domain-specific skills live in companion plugins:

- **[ultrapowers-dev](https://github.com/ennio-datatide/ultrapowers-dev)** — 52 development skills: language best practices for 13 languages, 12 framework patterns, 7 agentic patterns, and architecture fundamentals
- **[ultrapowers-business](https://github.com/ennio-datatide/ultrapowers-business)** — 38 business skills: marketing, SEO, copywriting, conversion optimization, compliance, finance, and sales enablement

Install from the same marketplace:

```bash
/plugin install ultrapowers-dev@ultrapowers
/plugin install ultrapowers-business@ultrapowers
```

When installed, Ultrapowers detects them automatically and weaves their skills into plans and audits — no manual configuration needed.

## Philosophy

- **Sensible defaults, full control** — Auto-commit and auto-push are on by default so the workflow flows, but every preference is per-repo and adjustable any time. The agent never overrides your explicit instructions.
- **You are not expected to be the router** — The agent knows which skill applies. You describe what you want; it drives.
- **Align before building** — The most expensive failure in software is building the wrong thing. Grilling is cheap; rework isn't.
- **A shared language** — The agent learns your words and uses them. Fewer misunderstandings, less jargon, shorter sessions.
- **Research before implementation** — Never build on assumptions when you can verify. Every project starts with research to capture what's current.
- **Knowledge compounds** — Skills capture learning for future sessions. The audit-create cycle means your agent improves with every project.
- **Audit everything** — Every step (except research itself) gets audited against the plan and findings. Spec compliance before code quality.
- **Test-Driven Development** — Write tests first, always. Code written before tests gets deleted.
- **Systematic over ad-hoc** — Process over guessing.
- **Evidence over claims** — Verify before declaring success. If it's not tested, it's not done.

## Updating

```bash
/plugin update ultrapowers
```

## Contributing

Skills live directly in this repository. To contribute:

1. Fork the repository
2. Create a branch for your skill
3. Follow the `writing-skills` skill for creating and testing new skills
4. Submit a PR

## Attribution

**The engineering method is [Matt Pocock's](https://github.com/mattpocock/skills)** (MIT). The grilling primitive, the spec and ticket flow, tracer-bullet vertical slicing, domain modelling with `CONTEXT.md` and ADRs, the deep-module vocabulary, the seam discipline in TDD, and the two-axis code review all come from his work, and several reference documents are ported from it directly. It is proven in production by a lot of working engineers, and it is the reason this plugin works.

**What Ultrapowers adds** is the rails and the translation layer: the agent drives the flow instead of the user, the engineering vocabulary is rendered in plain language at the surface, context hygiene is automated rather than a judgement call, and the research pipeline runs on every build. That adaptation is for an audience his pack was not aimed at. **If you're an engineer, use [his pack](https://github.com/mattpocock/skills) directly.**

**Design is [Impeccable](https://github.com/pbakaus/impeccable)** (Apache 2.0), by Paul Bakaus. It is listed in this marketplace and installed with ultrapowers as a dependency, pinned to a tested commit, so you install one plugin and get both. `visual-design` and `design-review` call it at the right moments of the flow; none of its code is copied here. See [NOTICE](NOTICE).

Local search integration uses [zvec-grep](https://github.com/zvec-ai/zvec-grep) (Apache 2.0).

## License

MIT License — see [LICENSE](LICENSE) for details.

## Community

Ultrapowers is built by [Ennio Maldonado](https://www.enniomaldonado.com) at [DataTide](https://datatide.io).

- **Docs**: https://datatide.io/ultrapowers
- **Issues**: https://github.com/ennio-datatide/ultrapowers/issues
- **Course**: https://ultrapowers.dev
