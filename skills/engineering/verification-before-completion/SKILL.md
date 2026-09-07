---
name: verification-before-completion
description: Use before claiming any work is complete, fixed, passing, or done — and before committing, pushing, or opening a PR. Requires running the command and reading its output before the claim is made.
---

# Verification Before Completion

**Evidence before assertions.** Run the command, read the output, then make the claim. Never the other way round.

A false completion claim is worse than an incomplete one. Incomplete work gets finished; work that was declared done and wasn't gets shipped.

## The rule

Every claim of the form *"it works" / "it's fixed" / "tests pass" / "it's done"* has a command behind it. Before making the claim:

1. **Run the command.**
2. **Read the actual output.** Not the exit code alone, not what you expect it to say.
3. **Only then** state the result, quoting what you saw.

If you did not run it, you do not know. Say what you did and did not check.

## What each claim requires

| Claim | Evidence required |
|---|---|
| "Tests pass" | The full suite run, and its summary line |
| "The bug is fixed" | The original reproduction, re-run, now green |
| "It builds" | A clean build from the current tree |
| "Types check" | The typechecker over the whole project, not one file |
| "The feature works" | The behaviour exercised end to end, the way a user would |
| "Nothing else broke" | The full suite, not the file you touched |
| "It's ready to merge" | All of the above, on the branch as it stands |

## Report what actually happened

- **Something failed?** Say so, and paste the output. A failing test reported plainly is useful; a failing test described as "mostly working" is a trap.
- **Skipped a step?** Say which, and why. "I didn't run the e2e suite, it needs a live database" is honest and actionable.
- **Couldn't verify?** Say that too, and name what would be needed. Never let an unverifiable claim pass as a verified one.
- **Verified and green?** State it plainly, without hedging. Earned confidence should sound like confidence.

## Partial verification is not verification

Running one test file does not license "tests pass". Building one package does not license "it builds". Narrow the claim to match the evidence, or widen the evidence to match the claim. Those are the only two moves.

## Red flags

| Thought | Reality |
|---|---|
| "That should work" | Should isn't does. Run it. |
| "The change was trivial" | Trivial changes break builds constantly. |
| "Tests passed before my change" | They didn't run after it. That's the one that counts. |
| "The exit code was 0" | Read the output. Suites can pass with everything skipped. |
| "I'll verify after committing" | The claim is being made now. Verify now. |
| "It's basically done" | Either it's done and verified, or it isn't done. |
