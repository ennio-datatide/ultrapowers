# Audit rubric

Reference for [design-review](SKILL.md)'s Audit lens. This is a code-level technical check, not a subjective critique — verify each dimension against a rendered result or a computed value, not by eye alone. Score each 0-4.

1. **Accessibility** — contrast below 4.5:1 body / 3:1 large text, `prefers-reduced-motion` with no intentional alternative, missing ARIA roles/labels, missing focus indicators or a keyboard trap, broken heading hierarchy, missing alt text, unlabeled form inputs. 0 = fails WCAG A, 4 = meets AA and approaches AAA.
2. **Performance** — layout thrashing, unbounded or casual layout-property animation, missing lazy-loading on images, `will-change` left on at rest instead of scoped to a known animation, unnecessary re-renders. 0 = unoptimized throughout, 4 = fast and lean.
3. **Theming** — hard-coded colors instead of tokens, missing or broken dark-mode variants, tokens used inconsistently. 0 = no theming, 4 = a full token system with dark mode composed (not mechanically inverted).
4. **Responsive design** — fixed widths that break on mobile, touch targets under 44×44px, a custom drag/slider surface whose gesture fails under touch (mouse-only handlers, no `touch-action`, drag state nothing clears on cancel or blur), horizontal scroll, layouts that break under text scaling. 0 = desktop-only, 4 = fluid at every viewport with working touch gestures.
5. **Implementation integrity** — repeated implementation shortcuts, design-system drift, decorative content standing in for real content, structure interchangeable with an unrelated product. 0 = systemic drift, 4 = coherent and clearly intentional.

## Reporting

Total the five scores out of 20: 18-20 excellent, 14-17 good, 10-13 acceptable, 6-9 poor, 0-5 critical. Tag every finding:

- **P0** — blocks task completion, fix immediately
- **P1** — major difficulty or a WCAG AA violation, fix before release
- **P2** — an annoyance with a workaround, fix in the next pass
- **P3** — polish, no real user impact, fix if time permits

For each finding, name the location (component/file), the dimension it falls under, the user-facing impact, and the standard it violates when one applies. Group recurring findings as one systemic pattern ("hard-coded colors across 15 components") rather than repeating the same note per instance, and don't let P3 noise crowd out the P0/P1 findings that actually gate shipping.
