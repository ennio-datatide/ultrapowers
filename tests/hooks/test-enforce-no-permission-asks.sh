#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/enforce-no-permission-asks"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"

PASS=0
FAIL=0

run_case() {
    local name="$1"
    local payload="$2"
    local expected_decision="$3"  # "block" or "allow"

    local output
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)

    local actual="allow"
    if echo "$output" | jq -e '.decision == "block"' > /dev/null 2>&1; then
        actual="block"
    fi

    if [ "$actual" = "$expected_decision" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expected_decision, actual=$actual)"
        echo "    output: $output"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: banned phrases trigger block"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    payload=$(jq -nc --arg msg "$line" '{
        hook_event_name: "Stop",
        session_id: "test",
        transcript_path: "/tmp/x",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        last_assistant_message: $msg,
        stop_hook_active: false
    }')
    run_case "banned: ${line:0:50}" "$payload" "block"
done < "$REPO_ROOT/tests/hooks/fixtures/banned-phrases.txt"

echo "Test: allowed phrases pass through"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    payload=$(jq -nc --arg msg "$line" '{
        hook_event_name: "Stop",
        session_id: "test",
        transcript_path: "/tmp/x",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        last_assistant_message: $msg,
        stop_hook_active: false
    }')
    run_case "allowed: ${line:0:50}" "$payload" "allow"
done < "$REPO_ROOT/tests/hooks/fixtures/allowed-phrases.txt"

echo "Test: stop_hook_active=true short-circuits"
payload=$(jq -nc '{
    hook_event_name: "Stop",
    session_id: "test",
    transcript_path: "/tmp/x",
    cwd: "/tmp",
    permission_mode: "acceptEdits",
    last_assistant_message: "Want me to continue?",
    stop_hook_active: true
}')
run_case "stop_hook_active=true allows even on banned phrase" "$payload" "allow"

echo "Test: <skill-checkpoint> marker exempts"
payload=$(jq -nc '{
    hook_event_name: "Stop",
    session_id: "test",
    transcript_path: "/tmp/x",
    cwd: "/tmp",
    permission_mode: "acceptEdits",
    last_assistant_message: "<skill-checkpoint>brainstorming-section-1</skill-checkpoint> Approve section 1?",
    stop_hook_active: false
}')
run_case "skill-checkpoint marker allows banned-looking phrase" "$payload" "allow"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
