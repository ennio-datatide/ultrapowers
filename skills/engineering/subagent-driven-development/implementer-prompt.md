# Implementer Sub-Agent Prompt

Template for dispatching the agent that builds one ticket.

The agent starts with nothing. Everything it needs is in this brief, and nothing from previous tickets is carried in.

```
Build ticket <NN>: <title>.

## What to build

<the ticket's "What to build" section, verbatim>

## Acceptance criteria

<the ticket's checklist, verbatim>

## Spec context

<the section of the spec this ticket came from, so the intent behind the criteria is visible>

## How to work

- Build this test-first. Write the failing test, watch it fail, write the minimum that passes it, repeat.
- Test only at these seams: <the seams agreed in the spec>. Do not invent a new seam. If one seems necessary, stop and report that instead of proceeding.
- Follow the conventions already in this codebase. Read neighbouring code before writing.
- Use the project's vocabulary from CONTEXT.md for names.
- Respect the ADRs in docs/adr/ covering this area. Do not re-litigate a recorded decision.

## Scope

Build exactly this ticket. Not the next one, not a refactor you noticed on the way, not an improvement outside the acceptance criteria. Note anything you spot and move on.

## Before you report back

- Run the typechecker.
- Run the tests covering what you changed.
- Re-read the acceptance criteria and confirm each one against the code you wrote.

## Report

- Which acceptance criteria are met, each with the evidence.
- Anything you could not do, and why.
- Anything you noticed but deliberately left alone.
- The commands you ran, and what they output.

Do not report a criterion as met without having run something that shows it.
```

## Dispatching notes

- Pass the ticket and spec section as text. Don't make the agent go looking for them.
- Name the seams explicitly. "Test at the appropriate level" produces a different answer every run.
- Bound the scope in the prompt. An unbounded implementer refactors adjacent code and blows the ticket's size.
