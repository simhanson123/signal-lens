# CLI Reference

## `signal-lens review`

Review changes between two git refs.

```bash
signal-lens review                              # Auto-detect base (main/master), head=HEAD
signal-lens review --base main --head HEAD      # Explicit refs
signal-lens review --static-only                # Skip AI, static analyzers only
signal-lens review -o walkthrough               # High-level PR summary comment
signal-lens review --incremental                # Only files changed since last review
signal-lens review -o json -f report            # Output JSON to report.json
signal-lens review --post-inline --owner OWNER --github-repo REPO --pr 12
```

| Flag | Default | Description |
|------|---------|-------------|
| `--base <ref>` | Auto-detected (`main`/`master`) | Base git ref |
| `--head <ref>` | `HEAD` | Head git ref |
| `--repo <path>` | `process.cwd()` | Repository root |
| `-o, --output <format>` | `markdown` | `markdown`/`json`/`sarif`/`both`/`all`/`walkthrough` |
| `-f, --output-file <path>` | — | Write output to file |
| `--static-only` | — | Skip AI review |
| `--incremental` | — | Only review files changed since last review |
| `--pr <number>` | — | GitHub PR number (with `--owner`/`--github-repo`) |
| `--owner <owner>` | — | GitHub owner |
| `--github-repo <repo>` | — | GitHub repo name |
| `--post-inline` | — | Post inline PR comments |
| `--max-inline <n>` | 20 | Max inline comments |

Exit code: `1` if blocker findings, `0` otherwise.

## `signal-lens index`

Build a Tree-sitter symbol index (SQLite) for duplicate-utility detection.

```bash
signal-lens index
signal-lens index -o index.json
```

## `signal-lens init`

Create `.signal-lens.yml` with defaults.

```bash
signal-lens init
signal-lens init --force       # Overwrite existing
```

## `signal-lens config`

Print the resolved configuration for this repository.

```bash
signal-lens config
```

## `signal-lens providers`

List AI provider availability.

```bash
signal-lens providers
```

## `signal-lens capabilities`

Report CLI/MCP availability and routing hints for AI agents.

```bash
signal-lens capabilities
```

## `signal-lens feedback`

Record maintainer feedback on a finding.

```bash
signal-lens feedback --finding-id <id> --type false-positive --reason "Not applicable"
signal-lens feedback --finding-id <id> --type accepted
signal-lens feedback --finding-id <id> --type ignored-rule
```

## `signal-lens release`

Draft release notes from merged PRs.

```bash
signal-lens release --version v1.2.0
signal-lens release -o CHANGELOG.md
```

## `signal-lens triage`

Triage open GitHub issues.

```bash
signal-lens triage --owner OWNER --github-repo REPO
signal-lens triage --title "Bug: crash on startup" --body "Stack trace..."
```

## `signal-lens fix`

Generate an auto-fix draft for a finding (requires approval).

```bash
signal-lens fix --finding-id <id>
```

## `signal-lens slash`

Execute a slash command from PR comment text.

```bash
signal-lens slash --body "/signal-lens explain" --repo .
signal-lens slash --body "/signal-lens false-positive <id>" --repo .
```

## `signal-lens post-inline`

Post inline review comments on a GitHub PR from a saved report.

```bash
signal-lens post-inline \
  --owner OWNER \
  --github-repo REPO \
  --pr 12 \
  --commit <sha> \
  -f report.json
```

## `signal-lens mcp`

Start the MCP server (stdio) for integration with MCP hosts.

```bash
signal-lens mcp
```

## `signal-lens serve`

Start the GitHub App webhook server (experimental).

```bash
signal-lens serve --port 3000
```
