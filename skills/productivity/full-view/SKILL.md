---
name: full-view
description: Switch this computer back to the detailed view, every step visible, after /student-view. The view a technical person has after the Claude Code setup.
disable-model-invocation: true
---

# Full view

Switch the screen back to the detailed view: every step visible, Claude Code's default style, grill in technical terms. `/student-view` switches to what a student sees.

1. Run:

   ```bash
   node "<this skill's base directory>/../claude-code-setup/scripts/apply-display.mjs" technical ~/.claude/settings.json
   ```

2. Tell them, in their language and in three lines at most:
   - Done: from their next message, answers use the default style and grill talks in technical terms.
   - If the screen is still in the quiet view, type `/focus` to leave it (a new session starts in the full view by itself).
   - `/student-view` switches back.
