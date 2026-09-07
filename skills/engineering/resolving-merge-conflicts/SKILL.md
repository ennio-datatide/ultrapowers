---
name: resolving-merge-conflicts
description: Work through an in-progress git merge or rebase conflict hunk by hunk, resolving by intent rather than by picking sides, then finish the operation. Use whenever a merge, rebase, or pull reports conflicts.
---

# Resolving Merge Conflicts

Two changes touched the same lines and git cannot decide between them. Resolve by **intent**: what each side was trying to achieve. Never by which lines look newer, longer, or more familiar.

**Never run `git merge --abort` or `git rebase --abort`.** Aborting throws away the resolution work and leaves the same conflict waiting next time. Always resolve forward.

## Steps

### 1. See the state

What operation is in progress, and which files conflict?

```bash
git status
git log --oneline --left-right --merge
```

### 2. Find the primary source for each side

For each conflict, understand **why** each change was made. Read the commit messages on both sides, and the PR or issue behind them if there is one. Call the Skill tool with "workspace-search" where the intent isn't obvious from the commits.

Guessing at intent from the diff alone is how a resolution silently deletes someone's feature.

### 3. Resolve each hunk

- **Preserve both intents wherever they can coexist.** Most conflicts are two compatible changes that merely collided in the file.
- **Where genuinely incompatible**, pick the side matching the stated goal of this merge, and note the trade-off explicitly so it can be revisited.
- **Never invent new behaviour** while resolving. A conflict resolution is not the place for a third approach; that's a change nobody reviewed.
- Remove every conflict marker. Search for `<<<<<<<`, `=======`, `>>>>>>>` before moving on.

### 4. Run the project's checks

Find what this project runs and run it, typically typecheck, then tests, then the formatter. Fix anything the merge broke. A conflict resolved into code that doesn't compile is not resolved.

### 5. Finish the operation

Stage everything and complete it: `git commit` for a merge, `git rebase --continue` for a rebase, repeating until every commit is replayed.

## Telling the user what happened

They likely did not cause this and may not know what a conflict is. Explain in one or two plain sentences before diving in:

> Two sets of changes touched the same lines, so git needs someone to decide how they combine. I'll work through them and keep both where I can. Nothing is lost.

Afterwards, say plainly what you kept, what you dropped, and why — especially any incompatible pair where you had to choose. That is a decision they may want to reverse, and they can only do that if they know it was made.

Where the right answer genuinely depends on intent you cannot recover, **ask** rather than pick. That is a decision, and decisions are the user's.
