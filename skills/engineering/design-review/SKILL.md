---
name: design-review
description: Pre-release design checks for a UI surface, run through Impeccable - a scored technical audit, a critique, copy clarity, edge-case hardening and a final polish pass - reported to the user rather than silently fixed. Use once a visual surface is ready to ship, or when a growing UI is drifting from its own patterns.
---

# Design Review

Run the checks through Impeccable, installed with ultrapowers as a dependency. Call the Skill tool with
"impeccable" once per lens, on the surface built or changed, in this order:

1. `audit <target>`: accessibility, performance, responsive behaviour, scored.
2. `critique <target>`: the design itself, against the direction the user chose.
3. `clarify <target>`: labels, errors, empty states. Skip on a surface with no copy.
4. `harden <target>`: missing data, overflow, failed requests, slow networks.
5. `polish <target>`: last, because fixing the edge cases changes what needs polishing.

## Reporting

Findings are not silently fixed, the same rule [review](../../flow/review/SKILL.md) applies to its
standards axis. Present what each lens found, grouped by lens, with what is already working, and let the
user decide what gets addressed before shipping. When the user asks to fix them, apply the fixes through
the same Impeccable commands.

Every intentional change to the visual system updates the root `DESIGN.md` in the same commit.
