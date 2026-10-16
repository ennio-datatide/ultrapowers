# macOS setup details

## Package manager: Homebrew

If `brew` is missing, the user installs it in their own Terminal, because the installer asks for their Mac password:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

The installer ends by printing two or three "Next steps" lines that add Homebrew to the PATH. Ask the user to run those too, then restart Claude Code so this session can see `brew`.

## Xcode license

If any `brew install` fails with "You have not agreed to the Xcode license", the user runs this in their own Terminal, then you retry:

```bash
sudo xcodebuild -license accept
```

This typically appears after a macOS or Xcode update. It needs their Mac password, so you cannot run it for them.

## Core tools

Install only what `check-env.sh` reported missing:

```bash
brew install git node jq gh envchain
```

## Secrets: envchain

envchain stores each secret in the macOS Keychain, grouped by service, and hands a service's secrets to one command at a time.

Install the bundled helper, which is the only way secrets get stored:

```bash
mkdir -p ~/.claude/tools && cp "<skill dir>/scripts/add-secret.sh" ~/.claude/tools/ && chmod +x ~/.claude/tools/add-secret.sh
```

Store a secret (the user runs this in their own Terminal, never through you):

```bash
~/.claude/tools/add-secret.sh <service> <VAR_NAME>
```

For a secret that a background job uses while nobody is at the computer (launchd, cron), add `--unattended`: `~/.claude/tools/add-secret.sh --unattended <service> <VAR_NAME>`. The job cannot answer a password prompt, so that secret is stored without one. Give such secrets their own service name so the interactive ones keep their prompt, and tell the user that the first time the job runs macOS may ask once; for this item only, **Always Allow** is the right answer.

Always give the user this helper, never a raw `envchain --set` command. envchain shows the value on screen as it is pasted unless `--noecho` is added, and skips the approval prompt unless `--require-passphrase` is added. Both flags are easy to forget, so the helper always applies them. It also refuses to run from inside Claude Code, from a pipe, or with the secret value on the command line.

Use a secret:

```bash
envchain <service> <command> [args...]
```

Other commands: `envchain --list` shows the services, `envchain --unset <service> <VAR_NAME>` removes one. The items are also visible in the Keychain Access app (search for "envchain").

When the macOS dialog appears, the user should click **Allow**, not **Always Allow**. "Always Allow" removes the approval step for that secret.

Values for the personal instructions template:

- `{{SECRETS_TOOL}}`: envchain (macOS Keychain)
- `{{SECRETS_SET}}`: `~/.claude/tools/add-secret.sh <service> <VAR_NAME>`
- `{{SECRETS_RUN}}`: `envchain <service> <command>`
- `{{PROJECTS_DIR}}`: `~/Code`
