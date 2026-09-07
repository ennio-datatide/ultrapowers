---
name: using-git-worktrees
description: Use when work needs isolating from the current workspace — creates a git worktree on a new branch and confirms a clean test baseline before any code is written.
---

# Using Git Worktrees

Build in a separate working directory on its own branch, so the workspace you were in stays untouched and the work can be abandoned without cleanup.

Optional. Worth it for a multi-ticket feature, a risky change, or work running alongside something else. Not worth it for a typo, a docs edit, or a single-file change.

## Create it

1. **Confirm the repo is clean.** `git status`. Uncommitted changes belong to the current branch and do not travel; commit or stash them first, and tell the user which you did.

2. **Pick the location.** Prefer a `.worktrees/` directory inside the repo, since it stays with the project and is easy to ignore. If the repo already uses another convention, follow that instead of imposing one.

   Add the directory to `.gitignore` if it isn't there. A worktree committed into its own repo is a mess to unpick.

3. **Create it on a new branch:**

   ```bash
   git worktree add .worktrees/<name> -b <branch-name>
   ```

4. **Install dependencies in the worktree.** It's a separate directory: `node_modules/`, virtualenvs, and build caches do not come with it. Skipping this produces failures that look like code problems and aren't.

## Establish the baseline

**Run the test suite in the new worktree before writing anything.**

This is the step that pays for the skill. If the suite is already red, you need to know now — otherwise the first failure after your change looks like your fault, and you debug someone else's bug on your time.

Record what you saw:

- **All green** — you have a baseline. Any failure from here is yours.
- **Already failing** — say which tests, and confirm with the user whether to proceed anyway. Do not silently build on a red baseline.
- **Won't run** — a missing dependency or config. Fix that first; it will not fix itself later.

## While working

Everything happens in the worktree. Check `pwd` if you're unsure — running commands against the original directory while believing you're in the worktree produces confusing results and can dirty the branch you were protecting.

## Finishing

The `review` phase handles merge, PR, or discard, and removes the worktree afterwards.

To remove one by hand:

```bash
git worktree remove .worktrees/<name>
```

Never delete the directory with `rm -rf` alone; git keeps its own record of the worktree, and deleting the files leaves that record stale. If that has already happened, `git worktree prune` clears it.
