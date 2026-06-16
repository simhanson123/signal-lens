# review-mcp

**MCP-based AI PR review and maintainer automation agent**

`review-mcp` is an open-source maintainer automation agent that uses repository-level context for AI-powered pull request review. Unlike diff-only review bots, it detects problems that are easy to miss when only reading changed lines: CI weakening, duplicated utilities, security boundary regressions, and more — with evidence-based findings.

## Problem

AI coding agents generate more pull requests than ever. They look clean: consistent style, passing tests, plausible descriptions. But maintainers face new risks:

| Risk | What review-mcp checks |
|------|------------------------|
| CI weakening | Workflow, coverage, and lint gate changes |
| Duplicate utilities | New helpers that mirror existing symbols |
| Security boundaries | Untrusted input, secrets, token scope |
| Review fatigue | Severity-ranked, evidence-backed findings |

## Quick Start

### CLI

```bash
npm install -g review-mcp

# Review local branch against main
review-mcp review --base main --head HEAD

# JSON output for automation
review-mcp review --base main --head HEAD --output json

# Write both markdown and JSON
review-mcp review --base main --head HEAD --output both --output-file report
```

### GitHub Action

Add `.github/workflows/review-mcp.yml` to your repository:

```yaml
name: review-mcp PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: review-mcp/review-mcp/action.yml@v0.1.0
        with:
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
          output-format: both
          post-comment: "true"
```

See [`.github/workflows/review-mcp.yml`](.github/workflows/review-mcp.yml) for the full example.

## v0.1 Features

- **GitHub Action** — runs on `pull_request` events
- **CLI** — `review-mcp review --base main --head HEAD`
- **Diff summary** — change purpose, scope, risk file list
- **CI weakening detection** — workflow and quality gate changes
- **Duplicate utility detection** — new symbols vs existing codebase
- **Security boundary checks** — secrets, untrusted input, permissions
- **Markdown + JSON output** — human-readable reports and machine artifacts

## Output Format

Every finding includes:

| Field | Description |
|-------|-------------|
| Severity | `blocker`, `high`, `medium`, `low` |
| Evidence | File, line, symbol, snippet |
| Reason | Why this matters |
| Suggested action | What the maintainer should do |
| Confidence | Model/analyzer confidence score |

## Roadmap

| Version | Focus |
|---------|-------|
| **v0.1** (current) | GitHub Action, CLI, static analyzers |
| **v0.2** | MCP Context Server, feedback memory, SARIF |
| **v0.3** | Release assistant, issue triage, GitHub App |

## Development

```bash
git clone https://github.com/review-mcp/review-mcp.git
cd review-mcp
npm install
npm test
npm run build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [OpenAI Codex for OSS Plan](docs/openai-codex-for-oss-plan.md)

## License

MIT — see [LICENSE](LICENSE).