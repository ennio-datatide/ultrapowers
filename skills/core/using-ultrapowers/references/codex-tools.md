# Codex Tool Mapping

> **Reading aid only — not a runtime translation layer.** This file helps you interpret Claude Code tool names when you encounter them inside skills. The Codex plugin does **not** translate tool calls at runtime; you invoke your platform's native tools directly. MCP tools are consumed natively via `.mcp.json` in your Codex config — there is no compatibility shim. When the Codex plugin manifest eventually supports a first-class `agents` field, the "Named agent dispatch" section below becomes redundant and should be removed.

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` tool (dispatch subagent) | `spawn_agent` (see [Named agent dispatch](#named-agent-dispatch)) |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls |
| Task returns result | `wait` |
| Task completes automatically | `close_agent` to free slot |
| `TodoWrite` (task tracking) | `update_plan` |
| `Skill` tool (invoke a skill) | Skills load natively — just follow the instructions |
| `Read`, `Write`, `Edit` (files) | Use your native file tools |
| `Bash` (run commands) | Use your native shell tools |

## Sub-agent dispatch needs multi-agent mode

Sub-agent dispatch is off unless Codex is configured for it. Enable it in `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

Without this, any phase that dispatches sub-agents (`implement`, `review`) falls back to running inline. That still works; it is just slower and shares one context window.

## Detecting the git environment before acting

Codex may already place you inside a linked worktree, or on a detached HEAD, and creating a worktree from there fails in confusing ways. Probe with read-only commands first:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

Read the result as:

| Signal | Meaning | What to do |
|---|---|---|
| `GIT_DIR` differs from `GIT_COMMON` | already inside a linked worktree | skip worktree creation, work here |
| `BRANCH` is empty | detached HEAD | cannot branch, push, or open a PR from the sandbox |
| both normal | ordinary checkout | proceed as usual |

The unpromoted `using-git-worktrees` skill uses the first signal to decide whether to create anything; `review`'s branch-finishing step uses the second to decide whether it can push.

## When the sandbox blocks branching

On a detached HEAD in an externally managed worktree, the agent cannot create a branch, push, or open a PR. Commit the work anyway, then tell the user to finish through the Codex App's own controls:

- **Create branch** — names the branch, and the commit, push and PR happen through the App.
- **Hand off to local** — moves the work to the user's local checkout.

The agent can still run tests, stage files, and write out a suggested branch name, commit message, and PR description for the user to paste. Do this rather than reporting that the work cannot be finished: everything except the final git operation is still yours to do.
