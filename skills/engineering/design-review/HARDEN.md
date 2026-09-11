# Hardening checklist

Reference for [design-review](SKILL.md)'s Harden lens. A design proven only against ideal data isn't proven — force each condition below rather than reasoning about whether the code should already handle it.

**Extreme inputs** — very long and very short text, emoji and RTL characters, large numbers, 1000+ item lists, no data at all. Clamp or ellipsis-truncate multi-line overflow, set `min-width: 0` on flex/grid items so they can actually shrink, keep mobile inputs at 16px minimum (iOS force-zooms a smaller focused field, which breaks the surrounding layout).

**Internationalization** — budget 30-40% extra width for translated text (German commonly runs long); use logical properties (`margin-inline-start`, not `margin-left`) so RTL doesn't need a parallel stylesheet; format dates, numbers, currency, and pluralization through `Intl` or an i18n library rather than string concatenation, which breaks under other languages' rules.

**Errors** — a network or API error names what failed, why when known, and how to recover or what alternative remains; never expose an internal error code as the primary message. Handle 400/401/403/404/429/500 as distinct states rather than one generic error screen, and preserve the user's input across a validation failure.

**Edge cases** — an empty state distinguishes first-use from no-results from filtered-to-nothing from failed-to-load, each with its own next action, not one shared "nothing here." Large datasets paginate or virtualize instead of rendering everything at once. Concurrent actions are guarded (disable the button while the request is in flight) instead of racing. An interrupted gesture — a second pointer landing mid-drag, a `pointercancel`, lost capture, a window blur — clears drag state and releases capture so the next interaction isn't stuck.

**Accessibility resilience** — every path reachable by keyboard alone, dynamic changes announced through a live region, high-contrast mode not relying on color alone to carry a distinction.

**Performance resilience** — event listeners and subscriptions cleaned up on unmount, pending requests aborted rather than left to resolve into an unmounted component, search and scroll handlers debounced or throttled.

Verify each one by actually forcing the condition — paste a 100-character name, disable the network, click submit ten times fast — and say what you tested, not what should work.
