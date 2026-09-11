# Named moves

Reference for [visual-design](SKILL.md). Each move is scoped refinement, not license to redesign — read only the one the stated problem calls for, and stop at its edges.

## Bolder

Amplifies one already-existing part up to the conviction the rest of the page already implies. **Scope is sovereign**: touch only the named target — don't restyle its neighbors, don't add a color, font, or system primitive the surface doesn't already own. Reuse the system's own strongest moves (its motif, its type scale at full strength) rather than inventing new ones; the bolder version should look more like the same brand, not less.

**Skeleton test**: strip the copy out of the target and study the bare structure. Does it still say what the section is, through hierarchy and the system's own devices alone? If it only works once the words return, the boldness is in text size, not design.

## Quieter

Harder than bold — subtlety needs precision. Reduce, don't eliminate: saturation down to 70-85%, heavy font weights down a step, motion distances shorter with gentler easing, decorative layering flattened. Quiet ≠ grayscale or generic; keep the one or two anchors that still carry the personality, and check afterward that the interface is still just as functional and just as distinctive, only calmer.

## Distill

Strip to the one primary goal the surface serves. Remove redundant elements, repeated information, and secondary actions that compete with the primary one. This is about removing obstacles between users and their goal, not removing capability — never cut necessary functionality, accessibility affordances, or information a user needs to decide.

## Layout

Diagnose the structural problem before moving boxes. **Squint test**: blur the detail — can you still identify the primary element, the secondary element, and the major groups, in order? Group by meaning (proximity before adding a container), build rhythm from deliberate contrast between tight and generous spacing rather than one repeated value, and make responsive behavior structural: reorder, collapse, or reveal based on what stays important, not a reflexive breakpoint stack.

## Typeset

Before editing, assess: which faces and weights are already established, and are they earning their place or just unexamined defaults? Can heading, body, label, and metadata be told apart at a glance? Does body copy hold a 45-75ch measure? Use roles (heading, body, label, metadata) and a deliberate scale to carry hierarchy — don't ask raw size alone to do the whole job. A second font family needs a role only it can perform, or it's not earning its place.

## Colorize

Audit existing brand and semantic commitments (surface, text, action, focus, success/warning/error) before choosing anything new. Build roles, not a bag of swatches — let the strongest color own one deliberate region rather than scattering small accents everywhere. Prefer OKLCH for a new palette, since lightness and chroma adjust predictably. Contrast floor: body text 4.5:1, large text/controls/icons 3:1 — verify the computed foreground/background pair, not how it looks by eye.

## Animate

Motion explains state, a relationship, or hierarchy, or earns one authored moment the surface deserves; decoration without a job is animation debt. Write the thesis before implementing: the one focal moment (if any), what needs continuity across a change, what needs feedback. Timing follows consequence — 100-150ms for immediate feedback, 150-300ms for a routine state change, 300-500ms for a layout or overlay transition, up to 800ms for one deliberately authored entrance. Every animation needs a `prefers-reduced-motion` path that keeps state-carrying feedback legible; reduced motion means fewer and gentler animations, not a global kill switch that also erases the feedback.

## Delight

State in one sentence what the user should feel and why that feeling belongs to *this* product — a thesis specific enough that a neighboring product couldn't reuse it unchanged. Concentrate it at moments that earn it: first use, completion, recovery, mastery. Never let it delay or block the primary task, override an accessibility affordance or platform convention, or become mandatory and exhausting by the hundredth repetition. A joke at an error, deletion, payment, or access-loss moment trivializes it — lead with the problem and the recovery there instead.
