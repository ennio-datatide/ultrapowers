---
name: prototype
description: Build a throwaway prototype to answer one design question — a single shareable HTML file for state and logic questions, or several radically different UI variations toggleable from one route. Use when a design question is hard to settle in conversation and needs something runnable to look at.
---

# Prototype

A prototype is a small, throwaway program that answers **one design question**. Not a demo, not a first draft of the real thing: an answer.

Reach for it the moment a question needs a runnable answer — does this state model actually work, what should this screen look like — instead of arguing it out on paper. For a user who can't read a spec, reacting to something on screen is often the *only* reliable way to settle a design question.

**Throwaway is a constraint on how the code is written, not a promise to destroy it.** The answer folds back into the real code; the prototype itself is kept as evidence on a `prototype/<name>` branch off main, pointed at from the spec or ticket it settled.

## Pick the kind

| The question is about | Build | Guide |
|---|---|---|
| State, logic, a flow, a data shape | one shareable HTML file | [LOGIC.md](./LOGIC.md) |
| What a screen should look or feel like | several radically different variations, toggleable from one route | [UI.md](./UI.md) |

For UI, **radically different** is the whole point. Three variations of the same idea teach nothing; the user can't tell you what they want until they've seen options that genuinely disagree with each other.

## Rules

- **One question per prototype.** If you're answering two, build two.
- **State the question in writing before you build**, and confirm it with the user. A prototype that answers a question nobody asked is wasted work.
- **Don't wire it to real infrastructure.** Fake the data. The question is almost never about the backend.
- **Don't polish.** Polish reads as a commitment, and the user starts reviewing the wrong thing.
- **Close the loop.** When it's answered, say what the answer was and inline the decision-rich part (state machine, reducer, schema, type shape) into the spec or ticket. The prototype is a primary source; the decision is what travels.
