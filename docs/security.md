# Security

`signal-lens` processes PR diffs, workflow files, and repository metadata. This document describes the security model for v2.2.0.

## Principles

1. **Read-only by default** — review jobs use `contents: read` permission
2. **Separate write job** — PR comment posting requires explicit `pull-requests: write`
3. **No secrets on fork PRs** — example workflow skips fork PRs
4. **No shell execution of model output** — analyzers use pattern matching, not `eval`
5. **Untrusted input treatment** — PR body, issue body, commit messages are untrusted
6. **Human-in-the-loop** — no auto-merge, auto-push, or auto-release
7. **Inline comments are opt-in** — `post-inline-comments` requires explicit Action input

## GitHub Token Permissions

### Review job (read-only)

```yaml
permissions:
  contents: read
```

### Comment posting (write)

```yaml
permissions:
  contents: read
  pull-requests: write
```

Use `post-comment: true` or `post-inline-comments: true` only when comment posting is intended. Keep review analysis in a separate step from write operations where possible.

### Inline comments

Inline comments are posted for findings with `evidence.file` and `evidence.line`. All static analyzers populate the line number for added-line findings. The Action posts via `pull-requests: write` in the same job as analysis when enabled. Maximum 20 comments per run (configurable via CLI `--max-inline`).

## Fork PR Handling

Fork pull requests must not receive secrets or elevated tokens. The example workflow uses:

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

## Detected Security Patterns

The security-boundary analyzer flags:

- Untrusted GitHub event content in workflow expressions
- Hardcoded secrets and API keys
- Dynamic code execution (`eval`, `execSync`)
- `pull_request_target` usage
- `permissions: write-all`
- Authentication bypass patterns

## MCP Tool Boundaries

Write-capable MCP tools (`record_feedback`) store maintainer feedback locally. PR comment tools require explicit CLI flags or Action inputs. Tool schemas annotate trust boundaries per MCP specification.

## Reporting Vulnerabilities

Please report security issues privately via GitHub Security Advisories once the repository is published. Do not open public issues for undisclosed vulnerabilities.