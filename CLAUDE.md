# Ultrapowers repo conventions

## Buckets

Skills live in bucket folders under `skills/`:

- `flow/` — the five phases: grill, spec, tickets, implement, review
- `engineering/` — model-invoked disciplines the phases call
- `productivity/` — non-code tools
- `core/` — the rails: the router, and the skills that make the agent decide rather than ask
- `meta/` — skills about authoring skills
- `misc/` — real but off-path; **not promoted**

**Promoted buckets** (`flow`, `engineering`, `productivity`, `core`, `meta`) must appear in `.claude-plugin/plugin.json`'s `skills` array and in the README. **`misc/` must appear in neither** — that is what makes it cost no context.

Run `claude plugin validate . --strict` after touching a manifest.

## When to extract a skill

**Reuse is the reason to extract, not the test.** Discipline used by exactly one caller belongs inline in that caller, not in its own skill: every skill description sits in the agent's context on every turn whether it fires or not.

Verification, sub-agent dispatch, and branch finishing are inline inside `implement` and `review` for this reason. Before adding a skill, name its second caller. If there isn't one, inline it.

## Invocation

Ultrapowers inverts Matt Pocock's invocation model deliberately: his orchestrators are user-invoked (`disable-model-invocation: true`) because his readers are engineers who will type them. Ours are model-invoked and auto-chained, because our users will never be the index.

The single exception is `wait-what`, which stays user-invoked. Firing it unprompted means deciding someone looks confused, which is obnoxious.

## Language

Agent-facing text keeps the engineering vocabulary verbatim (`seam`, `tracer bullet`, `deep module`, `blast radius`, `frontier`) — the precision is what makes the skills work. User-facing text never surfaces those raw. `technicalComfort` in `~/.claude/ultrapowers-user-profile.json` selects the rendering.

## Attribution

The method is [Matt Pocock's](https://github.com/mattpocock/skills) (MIT). When porting from his repo, port reference documents verbatim where their precision is the value, and adapt only the surface. Keep his copyright line in `LICENSE`.
