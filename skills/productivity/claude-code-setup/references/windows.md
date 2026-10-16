# Windows setup details

Claude Code on Windows runs your shell commands through Git Bash, so the commands below are written to be run from there. Windows PowerShell (`powershell.exe`) is always available and is used for the secrets tool.

## Package manager: winget

winget ships with Windows 10 and 11. If it is missing, the user installs "App Installer" from the Microsoft Store.

## Core tools

Install only what `check-env.sh` reported missing. Each install may show a Windows permission dialog that the user has to accept:

```bash
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
winget install -e --id jqlang.jq --accept-source-agreements --accept-package-agreements
winget install -e --id GitHub.cli --accept-source-agreements --accept-package-agreements
```

Newly installed tools are not visible to the current session, because the PATH is read when a program starts. After installing, continue with the steps that do not need the new tools, then ask the user to close and reopen Claude Code and run this skill again. It picks up where it left off.

## Secrets: cc-secrets.ps1

There is no envchain for Windows. The bundled `scripts/cc-secrets.ps1` gives the same workflow on top of Microsoft's SecretManagement and SecretStore modules: secrets are kept in an encrypted vault, grouped by service, and every use opens a Windows dialog asking for the vault password. That dialog is the approval step.

Install the script:

```bash
mkdir -p ~/.claude/tools && cp "<skill dir>/scripts/cc-secrets.ps1" ~/.claude/tools/
```

One-time vault setup. The user runs this in their own PowerShell window, because they choose and type the vault password:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.claude\tools\cc-secrets.ps1" init
```

Tell them plainly that the vault password cannot be recovered. If they forget it, the stored secrets are gone and have to be created again at each service.

Store a secret (the user runs this in their own PowerShell window, never through you):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.claude\tools\cc-secrets.ps1" set <service> <VAR_NAME>
```

Use a secret (you run this from Git Bash):

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$HOME/.claude/tools/cc-secrets.ps1" run <service> <command> [args...]
```

Other actions: `list` shows stored names without values, `remove <service> <VAR_NAME>` deletes one.

Known limits to keep in mind:

- Use `powershell.exe` (Windows PowerShell 5.1), not `pwsh`. The password dialog is a 5.1 feature; PowerShell 7 asks in the console instead, which cannot be answered when you start the command.
- An argument written as `-name:value` can be split by PowerShell before it reaches the wrapped command. If a command needs that form, put it in a small script file and run the script through the wrapper.

## The claude-libre shortcut

Adds a `claude-libre` function to the user's PowerShell profile, creating the profile if it is missing. Safe to run again: it does nothing if the function is already there. Run it from Git Bash:

```bash
powershell.exe -NoProfile -Command '$p = $PROFILE.CurrentUserCurrentHost; if (-not (Test-Path $p)) { New-Item -ItemType File -Path $p -Force | Out-Null }; if (-not (Select-String -Path $p -Pattern "function claude-libre" -Quiet)) { Add-Content -Path $p -Value "`r`n# Claude Code without permission prompts: only inside a project folder with git`r`nfunction claude-libre { claude --dangerously-skip-permissions @args }" }'
```

PowerShell only loads a profile when scripts are allowed for the user. Check with `powershell.exe -NoProfile -Command 'Get-ExecutionPolicy'`; if it says `Restricted`, allow local scripts for this user only (no admin needed):

```bash
powershell.exe -NoProfile -Command 'Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force'
```

It works in PowerShell windows opened afterwards.

Values for the personal instructions template:

- `{{SECRETS_TOOL}}`: cc-secrets (an encrypted Windows vault)
- `{{SECRETS_SET}}`: `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.claude\tools\cc-secrets.ps1" set <service> <VAR_NAME>`
- `{{SECRETS_RUN}}`: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$HOME/.claude/tools/cc-secrets.ps1" run <service> <command>`
- `{{PROJECTS_DIR}}`: `%USERPROFILE%\Code`
