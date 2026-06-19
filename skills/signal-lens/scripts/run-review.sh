#!/usr/bin/env bash
# signal-lens skill runner — Claude Code + Grok/Codex compatible
# Usage: run-review.sh [--base REF] [--head REF] [--repo PATH] [--static-only] [--with-ai] [--skip-index] [--output-dir DIR]

set -euo pipefail

BASE_REF=""
HEAD_REF="HEAD"
REPO_ROOT="$(pwd)"
STATIC_ONLY=0
SKIP_INDEX=0
OUTPUT_DIR=""

usage() {
  cat <<'EOF'
Usage: run-review.sh [options]

Options:
  --base REF       Base git ref (default: auto-detect main/master)
  --head REF       Head git ref (default: HEAD)
  --repo PATH      Repository root (default: cwd)
  --static-only    Skip AI review (default)
  --with-ai        Enable AI review (requires API key or Ollama)
  --skip-index     Skip symbol index step
  --output-dir DIR Write report files to DIR (default: temp dir)
  -h, --help       Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE_REF="$2"; shift 2 ;;
    --head) HEAD_REF="$2"; shift 2 ;;
    --repo) REPO_ROOT="$2"; shift 2 ;;
    --static-only) STATIC_ONLY=1; shift ;;
    --with-ai) STATIC_ONLY=0; shift ;;
    --skip-index) SKIP_INDEX=1; shift ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$BASE_REF" ]]; then
  if git -C "$REPO_ROOT" rev-parse --verify main >/dev/null 2>&1; then
    BASE_REF="main"
  elif git -C "$REPO_ROOT" rev-parse --verify master >/dev/null 2>&1; then
    BASE_REF="master"
  else
    BASE_REF="$(git -C "$REPO_ROOT" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")"
  fi
fi

resolve_signal_lens() {
  if command -v signal-lens >/dev/null 2>&1; then
    echo "signal-lens"
    return
  fi
  if [[ -f "$REPO_ROOT/node_modules/.bin/signal-lens" ]]; then
    echo "$REPO_ROOT/node_modules/.bin/signal-lens"
    return
  fi
  if [[ -f "$REPO_ROOT/dist/cli.js" ]]; then
    echo "node $REPO_ROOT/dist/cli.js"
    return
  fi
  # Skill may live inside signal-lens repo; walk up for dist/cli.js
  local dir="$REPO_ROOT"
  for _ in 1 2 3 4 5; do
    if [[ -f "$dir/dist/cli.js" ]]; then
      echo "node $dir/dist/cli.js"
      return
    fi
    dir="$(dirname "$dir")"
  done
  if command -v npx >/dev/null 2>&1; then
    echo "npx -y signal-lens"
    return
  fi
  echo ""
}

SIGNAL_LENS="$(resolve_signal_lens)"
if [[ -z "$SIGNAL_LENS" ]]; then
  echo '{"error":"signal-lens not found. Install: npm install -g signal-lens or npm run build in repo"}' >&2
  exit 127
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t signal-lens)"
fi
mkdir -p "$OUTPUT_DIR"
REPORT_BASE="$OUTPUT_DIR/signal-lens-report"

run_signal_lens() {
  # shellcheck disable=SC2086
  (cd "$REPO_ROOT" && eval "$SIGNAL_LENS" "$@")
}

if [[ "$SKIP_INDEX" -eq 0 ]]; then
  run_signal_lens index --repo "$REPO_ROOT" >/dev/null 2>&1 || true
fi

REVIEW_CMD=(review --base "$BASE_REF" --head "$HEAD_REF" --repo "$REPO_ROOT" --output all --output-file "$REPORT_BASE")
if [[ "$STATIC_ONLY" -eq 1 ]]; then
  REVIEW_CMD+=(--static-only)
fi

set +e
run_signal_lens "${REVIEW_CMD[@]}"
REVIEW_EXIT=$?
set -e

echo "--- signal-lens-run-meta ---"
echo "base=$BASE_REF"
echo "head=$HEAD_REF"
echo "repo=$REPO_ROOT"
echo "report_json=$REPORT_BASE.json"
echo "report_md=$REPORT_BASE.md"
echo "report_sarif=$REPORT_BASE.sarif"
echo "exit_code=$REVIEW_EXIT"
echo "--- signal-lens-report-json ---"
if [[ -f "$REPORT_BASE.json" ]]; then
  cat "$REPORT_BASE.json"
else
  echo '{"findings":[],"error":"no report generated"}'
fi
echo "--- signal-lens-report-markdown ---"
if [[ -f "$REPORT_BASE.md" ]]; then
  cat "$REPORT_BASE.md"
fi

exit "$REVIEW_EXIT"