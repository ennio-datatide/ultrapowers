# Architecture Profile Matching

This reference is consulted by `skills/brainstorming/SKILL.md` during **Step 5 — Propose 2-3 approaches**. Profiles seed one of the approaches; fresh thinking seeds the others.

**Core principle:** Profiles are *inspiration*, not prescription. The user's design wins. Profiles exist to suggest tool choices that have worked well for similar past projects, so there's always a familiar reference point among the 2-3 approaches shown — but there's always at least one genuine alternative, too.

## Lookup order

1. Repo-level override: `<repo>/.claude/ultrapowers-architecture-defaults.json` — if present, its profiles **replace** (not merge) user-level ones.
2. User-level: `~/.claude/ultrapowers-architecture-defaults.json` — baseline profiles.
3. Neither file → skip this step silently; fall back to normal clarifying questions.

## File schema

```json
{
  "profiles": [
    {
      "id": "<stable-id>",
      "description": "<one-line human description>",
      "signals": ["<lowercase-phrase>", "..."],
      "stack": { "<role>": "<tool-identity>", "...": "..." },
      "skills": ["<skill-name-with-or-without-pack-prefix>"],
      "reference_projects": ["<project-name>"]
    }
  ]
}
```

**Important:** `stack` entries store **tool identity only** — no version pins. Each deep-research run resolves the current latest per tool. The seed file stays future-proof.

## Matching algorithm

```
match_profile(clarified_needs, profiles):
    # Match against what the user said during clarifying questions —
    # product type, audience, constraints, tech mentions. Not the raw idea.
    normalized = lowercase(clarified_needs)
    scored = []
    for p in profiles:
        count = number of signals in p.signals that appear in normalized (word boundary)
        if count >= 1:
            scored.append((p, count))

    if len(scored) == 0:
        return None
    return max(scored, key=count)  # single best match feeds one approach
```

Only the top match is used as the seed for one of the 2-3 approaches. If multiple profiles tie, pick the first-defined or ask the user briefly: *"A couple of past-project profiles could work here — {A} or {B}. Any preference, or should I pick whichever fits best?"*

## Adapting the profile into an approach

Take the profile's `stack` and adjust:

1. **Drop what's irrelevant.** If the idea doesn't need payments, drop Stripe even if the profile includes it.
2. **Add what the idea needs.** If the user mentioned realtime features and the profile doesn't cover that, add the missing piece.
3. **Adjust deployment to constraints.** Profile says Vercel but the user has an existing Fly.io account? Flex to match.
4. **Preserve the profile's opinions** where they align with the idea — that's the whole point. The point isn't to hide the profile, it's to start from a known-good baseline.

## Presenting approaches (the wording during step 5)

Present all 2-3 approaches uniformly so none is privileged. Name each approach by its character, not "the profile one":

> "Here are three directions for this:
>
> **Approach 1 — Lean content site.** Astro + Tailwind + Netlify + a Resend form. Similar to how I've built marketing/consultancy sites before. ~1 day to ship, minimal ongoing cost. Trade-off: not great if you expect to add dashboards or authed content later.
>
> **Approach 2 — Start minimal, grow modular.** Next.js + Vercel + a simple static content layer. Costs slightly more up front but lets you add auth/payments later without rearchitecting.
>
> **Approach 3 — Dedicated CMS path.** Astro + Sanity + Netlify. Best if multiple non-technical people will edit content regularly.
>
> Which of these fits, or do you want to mix pieces from different ones?"

### When to recommend vs. present neutrally

Default is neutral presentation — let the user choose. But recommending is a valid tool when you have strong, specific signal. Use judgment per-choice, not a blanket rule.

**Recommend** when:
- The user is `non-technical` (per tone calibration) AND you have enough signal from clarifying questions to genuinely know the best fit. Non-technical users often get stuck in decision paralysis with 3 similar-sounding options — a clear recommendation with reasoning actually helps.
- One approach is meaningfully safer / simpler / cheaper given explicit constraints the user stated (budget, timeline, team size).
- The user explicitly asks: *"which do you recommend?"*.

**Present neutrally (no recommendation)** when:
- The user is `technical` and has opinions — let them lead.
- The three approaches are genuinely close in trade-offs; recommending would be cosmetic.
- You don't yet have enough context to know which fits best.

**How to recommend without pushing:**

> "All three would work. **For what you described, I'd go with Approach 2** — you mentioned wanting to add accounts later without rewriting, and Next.js + Vercel makes that easiest. Happy to go with 1 or 3 if you prefer, though."

One line of recommendation + one line of *why this specific user's context matters* + an explicit opening for disagreement. Never "the recommended one" as a generic label; always grounded in what they said.

**Always acceptable answers from the user:** pick one, mix pieces, ask for another alternative, or reject all three and go in a different direction. The profile library is optional inspiration; don't treat "none of these" as a corner case.

## Seed profiles

Seeded on first run of modified brainstorming via the consent prompt (see `skills/brainstorming/SKILL.md` §Architecture profile matching). The file is **not** written unilaterally.

### Profile: `marketing-content-site`

```json
{
  "id": "marketing-content-site",
  "description": "Brochureware, personal site, agency/consultancy, blog, content-heavy",
  "signals": ["marketing", "content", "blog", "landing", "personal site", "consultancy", "agency", "brochure"],
  "stack": {
    "framework": "astro",
    "ui": "react-islands",
    "styling": "tailwindcss",
    "language": "typescript",
    "database": "neon+drizzle (when needed)",
    "email": "resend",
    "icons": "astro-icon + @iconify-json/tabler",
    "deploy": "netlify"
  },
  "skills": [
    "ultrapowers-dev:typescript-best-practices",
    "ultrapowers-dev:tailwind-patterns",
    "ultrapowers-dev:react-best-practices",
    "neon-drizzle-patterns"
  ],
  "reference_projects": ["datatide-web", "WebPage (enniomaldonado.com)"]
}
```

### Profile: `saas-product-app`

```json
{
  "id": "saas-product-app",
  "description": "Authed product / dashboard / subscription / multi-tenant",
  "signals": ["saas", "app", "product", "auth", "subscription", "dashboard", "tenant", "billing"],
  "stack": {
    "framework": "next.js (app router)",
    "ui": "react",
    "styling": "tailwindcss",
    "language": "typescript",
    "auth": "clerk",
    "database": "supabase",
    "payments": "stripe",
    "email": "resend",
    "i18n": "next-intl (if multilingual)",
    "testing": "vitest + @testing-library + playwright",
    "analytics": "@vercel/analytics",
    "deploy": "vercel"
  },
  "skills": [
    "ultrapowers-dev:nextjs-patterns",
    "ultrapowers-dev:react-patterns",
    "ultrapowers-dev:react-best-practices",
    "ultrapowers-dev:typescript-best-practices",
    "ultrapowers-dev:tailwind-patterns",
    "ultrapowers-dev:testing-tdd",
    "ultrapowers-dev:e2e-testing",
    "ultrapowers-dev:supabase-patterns",
    "clerk-nextjs-patterns",
    "stripe-nextjs-patterns",
    "nextjs-i18n-patterns"
  ],
  "reference_projects": ["ultrapowers-web"]
}
```

## Extending profiles

Users can add profiles by editing `~/.claude/ultrapowers-architecture-defaults.json` directly or through a future `project-setup profiles` mode. Keep `id` stable — it's referenced in specs and plans.
