---
name: finishing-a-development-branch
description: Use when implementation is complete and reviewed, to integrate the work — merge, open a PR, keep the branch, or discard it — and clean up any worktree afterwards.
---

# Finishing a Development Branch

Get finished work off the branch and into the project, then clean up.

## First, confirm it's actually finished

Call the Skill tool with "verification-before-completion", then check:

- The full test suite passes on the branch as it stands.
- The `review` phase has run and its findings have been dealt with or consciously accepted.
- Nothing is uncommitted.

If any of these fails, stop here and say which. Integrating unfinished work is how a broken main branch happens.

## Choose the path

Read `.claude/ultrapowers-preferences.json` first.

**If `autoPush` is true (the default): push the branch and open a PR.** Don't present a menu — that's what the preference means. Announce what you did and give the user the link.

If `autoPush` is false, or the preferences file is missing or malformed, present the options:

| Option | When it fits |
|---|---|
| **Open a PR** | Anyone else reviews, or the project works through PRs |
| **Merge to the main branch** | Solo project, work is reviewed, no PR process |
| **Keep the branch** | Not ready, or waiting on something external |
| **Discard it** | The work is being abandoned |

On a malformed preferences file, warn the user and present the menu. Never guess from a file you couldn't parse.

## Carrying it out

**PR:** push the branch, open the PR with a body describing what changed and why, linking the spec. Give the user the URL.

**Merge:** confirm the target branch, merge, push. If the merge conflicts, stop and resolve deliberately rather than picking sides mechanically.

**Keep:** push the branch so the work isn't only on one machine, and say what it's waiting on.

**Discard:** confirm explicitly first, naming what will be lost. This is the one irreversible option here, so it is never the default and never inferred.

## Clean up

Once the work has landed:

```bash
git worktree remove .worktrees/<name>   # if a worktree was used
git branch -d <branch>                  # after a successful merge
```

Use `-d`, not `-D`. The refusal from `-d` on an unmerged branch is a safety check, not an obstacle — if it refuses, the work has not landed and deleting it loses the work.

Leave the ticket files in `.scratch/` alone. They are the record of what was built, and they cost nothing.
