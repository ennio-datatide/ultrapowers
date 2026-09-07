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

If neither is set, ask exactly one question, before anything else:

> Quick calibration so I match your style — are you **technical** (developer, engineer, tech PM) or **non-technical** (creator, founder, business owner, designer)? Reply `technical` or `non-technical`, or just describe yourself and I'll infer.

Save the answer to `~/.claude/ultrapowers-user-profile.json` as `{"technicalComfort": "..."}`. Ambiguous or blank defaults to `technical`, announced in one line. The user can say `explain simpler` or `talk more technical` at any point to switch.

### 3. Load workflow preferences

Read `.claude/ultrapowers-preferences.json`. If it exists, announce in one line and move on:

> Using saved workflow prefs (auto-commit: on, auto-push: on, commit docs: off). Say "change prefs" to update.

If it does not exist, ask once, with defaults visible:

> Workflow defaults for this repo: **auto-commit on**, **auto-push on**, **commit design docs off**. Reply `ok` to accept, or tell me what to change.

Defaults: `autoCommit: true`, `autoPush: true`, `commitDesignDocs: false`. Write the file; create `.claude/` if needed.

### 4. Grill

Call the Skill tool twice, for "grilling" and "domain-modeling".

Run them together: `grilling` works the design tree in rounds, `domain-modeling` captures the vocabulary and decisions as they crystallise. Both, always, whenever there is a working directory to leave a paper trail in. That paper trail is what makes the *next* session cheap.

Do not proceed until the frontier is empty and the user confirms you have a shared understanding.

**Stack and tooling questions.** When one reaches the frontier, consult [architecture-profile-matching.md](./architecture-profile-matching.md) to seed your **recommended answer** from profiles that have worked before. Adapt the profile to this idea; never paste it in whole, and never present it as the only option. The user's design wins.

### 4a. Scan for sibling-pack skills

Match the settled design against [sibling-pack-map.md](./sibling-pack-map.md).

- **Installed matches** — note them; they get a `## Referenced Skills` section in the spec. Silent, no prompt.
- **A relevant pack that isn't installed** — emit one blocking prompt per pack (install / skip / skip and stop suggesting), but only where `suggestSiblingPacks.<pack>` is true in `.claude/ultrapowers-preferences.json`. Treat a missing key as true.

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
