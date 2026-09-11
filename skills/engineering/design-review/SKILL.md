---
name: design-review
description: Pre-release checks and ongoing consistency work for a UI surface — a scored technical audit, copy clarity, edge-case hardening, and a final hierarchy pass, then extracting what recurs into shared components. Use once a visual surface built by visual-design is ready to ship, or when a growing UI is drifting from its own patterns.
---

# Design Review

Four lenses, one pass. Run all four against the surface built or changed; skip only a lens with nothing to check for this surface (no copy on this screen, no user-supplied data).

- **Audit** — a scored, technical pass across five dimensions, rolled into a health score out of 20 with severity-tagged findings. See [AUDIT.md](AUDIT.md) for the rubric.
- **Clarify** — every label, instruction, error message, and empty state. For each state, settle the one fact the user needs now, the action available next, and the tone the moment calls for — say each idea once. A destructive action names the object and its consequence, and prefers undo over a confirmation dialog when recovery is safe; never expose an internal error code as the primary message.
- **Harden** — the states the happy path skips: missing data, overflowing content, a failed request, zero results, a slow network. See [HARDEN.md](HARDEN.md) for the checklist.
- **Polish** — hierarchy, spacing, and interaction detail, once the three lenses above pass. Classify each drift found as a **missing token** (the system needs a reusable value), a **one-off** (an existing shared component should replace it), a **conceptual mismatch** (this flow disagrees with a comparable one elsewhere), or a **local defect** (just incomplete), and fix each at its own narrowest correct level. This lens is cosmetic on purpose; running it before the other three hides real defects under a coat of paint.

Order matters: fixing polish before harden means re-polishing whatever the edge cases go on to break.

## Maintaining consistency

As a UI grows, patterns repeat before anyone notices: the same card shape, the same spacing rule, rebuilt from scratch each time because nothing named it as reusable.

- **Extract** — a pattern used three or more times with the same intent is a candidate for a shared component or a named style value; premature abstraction from fewer instances is worse than the duplication it would remove. Two implementations of the same *look* that serve different *intents* should stay separate rather than merge into one component with a branch inside it.
- **Document** — every intentional change to the visual system updates `docs/ultrapowers/design/DESIGN.md` in the same commit. A system doc that lags the code stops being trusted, and once it's not trusted nobody checks it before diverging further.

## Reporting

Findings are not silently fixed, the same rule [review](../../flow/review/SKILL.md) applies to its standards axis. Present what each lens found, grouped by lens, and let the user decide what gets addressed before shipping. Note what's already working, not only what's broken — a report of only defects reads as harsher than the surface actually is.

## Attribution

The four-lens structure and the audit/harden rubrics in [AUDIT.md](AUDIT.md) and [HARDEN.md](HARDEN.md) are adapted from [Impeccable](https://github.com/pbakaus/impeccable) (Apache License 2.0), condensed and rewritten for this skill's own format rather than reproduced. See [NOTICE](../../../NOTICE) for the full attribution.
