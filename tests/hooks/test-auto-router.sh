#!/usr/bin/env bash
# Tests the shape gate and slash-prefix early-exit. Does NOT test the live
# classifier (that requires ANTHROPIC_API_KEY and network — covered separately).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/auto-router"
export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"
# Force shape-gate-only mode to skip the LLM call in tests.
export ULTRAPOWERS_AUTOROUTER_TEST_MODE=1

PASS=0
FAIL=0

mock_payload() {
    local prompt="$1"
    jq -nc --arg p "$prompt" '{
        hook_event_name: "UserPromptSubmit",
        session_id: "test",
        transcript_path: "/dev/null",
        cwd: "/tmp",
        permission_mode: "acceptEdits",
        prompt: $p
    }'
}

assert_shape() {
    local name="$1" prompt="$2" expected="$3"  # "task" or "chat"
    local payload output classification
    payload=$(mock_payload "$prompt")
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    classification=$(echo "$output" | jq -r '.testMode.shape // "unknown"' 2>/dev/null || echo "unknown")
    if [ "$classification" = "$expected" ]; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected=$expected, actual=$classification)"
        echo "    output: $output"
        FAIL=$((FAIL + 1))
    fi
}

assert_passthrough() {
    local name="$1" prompt="$2"
    local payload output
    payload=$(mock_payload "$prompt")
    output=$(echo "$payload" | bash "$HOOK" 2>/dev/null || true)
    # Passthrough = empty output OR no additionalContext field
    if [ -z "$output" ] || ! echo "$output" | jq -e '.hookSpecificOutput.additionalContext' > /dev/null 2>&1; then
        echo "  PASS: $name"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (expected passthrough, got: $output)"
        FAIL=$((FAIL + 1))
    fi
}

echo "Test: task-shaped prompts"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    assert_shape "task: ${line:0:40}" "$line" "task"
done < "$REPO_ROOT/tests/hooks/fixtures/task-shaped.txt"

echo "Test: chat-shaped prompts"
while IFS= read -r line; do
    [ -z "$line" ] && continue
    assert_shape "chat: ${line:0:40}" "$line" "chat"
done < "$REPO_ROOT/tests/hooks/fixtures/chat-shaped.txt"

echo "Test: slash command early-exit"
assert_passthrough "slash command" "/ultrapowers:brainstorming foo"

echo "Test: recursion guard (CLAUDECODE-style)"
ULTRAPOWERS_AUTOROUTER_ACTIVE=1 assert_passthrough "recursion sentinel" "build a thing"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
