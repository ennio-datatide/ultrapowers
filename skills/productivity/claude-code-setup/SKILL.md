---
name: claude-code-setup
description: "First-time setup of Claude Code for a non-technical person on macOS or Windows: installs the basic tools, sets up safe storage for secrets (API keys, tokens) with an approval prompt on every use, applies sensible safety defaults, a readable theme, a status line, a quieter screen for people who are not technical and personal instructions, and installs the ultrapowers-dev and ultrapowers-business plugins and the pulse mod next to ultrapowers, checking that the Impeccable design plugin that comes with it is there once. Use this whenever someone is getting started with Claude Code, setting up a new computer, asks to 'set up', 'onboard', 'install ultrapowers', or asks where to keep API keys and passwords safely, even if they do not mention setup by name. Safe to run again at any time to repair or finish a setup."
---

# Claude Code Setup

Take a new computer from "Claude Code is installed" to "ready to build", with opinionated defaults for someone who runs a business and is not a software engineer.

The person you are helping probably has no opinion about package managers, git settings or permission rules, and should not need one. Make the decisions, explain each in a sentence of plain language, and only stop for things that truly need them: their name, a password, a login, a click on a system dialog.

**Announce at start:** "I'm going to set up Claude Code on this computer. It takes about ten minutes, and I'll tell you whenever I need you to do something."

## Ground rules

- **Check before changing.** Every step first looks at what is already there and skips what is done. The skill is meant to be re-run, for example after a restart on Windows, so it must never duplicate or overwrite earlier work.
- **Secrets never pass through the conversation.** Anything typed into this chat is stored in the transcript. Passwords and API keys are typed by the user into their own terminal window, never pasted here, and you never run a command that prints one.
- **Secrets never appear on screen either.** A value that is visible while being pasted stays in the terminal's scroll-back and shows up in screen shares and recordings. So secrets are only ever stored through the bundled helpers (`add-secret.sh` on macOS, `cc-secrets.ps1 set` on Windows), which hide the input. Never hand the user a raw `envchain --set` command: it shows the value unless an extra flag is remembered.
- **If a secret does get exposed** (pasted into this chat, shown on screen, or put on a command line), say so plainly and do not use it. The fix is to revoke it at the service, create a new one, and store the new one with the helper. Clearing the screen is not enough.
- **Some things only the user can do**: anything needing their computer password (`sudo`), browser logins, and typing secret values. For each, give the exact command to copy, say where to run it (a separate Terminal or PowerShell window), and wait for them to confirm.
- **Plain language.** Say "a place to keep passwords that asks you before each use", not "a keychain-backed credential store". Use the everyday word when there is one, and the first time a technical word is needed (Terminal, git, token, plugin), explain it in a few words. Name the tool once so they recognise it later.

## Step 1: See what is already in place

Run the bundled status script. It is read-only and works on macOS and in Git Bash on Windows:

```bash
bash "<skill dir>/scripts/check-env.sh"
```

Each line is `name: ok | missing | todo  (detail)`. The first line is the platform. Then read the matching reference file, which has the exact commands for everything below:

- macOS: `references/macos.md`
- Windows: `references/windows.md`

If the platform is `other` (Linux), say that this setup covers macOS and Windows only, and offer to do the platform-neutral steps (5 to 8).

Show the user a short checklist of what is done and what you are about to do.

## Step 2: Ask the few things you cannot guess

Ask these together in one message, and skip any you can already answer from the status report (for example an existing git identity):

1. Their name and the email they want on their work (used for saving their work with git; the email they use, or will use, for GitHub is best).
2. One line about what they do or what they want to build.
3. The language they want you to talk to them in.
4. Whether they are technical (developer, engineer, tech PM) or not (creator, founder, business owner, designer). Ask this one with the AskUserQuestion menu, "Not technical" first. It decides how much the screen shows while Claude works (Step 5), and grill reads the same answer later, so it is never asked twice. If `~/.claude/ultrapowers-user-profile.json` already has `technicalComfort`, skip it.

Everything you write for them from here on, including the tips in Step 5, is in the language from question 3.

## Step 3: Install the basic tools

Install whatever is missing from: a package manager, git, Node.js, jq and the GitHub CLI. Why these: git is the undo button and backup for everything they build, Node.js runs most modern web tools, jq is needed by the ultrapowers hooks, and the GitHub CLI handles the GitHub login without a token to manage.

Then:

- Set the git identity from Step 2 if it is missing: `git config --global user.name "..."`, `git config --global user.email "..."`, and `git config --global init.defaultBranch main`.
- The git identity is always set, with or without a GitHub account.
- **GitHub login is optional for now, and skipping it is the normal case.** In the course, GitHub accounts are created in week 2. Ask once whether they already have a GitHub account. If they do, they can run `gh auth login` in their own terminal and choose GitHub.com, HTTPS and "Login with a web browser". If they do not, or would rather wait, skip it without pushing: say it gets done when they create their GitHub account, and move on. Never send them to sign up during this setup, and never block a later step on it.

## Step 4: Safe storage for secrets

