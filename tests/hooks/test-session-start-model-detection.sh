#!/usr/bin/env bash
# Tests that hooks/session-start conditionally injects the advisor-timing
# directive based on session model: present for sonnet/haiku, absent for opus.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/session-start"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"

PASS=0
FAIL=0

run_case() {
    local name="$1"
    local model="$2"
    local expect="$3"  # "present" or "absent"

    local payload
    payload=$(jq -nc --arg m "$model" '{
        hook_event_name: "SessionStart",
        session_id: "test",
        cwd: "/tmp",
        source: "startup",
        model: $m,
        permission_mode: "acceptEdits",
        transcript_path: "/tmp/x"
    }')

    local output context
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    context=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext // .additionalContext // .additional_context // ""' 2>/dev/null || echo "")

    local actual="absent"
    if echo "$context" | grep -q "ADVISOR TIMING"; then
        actual="present"
    fi

    if [ "$actual" = "$expect" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expect, actual=$actual)"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: sonnet/haiku models inject directive"
run_case "claude-sonnet-4-6" "claude-sonnet-4-6" "present"
run_case "claude-haiku-4-5-20251001" "claude-haiku-4-5-20251001" "present"
run_case "alias sonnet" "sonnet" "present"
run_case "alias haiku" "haiku" "present"

echo "Test: opus models skip directive"
run_case "claude-opus-4-7" "claude-opus-4-7" "absent"
run_case "alias opus" "opus" "absent"

echo "Test: missing/empty model skips directive (conservative default)"
run_case "empty model" "" "absent"

echo "Test: existing no-permission-asks block still present (regression)"
payload=$(jq -nc '{
    hook_event_name: "SessionStart",
    session_id: "test",
    cwd: "/tmp",
    source: "startup",
    model: "claude-sonnet-4-6",
    permission_mode: "acceptEdits",
    transcript_path: "/tmp/x"
}')
context=$(echo "$payload" | bash "$HOOK" 2>/dev/null | jq -r '.hookSpecificOutput.additionalContext // .additionalContext // .additional_context // ""' 2>/dev/null || echo "")
if echo "$context" | grep -q "NO PERMISSION ASKS"; then
    echo "  PASS: no-permission-asks block still present"
    PASS=$((PASS + 1))
else
    echo "  FAIL: no-permission-asks block missing — regression"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
