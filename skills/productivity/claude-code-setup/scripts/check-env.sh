#!/usr/bin/env bash
# Read-only status report for the claude-code-setup skill.
# Works on macOS and on Windows under Git Bash. Changes nothing.
# Output: one "name: ok|missing|todo  (detail)" line per item.

case "$(uname -s)" in
  Darwin) platform=macos ;;
  MINGW*|MSYS*|CYGWIN*) platform=windows ;;
  *) platform=other ;;
esac
echo "platform: $platform"

have() { command -v "$1" >/dev/null 2>&1; }

report() { # name, status, detail
  printf '%s: %s' "$1" "$2"
  [ -n "$3" ] && printf '  (%s)' "$3"
  printf '\n'
}

tool() { # name, binary, version args...
  local name=$1 bin=$2; shift 2
  if have "$bin"; then
    report "$name" ok "$("$bin" "$@" 2>&1 | head -1)"
  else
    report "$name" missing
  fi
}

# Package manager
if [ "$platform" = macos ]; then
  tool package-manager brew --version
  if have xcodebuild && xcodebuild -license check 2>&1 | grep -qi "license"; then
    report xcode-license todo "run: sudo xcodebuild -license accept"
  fi
elif [ "$platform" = windows ]; then
  tool package-manager winget --version
fi

# Core tools
tool git git --version
tool node node --version
tool jq jq --version
tool github-cli gh --version

# Git identity
if have git; then
  name=$(git config --global user.name)
  email=$(git config --global user.email)
  if [ -n "$name" ] && [ -n "$email" ]; then
    report git-identity ok "$name <$email>"
  else
    report git-identity missing
  fi
fi

# GitHub login
if have gh; then
  if gh auth status >/dev/null 2>&1; then
    report github-login ok
  else
    report github-login todo "optional for now; user runs: gh auth login once they have a GitHub account"
  fi
fi

# Secrets tool
if [ "$platform" = macos ]; then
  if have envchain && [ ! -x "$HOME/.claude/tools/add-secret.sh" ]; then
    report secrets-tool todo "envchain installed, add-secret.sh helper not copied yet"
  elif have envchain; then
    report secrets-tool ok "envchain, namespaces: $(envchain --list 2>/dev/null | tr '\n' ' ')"
  else
    report secrets-tool missing "envchain"
  fi
elif [ "$platform" = windows ]; then
  if [ -f "$HOME/.claude/tools/cc-secrets.ps1" ]; then
    vault=$(powershell.exe -NoProfile -Command "if (Get-Module -ListAvailable Microsoft.PowerShell.SecretStore) { if (Get-SecretVault -Name ClaudeSecrets -ErrorAction SilentlyContinue) { 'ok' } else { 'no-vault' } } else { 'no-module' }" 2>/dev/null | tr -d '\r')
    if [ "$vault" = ok ]; then
      report secrets-tool ok "cc-secrets.ps1 with the ClaudeSecrets vault"
    else
      report secrets-tool todo "script copied, vault state: ${vault:-unknown}; user runs: cc-secrets.ps1 init"
    fi
  else
    report secrets-tool missing "cc-secrets.ps1"
  fi
fi

# Claude Code configuration
tool claude-code claude --version

settings="$HOME/.claude/settings.json"
if [ -f "$settings" ] && grep -q '\.env' "$settings"; then
  report safety-defaults ok
else
  report safety-defaults missing "no .env protection in ~/.claude/settings.json"
fi

if [ -f "$HOME/.claude/statusline.mjs" ] && grep -q 'statusline.mjs' "$settings" 2>/dev/null; then
  report status-line ok
else
  report status-line missing "~/.claude/statusline.mjs not copied or not in settings"
fi

if grep -q 'claude-code-setup:start' "$HOME/.claude/CLAUDE.md" 2>/dev/null; then
  report personal-instructions ok
else
  report personal-instructions missing "~/.claude/CLAUDE.md has no setup block"
fi

if [ -d "$HOME/Code" ]; then
  report projects-folder ok "$HOME/Code"
else
  report projects-folder missing "$HOME/Code"
fi

# Plugins
if have claude; then
  installed=$(claude plugin list --json 2>/dev/null)
  for p in ultrapowers ultrapowers-dev ultrapowers-business; do
    if printf '%s' "$installed" | grep -q "\"$p@ultrapowers\""; then
      report "plugin-$p" ok
    else
      report "plugin-$p" missing
    fi
  done
  # Impeccable comes with ultrapowers. A second, enabled copy from its own marketplace loads every skill twice.
  if ! printf '%s' "$installed" | grep -q '"impeccable@ultrapowers"'; then
    report plugin-impeccable missing
  elif printf '%s' "$installed" | tr -d '\n ' | grep -q '"id":"impeccable@impeccable"[^}]*"enabled":true'; then
    report plugin-impeccable duplicate "impeccable@impeccable is enabled too"
  else
    report plugin-impeccable ok
  fi
fi
