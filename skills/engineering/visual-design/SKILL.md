---
name: visual-design
description: Vocabulary and discipline for designing or improving a UI/visual surface — settle audience and intent before layout, hold a quality floor, preserve one design identity across changes. Use when grill's idea includes a UI, or implement is building or changing a visual seam.
---

# Visual Design

Design a UI the same way [codebase-design](../codebase-design/SKILL.md) designs a module: settle the interface's *purpose* before its *shape*. A screen has an interface too — what someone can see and do — and a shallow one (no consistent identity, the key action buried) costs the same way a shallow code interface does.

## Context before layout

Two facts should exist before a pixel gets drawn, captured once and reused every session after:

- **Audience and intent** — who's using this surface and what they need to accomplish. Write it to `docs/ultrapowers/design/PRODUCT.md`.
- **Visual system** — the palette, type scale, spacing, and component identity already committed to. Write it to `docs/ultrapowers/design/DESIGN.md`.

Read both before touching layout in a repo that already has them. Re-explaining either one is the sign they're missing — create them now rather than skip it again next session.

## Design purpose

Every surface serves one purpose; get this wrong and the layout that follows is wrong no matter how well it's built:

- **Persuade** — landing pages, pricing. The visitor decides and acts; earn the attention and the action, strip anything that competes with it.
- **Operate** — dashboards, editors, admin, settings. The visitor completes a task; scanability, consistency, and the real usage scene outrank expression. Brand lives in precise details, not loud ones.
- **Read** — documentation, guides, changelogs. The visitor understands something; structure carries the page, then make staying in it worth it.
- **Experience** — portfolios, galleries, showcases. The visitor is inside the work itself; the interface recedes and the content leads from the first viewport.

Choose the mode from the surface being built, not the product it belongs to — a dev tool's landing page is still Persuade, its docs are still Read. Naming it out loud settles arguments about density, whitespace, and what belongs above the fold before they start.

## Two paths to a first draft

- **Code-first** — write markup and styles directly, then look at the render. Coherent by construction, since one set of tokens produces every screen, but slower to see variety.
- **Mock-first** — generate visual comps to settle direction before code exists. Faster to compare options, but the chosen comp still has to survive translation into the real system.

State which path before starting. Switching mid-surface is how two screens end up with two different identities.

**Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behavior, copy, and everything outside scope. Redesign keeps product truth and constraints but treats the old look as evidence, not a starting point, and replaces `DESIGN.md`. Never split the difference into polish on a look that's being discarded anyway — that produces neither.

## The quality floor

Read this once the direction is settled, before any UI edit including a small refinement — not before planning.

- **Contrast** — body/placeholder text ≥4.5:1, large text ≥3:1. On colored surfaces, tint secondary text from that hue; never plain gray on color.
- **Depth** — shadows carry an offset and a soft blur. A zero-offset colored halo is decoration, not depth.
- **Spacing** — tight within a group, generous between groups, more space above a heading than below it. Read the computed values, not the intention.
- **Type** — body measure 65-75ch, obvious scale and weight steps. Run the real copy at every breakpoint and fix what overflows.
- **Motion** — one authored moment, not the same entrance repeated on every section.
- **States** — hover, disabled, loading, error, and empty, plus real content and keyboard focus, not just the happy path with placeholder text.
- **Browser surfaces** — text selection, the caret, scrollbars, focus rings, and tabular numerals still carry the design. Theme them from the palette instead of leaving browser defaults; it's the cheapest signal a page was actually built.
- **Copy** — controls name their action, errors name the problem and the recovery.

**Defaults to refuse, not bans** — the brief's own words can earn any of these back except the one marked otherwise: same-size icon-plus-heading-plus-text cards as the page's whole structure, the hero-metric template (big number, small label, accent), a kicker or eyebrow above a heading (**this one is a ban** — the heading carries its own weight), gradient text standing in for emphasis, emoji standing in for an icon system, a system display face (Impact, Arial Black, the platform sans) as an own-world page's display voice. Reaching for one of these when the axis was actually free means the choice wasn't made — recognizing that means rewriting the element, not softening it.

## Named moves

State the problem before reaching for a move — "hard to compare plans" targets a fix, "make it nicer" doesn't. Then scope the change to exactly the move that problem needs. See [MOVES.md](MOVES.md) for bolder, quieter, distill, layout, typeset, colorize, animate, and delight — read only the one the task actually calls for.

**Preserve the existing identity unless a full redesign was explicitly requested.** A layout fix that quietly restyles the palette has scope-crept into a redesign nobody asked for.

Where two versions need comparing, render both and put them side by side. A description of a change is not the same evidence as seeing it next to what it replaced.

## Handing off

Call the Skill tool with "design-review" once a surface is ready to ship, for the pre-release checks and the consistency work that follows.

## Attribution

The design-purpose taxonomy, the quality floor, and the named moves in [MOVES.md](MOVES.md) are adapted from [Impeccable](https://github.com/pbakaus/impeccable) (Apache License 2.0), condensed and rewritten for this skill's own format rather than reproduced. See [NOTICE](../../../NOTICE) for the full attribution.
