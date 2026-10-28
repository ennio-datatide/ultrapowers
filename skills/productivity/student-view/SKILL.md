---
name: student-view
description: Switch this computer to the view a non-technical student has after the Claude Code setup (focus view, the Plain style, plain-language grill). For a teacher sharing their screen.
disable-model-invocation: true
---

# Student view

Switch the screen to what a student sees after "set up my Claude Code", so a shared screen matches theirs. `/full-view` switches back.

1. Run:

   ```bash
   node "<this skill's base directory>/../claude-code-setup/scripts/apply-display.mjs" non-technical ~/.claude/settings.json
   ```

2. Tell them, in their language and in three lines at most:
   - Done: from their next message, answers use the Plain style and grill talks in plain language, like a student's.
   - To switch the view on screen right now, type `/focus` (a new session starts in it by itself).
   - `/full-view` goes back to the detailed view.

If the script says it kept a view or style they chose themselves, say so in one line: that value stays, so their screen still differs from a student's there.
