---
name: handoff
description: Compact the current conversation into a handoff document so another agent, session, or person can pick the work up.
disable-model-invocation: true
argument-hint: "What will the next session be used for?"
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to the operating system's temporary directory, **not** the current workspace: `$TMPDIR`, falling back to `/tmp`, or `%TEMP%` on Windows. Then tell the user the full path of the file you wrote.

Include:

- **Where things stand** — what's done, what's in flight, what's next.
- **Decisions made and why.** The why is the part a diff can't recover.
- **Suggested skills** — name which skills the next agent should call the Skill tool for.
- **Open questions** still unresolved.

Do **not** duplicate content already captured in other artifacts (specs, plans, ADRs, tickets, commits, diffs). Reference them by path or URL instead. A handoff that restates the spec is a handoff that will drift from it.

Redact anything sensitive: API keys, passwords, tokens, personal data.

If the user passed arguments, treat them as a description of what the next session will focus on, and tailor the document to that.

## When this is the right move

Handoff is narrow. It buys **portability**: a file that travels. Reach for it when the work is moving to a different harness, a different directory or repo, another person, or when forking a side task mid-phase without derailing the current one.

If nothing is travelling, you don't need it. Within one session, staying put costs nothing and loses nothing.
