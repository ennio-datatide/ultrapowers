# Spec Reviewer Sub-Agent Prompt

Template for the first review after an implementer finishes. One question: **does this do what the ticket asked?**

Runs before the quality review. Code that implements the wrong thing shouldn't have its style reviewed.

```
Review this change against the ticket it was built from.

## The ticket

<ticket, verbatim, including acceptance criteria>

## The spec section behind it

<the originating spec section>

## The change

Run: git diff <base>...HEAD

## Your job

Verify independently. The implementer's report is a claim; the diff is the evidence. Read the code yourself and do not take the report's word for anything.

Report:

(a) Acceptance criteria that are NOT met, or only partly met. Quote the criterion and say what's missing.
(b) Behaviour in the diff that the ticket did not ask for. Scope creep counts even when the code is good.
(c) Criteria that look implemented but are implemented wrongly. Quote the criterion and explain the gap.

For each finding, quote the relevant line of the ticket or spec.

If every criterion is genuinely met, say so plainly and say what you checked.

Under 400 words.
```

## Dispatching notes

- A fast implementer report is the usual signature of incomplete work. The reviewer must re-derive the verdict from the diff, never inherit it.
- This agent does not fix anything. It reports; findings go back to the implementer.
- Keep it separate from the quality reviewer. Merging the two lets a spec failure get softened by good style, which is exactly what the split prevents.
