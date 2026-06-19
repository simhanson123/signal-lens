#!/usr/bin/env bash
# Auto backend runner: prints capabilities + routing hint, then runs CLI review.
# MCP path is selected by the agent (only the host knows if MCP tools are connected).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(pwd)"
EXTRA_ARGS=("$@")

resolve_signal_lens() {
  if command -v signal-lens >/dev/null 2>&1; then echo "signal-lens"; return; fi
  if [[ -f "$REPO_ROOT/dist/cli.js" ]]; then echo "node $REPO_ROOT/dist/cli.js"; return; fi
  local dir="$REPO_ROOT"
  for _ in 1 2 3 4 5; do
    if [[ -f "$dir/dist/cli.js" ]]; then echo "node $dir/dist/cli.js"; return; fi
    dir="$(dirname "$dir")"
  done
  echo ""
}

SIGNAL_LENS="$(resolve_signal_lens)"
if [[ -z "$SIGNAL_LENS" ]]; then
  echo '{"error":"signal-lens not found"}' >&2
  exit 127
fi

echo "--- signal-lens-capabilities ---"
# shellcheck disable=SC2086
(cd "$REPO_ROOT" && eval "$SIGNAL_LENS" capabilities --repo "$REPO_ROOT")
echo "--- signal-lens-routing-hint ---"
cat <<EOF
{
  "auto": true,
  "mcp_tools_to_check": ["review_pr", "scan_ci_weakening", "trace_security_boundary", "scan_test_coverage"],
  "if_mcp_tools_present": "Call MCP review_pr with base/head. Use scan_* tools for targeted checks. Read repo://summary if needed.",
  "if_mcp_tools_absent": "Continue below — CLI report follows from run-review.sh",
  "skill_dir": "$SKILL_DIR"
}
EOF

echo "--- signal-lens-cli-review ---"
exec bash "$SCRIPT_DIR/run-review.sh" "${EXTRA_ARGS[@]}"