Everyday project tokens go in each project's `.env` file, loaded into the command that needs them (the personal instructions in Step 6 explain it). This step adds a safer place for the most sensitive ones, such as payment or server keys.

Set up the secrets tool for the platform: envchain on macOS, the bundled `cc-secrets.ps1` on Windows. Both work the same way: secrets are grouped by service, the user approves every use with a system prompt, and the value goes straight to one command without appearing in this conversation.

Copy the helper script for the platform into `~/.claude/tools/` as the reference file describes. The helper is what makes storing a secret safe by default: the value is hidden while typed, approval is required on every later use, and it refuses to run from inside Claude Code or with the value on the command line. The settings in Step 5 also block you from running the store command yourself, so the only path is the user, in their own window, through the helper.

After it is installed, explain the idea in two or three sentences and show the one command they will use to add a secret. Do not ask them to add any secrets now unless they bring one up. A good default is to say: "When a project needs a key, I'll tell you its name and give you the command to store it."

## Step 5: Safety defaults and the recommended configuration

First copy the status line script into place, so the setting added below has something to run:

```bash
mkdir -p ~/.claude && cp "<skill dir>/scripts/statusline.mjs" ~/.claude/statusline.mjs
```

Then merge the bundled defaults into the user's settings. The script backs up the existing file, adds to the permission lists without removing anything, and never overrides a value the user already chose (including a theme picked in an older version):

```bash
node "<skill dir>/scripts/merge-settings.mjs" "<skill dir>/assets/settings-defaults.json" ~/.claude/settings.json
```

The script writes the status line command with the full home folder path and forward slashes, which works on macOS and on Windows whether Claude Code runs it through Git Bash or PowerShell.

What the defaults do, in the terms to use with the user:

- **Claude Code starts in auto mode:** it goes ahead with routine work such as editing files and running everyday commands, and stops to ask before anything risky. Git is the safety net for edits. If they had already chosen a starting mode, it is kept.
- **`.env` files can be loaded but not opened.** A project's tokens live in its `.env`; Claude loads them into the command that needs them (`set -a; source .env; set +a`) without ever showing the values. SSH keys and cloud credentials cannot be read at all.
- **Using a secret, publishing code, and deleting things always ask first**, whatever other permissions are granted later.
- **Storing a secret is something only the user can do.** Claude Code is blocked from running the store command, so a secret value never has a reason to pass through the conversation.
- **Admin commands and force pushes are blocked.**

Then set how much the screen shows while Claude works. First write the course tips in their language: translate the `text` of every entry in `assets/tips.json` into the language from Step 2 (keep each `id`, `cooldownSessions` and `priority`, keep key names such as Ctrl+O and Esc as they are) and save the result as `~/.claude/ultrapowers-tips.json`. Then run, with `<technical|non-technical>` from Step 2 and the word for "tip" in their language:

```bash
node "<skill dir>/scripts/apply-display.mjs" <technical|non-technical> ~/.claude/settings.json --tips-label "<Tip>"
```

It saves their answer to `~/.claude/ultrapowers-user-profile.json` too, and never overwrites a view or style they chose themselves. Run it again to switch; grill does that when they say `explain simpler` or `talk more technical`.

What it does, in one line each:

- **Not technical:** Claude Code starts in **focus view**: their message, one line that sums up the work, and the answer. The **Plain** style makes every answer start with ✅ what is done and 👉 what they have to do, without a running commentary. To see every step, `Ctrl+O`; to switch the view for this session, `/focus`.
- **Technical:** the normal view and style, every step visible.
- **Both:** a few tips about getting around the screen (seeing the detail, stopping Claude, jumping to the latest answer) join Claude Code's own tips while it works.

And the comfort defaults, in one line each:

- **A status line under the prompt** shows the session, the folder, the git branch with pending changes, the model, and how full the conversation is (green, then amber from 70%, red from 85%). When it turns red, it is time to start a fresh session.
- **The "ultrapowers" theme**, which comes with this plugin, keeps their own messages, the dimmed working steps and Claude's answers and questions clearly apart. If the merge kept a theme they had already chosen, tell them they can switch any time with `/theme`.
- **Fullscreen display, answers wrapped at a readable width, and dynamic workflows on.**
- **Ultrapowers updates itself.** After Claude Code starts, it checks for a new version in the background; when there is one, it says `Plugin updated` and the new version loads with `/reload-plugins` or in the next session. To update by hand, ask Claude for it: run `claude plugin marketplace update ultrapowers` and then `claude plugin update ultrapowers@ultrapowers`, and tell them to type `/reload-plugins`.
- **Phone notifications** when Claude is waiting for them or decides something is worth telling them. These only arrive while Remote Control is connected to the Claude app on their phone.

Shift+Tab moves between the permission modes, including plan mode, where Claude plans before touching anything. Keep every block and ask rule above even if they later switch to a more permissive mode: those rules are what keep protecting `.env` files, credentials, force pushes and deletes. Never turn off the warning Claude Code shows before its most permissive mode.

