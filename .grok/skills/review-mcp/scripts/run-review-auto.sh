#!/usr/bin/env bash
# Auto backend runner: prints capabilities + routing hint, then runs CLI review.
# MCP path is selected by the agent (only the host knows if MCP tools are connected).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(pwd)"
EXTRA_ARGS=("$@")

resolve_review_mcp() {
  if command -v review-mcp >/dev/null 2>&1; then echo "review-mcp"; return; fi
  if [[ -f "$REPO_ROOT/dist/cli.js" ]]; then echo "node $REPO_ROOT/dist/cli.js"; return; fi
  local dir="$REPO_ROOT"
  for _ in 1 2 3 4 5; do
    if [[ -f "$dir/dist/cli.js" ]]; then echo "node $dir/dist/cli.js"; return; fi
    dir="$(dirname "$dir")"
  done
  echo ""
}

REVIEW_MCP="$(resolve_review_mcp)"
if [[ -z "$REVIEW_MCP" ]]; then
  echo '{"error":"review-mcp not found"}' >&2
  exit 127
fi

echo "--- review-mcp-capabilities ---"
# shellcheck disable=SC2086
(cd "$REPO_ROOT" && eval "$REVIEW_MCP" capabilities --repo "$REPO_ROOT")
echo "--- review-mcp-routing-hint ---"
cat <<EOF
{
  "auto": true,
  "mcp_tools_to_check": ["review_pr", "scan_ci_weakening", "trace_security_boundary", "scan_test_coverage"],
  "if_mcp_tools_present": "Call MCP review_pr with base/head. Use scan_* tools for targeted checks. Read repo://summary if needed.",
  "if_mcp_tools_absent": "Continue below — CLI report follows from run-review.sh",
  "skill_dir": "$SKILL_DIR"
}
EOF

echo "--- review-mcp-cli-review ---"
exec bash "$SCRIPT_DIR/run-review.sh" "${EXTRA_ARGS[@]}"