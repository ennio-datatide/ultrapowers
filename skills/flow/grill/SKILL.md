---
name: grill
description: Phase 1 of the build flow. Use before any new feature, component, app, or behaviour change — interviews the user until the idea is airtight, builds the project's shared vocabulary as it goes, then hands off to research and spec. Not for bug fixes; use systematic-debugging for those.
---

# Grill

**Phase 1 of 5: Grill → Spec → Tickets → Implement → Review.**

Sharpen a vague idea into something buildable, by interview. Nothing gets built until the frontier is empty.

<HARD-GATE>
Do not write code, scaffold a project, or take any implementation action until the grilling is complete and the user has confirmed you share an understanding. This applies to every project regardless of how simple it looks. "Simple" projects are where unexamined assumptions cause the most wasted work.
</HARD-GATE>

## Steps

### 1. Orient

Explore the current project state: files, docs, recent commits. Call the Skill tool with "workspace-search" first, and search rather than reading broadly. If a `CONTEXT.md` exists, read it — you will speak the user's vocabulary for the rest of the session.

### 2. Calibrate language

Read `~/.claude/ultrapowers-user-profile.json` for `technicalComfort`; a `technicalComfortOverride` in `.claude/ultrapowers-preferences.json` wins if present.

If neither is set (the Claude Code setup normally saves it), ask exactly one question before anything else, with the **AskUserQuestion** menu: "Technical (developer, engineer, tech PM)" or "Non-technical (creator, founder, business owner, designer)". The "Other" row lets them describe themselves; infer from that.

Save the answer to `~/.claude/ultrapowers-user-profile.json` as `{"technicalComfort": "..."}`, keeping any other keys in the file. Ambiguous or blank defaults to `technical`, announced in one line. The user can say `explain simpler` or `talk more technical` at any point to switch (see `grilling` for what that also changes on screen).

**If `non-technical`, orient them once — first time only, in this repo.** They have no idea what is about to happen, and a five-line map removes most of the anxiety:

> Here's how this works: I'll ask you a few rounds of questions to pin the idea down. Each one is a short menu: pick with the arrows and Enter, my recommendation is always first, and "Other" lets you write your own answer. Then I write up what we agreed for you to check, break it into pieces you'll be able to see working, build them one at a time, and finish with a checklist you can run yourself.
>
> Two things worth knowing: **say `wait what` any time I lose you** and I'll re-explain in plain English. And nothing gets built until you've approved the write-up.

Say this once, in their language. Never repeat it in later sessions — check whether `.claude/ultrapowers-preferences.json` already exists, which means they've been here before.

### 3. Load workflow preferences

Read `.claude/ultrapowers-preferences.json`. If it exists, announce in one line and move on:

> Using saved workflow prefs (auto-commit: on, auto-push: on, commit docs: off). Say "change prefs" to update.

If it does not exist, ask once, with the **AskUserQuestion** menu: one question per setting, the default first and marked as recommended. **Phrase it for the audience** — `technical`: auto-commit, auto-push, commit design docs.

`non-technical` — same three settings, no jargon: **save your progress as I go**, **back it up to GitHub automatically**, and **keep the planning documents private** rather than saving them alongside your code.

Where the menu is not available, ask in text with the defaults visible and "Reply `ok`, or tell me what to change."

Defaults either way: `autoCommit: true`, `autoPush: true`, `commitDesignDocs: false`. Write the file; create `.claude/` if needed.

### 4. Grill

Call the Skill tool twice, for "grilling" and "domain-modeling".

Run them together: `grilling` works the design tree in rounds, `domain-modeling` captures the vocabulary and decisions as they crystallise. Both, always, whenever there is a working directory to leave a paper trail in. That paper trail is what makes the *next* session cheap.

Do not proceed until the frontier is empty and the user confirms you have a shared understanding.

**If the idea includes a UI or visual surface**, also call the Skill tool with "visual-design" during this step, to settle audience, intent, and design purpose alongside the rest of the interview rather than after.

**Stack and tooling questions.** When one reaches the frontier, consult [architecture-profile-matching.md](./architecture-profile-matching.md) to seed your **recommended answer** from profiles that have worked before. Adapt the profile to this idea; never paste it in whole, and never present it as the only option. The user's design wins.

### 4a. Scan for sibling-pack skills

Match the settled design against [sibling-pack-map.md](./sibling-pack-map.md).

- **Installed matches** — note them; they get a `## Referenced Skills` section in the spec. Silent, no prompt.
- **A relevant pack that isn't installed** — emit one blocking prompt per pack, with the AskUserQuestion menu (install / skip / skip and stop suggesting), but only where `suggestSiblingPacks.<pack>` is true in `.claude/ultrapowers-preferences.json`. Treat a missing key as true.

### 5. Research

Call the Skill tool with "deep-research".

This runs every time and is not optional. The user cannot be expected to notice that a pattern went stale eighteen months ago; that protection has to be automatic. Research feeds the thinking you just did — if it contradicts a decision from the grilling, take it back to the user rather than quietly overriding them.

Research runs once, then Spec. (`skills-audit` and `skills-creation` are unpromoted maintenance skills now; reach for them deliberately, not as part of this chain.)

### 6. Hand off to Spec

Call the Skill tool with "spec".

Announce the transition in one line so the user always knows where they are in the flow:

> Grilling done. Moving to Spec — writing up what we agreed.

## Context hygiene

Keep Grill, Spec, and Tickets in **one unbroken context window**. Do not clear or compact between them: Spec wants the reasoning verbatim, not a summary of it.

If the window approaches its useful limit before Tickets, compact at the phase boundary with an instruction naming what comes next, rather than pushing on degraded. Never make the user decide this.

## Scope check

If the idea covers several independent subsystems, say so **before** grilling the detail, and decompose it with the user. Each piece then gets its own pass through the whole flow. Grilling the details of a project that needed splitting wastes the session.

## Red flags

| Thought | Reality |
|---|---|
| "This is too simple to need grilling" | Every project goes through this. The tree can be short. |
| "I'll ask them where X is configured" | That's a fact. Find it yourself. |
| "I'll start scaffolding while they think" | The gate is hard. Nothing gets built yet. |
| "Research will slow us down" | It runs every time. Non-negotiable. |
| "I'll skip the glossary, it's overhead" | It's the thing that makes session two cheap. |
