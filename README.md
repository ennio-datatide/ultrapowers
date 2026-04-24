<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
    <img src=".github/assets/logo.png" alt="Ultrapowers" width="140" />
  </picture>
</p>

<h1 align="center">Ultrapowers</h1>

<p align="center">
  <strong>A research-driven software development workflow for your coding agents.</strong><br/>
  Brainstorm &rarr; Research &rarr; Audit &rarr; Plan &rarr; Build &rarr; Review &rarr; Ship — on rails.
</p>

<p align="center">
  <a href="https://github.com/ennio-datatide/ultrapowers/releases"><img alt="Version" src="https://img.shields.io/badge/plugin-v1.2.0-6d28d9?style=flat-square"></a>
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

Ultrapowers extends [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent with a **research-first pipeline** that ensures agents always work with current, verified knowledge before writing code. Forked for teams and solo builders who want their agent to brainstorm with them, research the state of the art, audit what it knows, and only then plan and ship.

## Learn to Build with Ultrapowers

**New to AI-powered building?** The [Ultrapowers Course](https://ultrapowers.dev) teaches non-technical professionals to build real software using this system in 5 weeks. No coding experience required.

**Need custom consulting?** [DataTide](https://datatide.io) is the AI consulting practice behind Ultrapowers. For enterprise projects, custom solutions, and hands-on help.

| Resource            | For                                   | Link                                       |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| Ultrapowers Course  | Learn to build with AI yourself       | [ultrapowers.dev](https://ultrapowers.dev) |
| DataTide Consulting | Custom AI solutions for your business | [datatide.io](https://datatide.io)         |
| This Repository     | The open source skill system          | You're here                                |

## What's New in 1.2

- **Workflow preferences, persisted per repo.** `.claude/ultrapowers-preferences.json` stores `autoCommit`, `autoPush`, `commitDesignDocs`, and sibling-pack suggestion flags. Brainstorming asks once — one confirm-or-tweak prompt — then every downstream skill respects the setting. Defaults: auto-commit on, auto-push on, design docs local.
- **Transparent sibling-pack awareness.** When [`ultrapowers-dev`](https://github.com/ennio-datatide/ultrapowers-dev) or [`ultrapowers-business`](https://github.com/ennio-datatide/ultrapowers-business) are installed, the workflow silently references their skills in specs, audits, and plan annotations. Missing pack → one blocking "install / skip / stop suggesting" prompt.
- **Architecture profile matching.** Seed profiles (marketing/content site, SaaS product app) inspire one of the 2–3 approaches proposed during brainstorming. Profiles store **tool identity only** — deep-research resolves the current latest at each run, so the library never goes stale.
- **Tone calibration.** First brainstorming question reads the user's comfort with technical terms. Every downstream prompt adapts: jargon-light with creators and founders, engineer-direct with developers. The recommended tech stays best-in-class regardless.
- **Auto-pick execution.** Subagent-driven development is the default after a plan is written; the workflow only asks when it would not pick it. Same for branch finishing — push + PR is automatic when `autoPush` is on.
- **Documented upstream sync.** New process for auditing `obra/superpowers` commits, adapting ideas without copy-paste, and resetting the "behind by N commits" counter via `git merge -s ours` with a written audit log.

See [RELEASE-NOTES.md](RELEASE-NOTES.md) for the full changelog.

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
| Codex         | Best-effort — skills-only, clone + symlink   | [.codex/INSTALL.md](.codex/INSTALL.md)     |
| Cursor        | Best-effort — skills + agents via plugin manifest | [.cursor-plugin/plugin.json](.cursor-plugin/plugin.json) |
| Gemini CLI    | Best-effort — skills via extension manifest; `Task()` parallel dispatch not supported | [gemini-extension.json](gemini-extension.json) |

Best-effort means: the skills load and the workflow principles apply, but a handful of primitives (notably `<system-reminder>` injection and Claude Code's `Task(...)` tool) don't have a direct equivalent. The platform-notes in individual skills flag where this matters.

## How it works

It starts the same way Superpowers does — your agent doesn't just jump into code. It steps back and asks what you're really trying to do.

But then Ultrapowers goes further. After brainstorming, it **researches the current state of the art** for every technology and pattern involved. It audits your existing skills against what it finds, creates or updates skills to fill gaps, and only then moves into planning and implementation.

Every implementation step gets audited against the research findings and your plan. The result: agents that build on verified knowledge, not assumptions. Knowledge compounds across sessions — your agent gets smarter over time.

## The Research-Driven Workflow

1. **brainstorming** — Reads your technical comfort, asks what you're really building, proposes 2–3 design approaches (one seeded from a past-project profile when applicable), and writes an approved spec.
2. **deep-research** — Researches the current state of the art for every technology and pattern in the spec. Resolves the latest versions of tools referenced by the profile library, so recommendations are always current.
3. **skills-audit** — Classifies every required competency as Covered, Stale, Missing, or External. Sibling-pack skills are recognized transparently.
4. **skills-creation** — Creates or updates the skills needed to fill gaps. Knowledge is captured for future sessions.
5. **using-git-worktrees** *(optional)* — Creates an isolated workspace on a new branch and verifies a clean test baseline. Your main branch stays untouched. User-invoked when isolation is wanted; not auto-triggered by the pipeline.
6. **writing-plans** — Breaks work into bite-sized tasks (2–5 minutes each) with skill annotations on each step. Clear enough for any agent to follow.
7. **subagent-driven-development** or **executing-plans** — Dispatches a fresh subagent per task with two-stage review (spec compliance first, then code quality). Auto-picked by default.
8. **test-driven-development** — Enforces RED-GREEN-REFACTOR: write failing test, watch it fail, write minimal code, watch it pass, commit. Code written before tests gets deleted.
9. **code-reviewer agent** (with **requesting-code-review** and **receiving-code-review** skills as user-invoked helpers) — `subagent-driven-development` dispatches the `code-reviewer` agent for per-task review + final review; the two review skills document how to request and receive review when a user runs one manually.
10. **finishing-a-development-branch** — Verifies tests pass, executes the chosen integration path (merge / PR / keep / discard), cleans up the worktree.

**The agent checks for relevant skills before any task.** Mandatory workflows, not suggestions.

## Example

> "Build me a real-time notification system using WebSockets."

Ultrapowers calibrates tone, brainstorms the design with you, researches current WebSocket best practices and libraries, audits your skills to find gaps, creates any missing skills, then plans and implements with TDD — all audited against the research. You review the code and ship when you're satisfied.

## What's Inside

### Research Pipeline (new in Ultrapowers)

- **deep-research** — State-of-the-art research before implementation
- **skills-audit** — Gap analysis of existing skills vs. requirements
- **skills-creation** — Create/update skills from research findings

### Testing

- **test-driven-development** — RED-GREEN-REFACTOR cycle

### Debugging

- **systematic-debugging** — 4-phase root cause process
- **verification-before-completion** — Ensure it's actually fixed

### Collaboration

- **brainstorming** — Socratic design refinement with tone calibration and architecture profile matching
- **writing-plans** — Detailed implementation plans with skill annotations
- **executing-plans** — Batch execution with checkpoints
- **dispatching-parallel-agents** — Concurrent subagent workflows
- **requesting-code-review** — Pre-review checklist
- **receiving-code-review** — Responding to feedback
- **using-git-worktrees** — Parallel development branches
- **finishing-a-development-branch** — Merge / PR / keep / discard, auto-picked when signals are clear
- **subagent-driven-development** — Fast iteration with audited two-stage review

### Meta

- **project-setup** — Workflow preferences mode (confirm-or-tweak UX)
- **writing-skills** — Create new skills following best practices
- **using-ultrapowers** — Introduction to the skills system

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

Ultrapowers started as a fork of [Superpowers](https://github.com/obra/superpowers) by [Jesse Vincent (obra)](https://blog.fsck.com) and the team at [Prime Radiant](https://primeradiant.com), and has since diverged with its own research pipeline, workflow defaults, sibling-pack integration, architecture profile matching, and tone calibration. Credit for the original skill-system foundation goes to their work.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Community

Ultrapowers is built by [Ennio Maldonado](https://www.enniomaldonado.com) at [DataTide](https://datatide.io).

- **Docs**: https://datatide.io/ultrapowers
- **Issues**: https://github.com/ennio-datatide/ultrapowers/issues
- **Course**: https://ultrapowers.dev
