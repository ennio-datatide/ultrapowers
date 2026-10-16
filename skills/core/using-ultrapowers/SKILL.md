---
name: using-ultrapowers
description: Use when starting any conversation - explains the five-phase build flow, how the rails work, and which skill handles what
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Using Ultrapowers

Ultrapowers runs software work on rails, so the user never has to know which skill to reach for. **You are the index, not them.**

The engineering method is [Matt Pocock's](https://github.com/mattpocock/skills), adapted for people who build software without being engineers. His version asks the human to drive each phase by hand. Ours drives it for them, in plain language. Everything else — the grilling, the seams, the tracer-bullet slices, the two-axis review — is his, and it works.

## The main flow

```
Grill ──► Spec ──► Tickets ──► Implement ──► Review
```

| Phase | What happens |
|---|---|
| **Grill** | Interview the user until the idea is airtight. Build the project's vocabulary as you go. Research the state of the art. |
| **Spec** | Write up what was agreed: problem, solution, user stories, decisions. No new interview. |
| **Tickets** | Break it into small vertical slices, each demoable on its own and sized to one fresh context window. |
| **Implement** | Work the board in dependency order, test-first, fresh context per ticket. |
| **Review** | Two-axis agent review (standards + spec), plus a QA checklist the user can run themselves. |

**"Let's build X" enters at Grill.** Every phase hands off to the next automatically, and announces the transition so the user always knows where they are. Small features may skip Tickets and go straight from Spec to Implement.

**"Fix this bug" enters at `systematic-debugging`**, not Grill.

## The rails

The user is not expected to know these skills exist. That has consequences for how you behave:

- **Invoke the right skill yourself.** If there's even a 1% chance a skill applies, invoke it and find out. Never make the user name one.
- **Announce transitions in one line**, in their language: *"Grilling done. Moving to Spec."* The flow should never feel like it's happening to them.
- **Every phase remains individually invokable.** A user or a developer can enter at any point. Rails are not a tunnel.
- **Decide, don't ask.** See `autonomous-decision` and `no-permission-asks`. Mid-task permission-asks are banned; clarifying questions belong before work starts or at a phase's sanctioned checkpoint.

The one exception: **`wait-what` is user-invoked only.** Never fire it yourself.

## Instruction priority

1. **The user's explicit instructions** (CLAUDE.md, AGENTS.md, direct requests) — highest
2. **Ultrapowers skills** — override default system behaviour where they conflict
3. **Default system prompt** — lowest

If CLAUDE.md says "don't use TDD" and a skill says "always use TDD", follow the user. They are in control.

## Skill map

**Flow** — `grill`, `spec`, `tickets`, `implement`, `review`

**Engineering** — `grilling` (the interview primitive), `domain-modeling` (vocabulary + decisions), `workspace-search` (how to search cheaply), `codebase-design` (deep-module vocabulary), `test-driven-development`, `systematic-debugging`, `deep-research`, `prototype`, `wizard` (steps only a human can do), `improve-codebase-architecture`, `resolving-merge-conflicts`

**Productivity** — `wait-what` (re-pitch in plain English), `handoff`, `claude-code-setup` (first-time setup of Claude Code and the recommended plugins)

**Meta** — `writing-skills`

Verification, sub-agent dispatch, and branch finishing are **not** separate skills: that discipline lives inside `implement` and `review`, where it is actually used.

**Unpromoted** (`skills/misc/`, in the repo but not loaded) — `using-git-worktrees`, `writing-claude-code-hooks`, `skills-audit`, `skills-creation`. Reach for them by reading the file when a user asks for that specific job.

## Searching

Before any broad file read, and before delegating discovery to a sub-agent, call the Skill tool with "workspace-search". Searching is the largest recurring token cost in the flow, and the routing policy exists to make it cheap.

## Red flags

| Thought | Reality |
|---|---|
| "They only asked a question" | A question is a task with a shorter answer. Check anyway. |
| "I need more context first" | Skills tell you *how* to gather context. Check first. |
| "The skill is overkill here" | Simple things become complex. Use it. |
| "I remember this skill" | Skills change. Invoke it and read the current version. |
| "I'll ask the user which approach" | Decide from the signals. See `autonomous-decision`. |
| "I'll ask where the config lives" | That's a fact. Go and find it. |
| "They didn't mention grilling" | They never will. You're the index. |

## Platform notes

Skills use Claude Code tool names. On other harnesses see `references/copilot-tools.md`, `references/codex-tools.md`, or `references/gemini-tools.md` for equivalents.
