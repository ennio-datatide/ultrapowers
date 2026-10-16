#!/usr/bin/env bash
# add-secret.sh: the one safe way to store a secret on macOS.
# Usage: add-secret.sh [--unattended] <service> <VAR_NAME>   e.g. add-secret.sh resend RESEND_API_KEY
#
# --unattended is only for a secret a background job uses while nobody is at
# the computer (launchd, cron). It skips the per-use password prompt, which a
# background job cannot answer. Keep those secrets in their own service name.
#
# Wraps "envchain --set" so the protective flags can never be forgotten:
#   --noecho              the value is not shown on screen or left in scroll-back
#   --require-passphrase  macOS asks for approval every time the secret is used
# It also refuses the ways a secret usually leaks: being run by Claude Code,
# being fed from a pipe or file, or having the value passed as an argument.

set -euo pipefail

if [ -n "${CLAUDECODE:-}" ]; then
  echo "Stop: this must be run by you in your own Terminal window, not by Claude Code." >&2
  echo "Otherwise the secret could end up in the conversation." >&2
  exit 1
fi

passphrase=--require-passphrase
if [ "${1:-}" = "--unattended" ]; then
  passphrase=--no-require-passphrase
  shift
fi

if [ $# -ne 2 ]; then
  echo "Usage: add-secret.sh [--unattended] <service> <VAR_NAME>" >&2
  echo "Example: add-secret.sh resend RESEND_API_KEY" >&2
  echo "Do not put the secret itself on this line. You will be asked for it next, and it stays hidden." >&2
  exit 2
fi

service=$1
var=$2

if ! [[ $service =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
  echo "The service name should be short and lowercase, like: resend, vercel, github" >&2
  exit 2
fi

# Variable names are uppercase by convention. Real tokens almost always contain
# lowercase letters or symbols, so this also catches a token pasted here by mistake.
if ! [[ $var =~ ^[A-Z][A-Z0-9_]*$ ]]; then
  echo "The second word must be the NAME of the secret in capitals, like RESEND_API_KEY." >&2
  echo "If you just pasted the secret itself: close this window when done and clear it (Cmd+K)," >&2
  echo "then treat that secret as exposed and create a new one at the service." >&2
  exit 2
fi

if [ ! -t 0 ]; then
  echo "Stop: run this directly in a Terminal window so the value can be typed hidden." >&2
  exit 1
fi

if ! command -v envchain >/dev/null 2>&1; then
  echo "envchain is not installed. Ask Claude Code to run the setup again." >&2
  exit 1
fi

echo "Paste the value for $var and press Enter. Nothing will appear as you paste. That is expected."
envchain --set "$passphrase" --noecho "$service" "$var"
echo "Stored. Claude Code can now use it with: envchain $service <command>"