Later in the course they will start Claude Code with `claude --dangerously-skip-permissions`. Tell them, in these terms: "That command starts Claude Code without asking permission for each action. Use it only inside a project folder that has git, never in your home folder, and plain `claude` everywhere else; even then, the block rules still protect your secrets and stop force pushes." Do not set this mode as a default anywhere: Claude Code ignores it in a project's `.claude/settings.json`, and the personal instructions from Step 6 cover what to say if they ask to stop the prompts.

Do not add an "always allow" rule for the secrets wrapper, now or later, even if the user asks to "stop the prompts". Explain that the prompt is the only thing standing between a mistaken command and their accounts.

## Step 6: Personal instructions

Add the block from `assets/CLAUDE.user.md` to `~/.claude/CLAUDE.md`, which Claude Code reads at the start of every session on this computer. Fill in every `{{PLACEHOLDER}}` from Step 2 and from the values listed at the end of the platform reference file.

- If the file does not exist, create it with a `# My instructions for Claude` heading followed by the block.
- If it exists without the `claude-code-setup:start` marker, append the block and leave everything else untouched.
- If the marker is already there, replace only what is between the start and end markers.

If they said they are technical in Step 2, leave out the line "I am not a software engineer..." and the first bullet of "How to work with me" (plain language); the rest applies to everyone.

Then create the projects folder if it is missing (`mkdir -p ~/Code`) and tell the user this is where each new project gets its own folder.

## Step 7: Install the ultrapowers plugins

This skill ships inside the ultrapowers plugin, so ultrapowers itself is normally installed already and the status report shows `plugin-ultrapowers: ok`. Never reinstall, update or remove it from here, and never ask for a restart just for it. Only install what is reported `missing`:

```bash
claude plugin marketplace add ennio-datatide/ultrapowers   # only if `claude plugin marketplace list` does not show ultrapowers
claude plugin install ultrapowers-dev@ultrapowers
claude plugin install ultrapowers-business@ultrapowers
claude plugin install pulse@ultrapowers
claude plugin install ultrapowers@ultrapowers              # only if plugin-ultrapowers is missing (for example, loaded with --plugin-dir)
```

If a command says the marketplace or plugin is already there, treat it as done and move on; do not retry it. If a marketplace add fails with a network or git error, check that git is installed and visible to this session before retrying once; on Windows that usually means Claude Code needs a restart after Step 3.

One sentence each for the user: ultrapowers is the guided way of building (talk an idea through, write it down, build it in small tested steps, review it), ultrapowers-dev adds technical know-how, and ultrapowers-business adds marketing, sales and finance know-how.

pulse is a mod: a small add-on that changes how Claude Code looks, so the screen matches what the course shows in class. One sentence for the user: pulse adds a row under the prompt with what Claude is doing right now (the tool running and for how long, helpers working in parallel, how much of the 5-hour and weekly limits is used). It needs Claude Code 2.1.290 or later: if `claude --version` is older, run `claude update` first. They load after the restart in Step 9.

## Step 8: Check the Impeccable design plugin

Impeccable comes with ultrapowers: it is a dependency, installed as `impeccable@ultrapowers` when ultrapowers is. Its code is not part of ultrapowers. Act only on what the status report shows:

- `plugin-impeccable: ok`: nothing to do.
- `plugin-impeccable: missing`: run `claude plugin install impeccable@ultrapowers`.
- `plugin-impeccable: duplicate`: an older copy from Impeccable's own marketplace is enabled too, so every design skill would load twice. Run `claude plugin disable impeccable@impeccable` and tell the user, in one sentence, that you turned off a second copy of the design plugin and kept the one ultrapowers manages. Disable it, never uninstall it.

One sentence for the user: Impeccable adds design skills that I use whenever we design something, such as a page or an app screen, and it always lets you choose between three directions before anything is built.

## Step 9: Confirm and hand over

Run `check-env.sh` again and show the final checklist. Report honestly: list anything still `missing` or `todo` with the single action that finishes it, and do not describe the setup as complete while items remain. The one exception is `github-login`: if they skipped it, show it as "later, when you create your GitHub account" and do not count it against the setup.

When nothing is left `missing`, record the setup, so ultrapowers can offer to bring it up to date when a later version adds something:

```bash
node "<skill dir>/scripts/record-setup.mjs"
```

Then tell the user:

1. **Restart Claude Code now.** Plugins, settings, the view and personal instructions load at startup.
2. **How to start a project:** open the Terminal, type `claude`, and tell Claude which project to work in (a new folder inside the projects folder, or one that is already there) and what they want to build. No command is needed to change folder.
3. **How to add a secret**, with the exact command for their platform.
4. **How to undo:** press Esc twice to rewind recent changes, and ask "undo the last change" if unsure.

Keep the hand-over to those four points. They can ask for more when they need it.

## Bringing an older setup up to date

When ultrapowers says the setup on this computer is older than this one, run this skill as usual: every step checks first and only adds what is missing, so nothing they have is undone. Tell the user what is new in one or two lines, from this list, then go through the steps.

What each setup version added (`assets/setup-version` holds the current one):

- **2:** whether they are technical, and a quieter screen if they are not (focus view, the Plain style, the question menu); screen tips in their own language; ultrapowers updates itself; the pulse mod; no command needed to change folder.
