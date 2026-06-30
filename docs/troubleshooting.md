# Troubleshooting

## AI review shows "completed" but no findings

**Cause:** The provider returned an HTTP error (invalid key, rate limit) that was silently dropped. As of v2.1+, errors are surfaced in metadata.

**Check:** Look at `metadata.aiReview` and `metadata.aiSkipReason` in the JSON output.

```bash
signal-lens review --base main --head HEAD -o json | node -e "
  const r = JSON.parse(require('fs').readFileSync(0,'utf8'));
  console.log(r.metadata.aiReview, r.metadata.aiSkipReason);
"
```

- `"error"` — provider returned an error. The `aiSkipReason` includes the HTTP status.
- `"skipped"` — no provider available or Ollama not reachable.
- `"completed"` — AI ran successfully (empty findings means the model found nothing).

## "No AI provider available"

Set one of:

```bash
export OPENAI_API_KEY=sk-...        # OpenAI
export ANTHROPIC_API_KEY=sk-ant-... # Anthropic
ollama pull qwen2.5-coder:7b        # Ollama (local)
```

Or run static-only:

```bash
signal-lens review --static-only
```

## Ollama selected but no AI findings

Ollama is considered "available" in auto mode even if not installed. At review time, it pings `localhost:11434`. If unreachable, AI is skipped.

**Fix:**

```bash
ollama serve                       # Start Ollama
ollama pull qwen2.5-coder:7b       # Download model
signal-lens providers              # Verify availability
```

## Anthropic ignores my model setting

The `ai.model` config value is now honored. If it still seems wrong, check `ANTHROPIC_MODEL` env var which overrides the config.

## `review` exits with code 1

Exit code 1 means blocker-level findings were detected. This is intentional for CI gates. To allow blockers without failing:

- GitHub Action: set `fail-on-blocker: "false"`
- CLI: check the exit code and handle accordingly

## Not a git repository / git diff fails

Ensure you're running from the repo root, or pass `--repo <path>`:

```bash
signal-lens review --repo /path/to/repo
```

## Inline comments fail on some lines

GitHub only allows inline comments on lines within the PR diff. Findings with evidence outside the diff range are skipped. The result includes an `errors` array with details.

## Config changes have no effect

1. Check you're editing `.signal-lens.yml` at the repo root (not `src/`).
2. Run `signal-lens config` to see the resolved configuration.
3. Watch for console warnings about unknown keys.
4. YAML is indentation-sensitive — verify with a linter.

## Windows: SQLite EBUSY errors

Tests run with `fileParallelism: false` to avoid this. If you see it in production, ensure no other process holds a lock on `.signal-lens/signal-lens.sqlite`.

## `npm install -g signal-lens` fails in GitHub Action

The Action falls back to installing from source. For reliability, use the Action's `@v2.2.0` tag rather than global npm install.

## Dependency vulnerability analyzer shows no results

The `dependency-vuln` analyzer only checks **newly added** dependencies in `package.json`, `requirements.txt`, `go.mod`, or `Cargo.toml`. Existing dependencies are not re-checked. It requires network access to query the OSV database (`api.osv.dev`); if the network is unavailable, it silently skips.

Set `"dependency-vuln": false` in `.signal-lens.yml` to disable it entirely.

## Ignore comments not working

Ensure the comment is on an **added** line in the diff (not a pre-existing line), and uses the exact syntax:

- `// signal-lens-ignore-next-line` — suppresses the next line
- `// signal-lens-disable` — suppresses all findings in the file
- `// signal-lens-enable` — re-enables after a disable

File-level suppression applies even to findings without a line number. Line-level suppression only works for findings that include `evidence[0].line`.
