---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## Workflow Preferences

Before presenting options, read `.claude/ultrapowers-preferences.json` in the project root. If it exists, use its `autoPush` value to determine whether to push automatically. If the file is missing, default to `autoPush: true` (matches the `brainstorming` skill and README 1.x defaults). If the file exists but cannot be parsed as JSON, warn the user and fall back to the full 4-option menu — do not auto-pick from a malformed prefs file.

`autoCommit` covers uncommitted working-tree changes (should this skill commit them itself before presenting options? No — assume upstream skills committed per-task). `autoPush` governs Option 2 push behavior; it does not influence Option 1's local merge.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass.** This step is the concrete enforcement of the `ultrapowers:verification-before-completion` doctrine — no "should work", no "tests were green earlier", no trust in prior output. Run the command fresh, in this session, and read the output before continuing.

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 3: Auto-Pick Or Present Options

**Auto-pick based on signals** instead of asking every time:

| Signal | Action |
|---|---|
| `autoPush: true` AND branch has ≥1 commit ahead of base | Option 2 (push + PR). Announce the choice, proceed. |
| `autoPush: false` OR no preference file | Present the 4-option menu below. |
| User explicitly said "merge locally" / "discard" / "keep as-is" | Honor the request directly (typed confirmation still required for discard). |

**Announce your auto-pick** in one line before proceeding:

> "Implementation complete. Auto-picking Option 2 (push + PR) — `autoPush: true` set in workflow prefs."

**Only present the menu when the auto-pick rules don't apply.** When shown, use exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

**Never auto-pick Option 4 (Discard)** — destructive actions always require explicit user intent and typed confirmation (see Option 4 below). Also: when auto-picking Option 2, if the branch target defaults to an upstream fork (common when `origin` is a fork of another repo), pass `--repo <owner/repo>` explicitly to `gh pr create` to avoid PRs landing on the wrong remote.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: **keep the worktree open** while the PR is in review — cleanup happens after the PR lands.

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1 and 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Options 2 and 3:** Keep the worktree. Option 2's PR may still be in review; Option 3 is an explicit keep-as-is.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only

## Integration

**Called by:**
- **subagent-driven-development** (Step 7) - After all tasks complete
- **executing-plans** (Step 5) - After all batches complete

**Required sub-skill:**
- **ultrapowers:verification-before-completion** - Step 1's test run is this skill's concrete enforcement point. If the test command has not been run fresh in this session, stop and run it before presenting options.

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill
