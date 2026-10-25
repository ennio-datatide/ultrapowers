---
name: visual-design
description: Hands every design task in the flow to Impeccable, which ultrapowers installs as a dependency, and makes the user choose the design direction from three options before anything is built. Use when grill's idea includes a UI, or implement is building or changing a visual seam.
---

# Visual Design

Ultrapowers brings the method; [Impeccable](https://github.com/pbakaus/impeccable) brings the design. It is
installed with ultrapowers as a dependency (`impeccable@ultrapowers`), so its `impeccable` skill is always
there. This skill decides when to call it and keeps the flow's rules from overriding its choices.

## When to call Impeccable

Call the Skill tool with "impeccable", passing the job in plain words as its argument:

| Moment in the flow | Argument |
|---|---|
| Grill, the idea includes a UI | `shape <the surface or feature>`, then, if there is no PRODUCT.md, `init` |
| Implement, a new page, screen or flow | the request as the user put it (Impeccable routes it to its new-work flow) |
| Implement, refining an existing surface | the named move when the problem names one (`layout`, `typeset`, `bolder`, `quieter`, `distill`, `colorize`, `animate`, `delight`), otherwise `polish <target>` |
| Review | handled by [design-review](../design-review/SKILL.md) |

Follow what Impeccable's skill says from there, including its setup step and its references. Do not
paraphrase it from memory.

Ignore Impeccable's own update notices (`npx impeccable update`) and do not pass them on: its version
comes with ultrapowers, pinned to one that has been tested with this flow.

## The user chooses the direction

Choosing how a design looks is the user's decision, not one to make for them. This is a **sanctioned
checkpoint**: [no-permission-asks](../../core/no-permission-asks/SKILL.md) and
[autonomous-decision](../../core/autonomous-decision/SKILL.md) do not apply to it.

- **A new surface or a new look:** before any code, the user sees **three options** and picks one. Use
  Impeccable's own decision step (its decision page or comps) whenever it offers one; it already deals
  three. If it presents fewer, or the harness has no page to show, give three distinct directions in chat,
  each with its look, its first screen and its honest risk, plus the plain conventional option.
- **Never pick for them.** Do not recommend one so strongly that the choice is a formality, and do not
  start building while waiting. Put `<skill-checkpoint>design-direction</skill-checkpoint>` in the message
  that asks, and stop.
- **After the pick,** build that direction as chosen, not a safer version of it.
- **Extending a surface that already has a look** (a section, a component, a state) inherits it. No three
  options there; that would turn every small change into a redesign.

## Where the design context lives

Impeccable keeps `PRODUCT.md` and `DESIGN.md` at the project root. Those are the only design files. If an
older project has `docs/ultrapowers/design/PRODUCT.md` or `DESIGN.md`, merge them into the root files once
and delete the old ones, so there is never a second copy to drift.

## If Impeccable is missing

If the `impeccable` skill is not available, the dependency was removed or disabled. Tell the user in one
sentence and run `claude plugin install impeccable@ultrapowers`, then ask them to restart Claude Code. Do
not design without it.
