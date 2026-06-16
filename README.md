# review-mcp

**MCP-based AI PR review and maintainer automation agent** — v1.0.0

Context-first PR review for open-source maintainers handling AI-generated pull requests.

**Repository:** https://github.com/simhanson123/review-mcp

## Features

| Area | Commands / Surfaces |
|------|---------------------|
| PR Review | `review-mcp review`, GitHub Action, MCP `review_pr` |
| Tree-sitter Index | `review-mcp index` → SQLite symbol + import graph |
| MCP Server | `review-mcp mcp` — 5 resources, 6 tools, 4 prompts |
| Issue Triage | `review-mcp triage` |
| Release Notes | `review-mcp release`, MCP `draft_release_notes` |
| Auto-fix Draft | `review-mcp fix`, `/review-mcp fix` |
| Slash Commands | `/review-mcp explain`, `false-positive`, `fix`, `release-notes` |
| GitHub App | `review-mcp serve` + `github-app/manifest.yml` |
| AI Providers | OpenAI, Anthropic, mock (`REVIEW_MCP_PROVIDER`) |
| Output | Markdown, JSON, SARIF (Code Scanning) |

### No API key required

Static analyzers run without any API key. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to enable AI review.

## Quick Start

```bash
npm install -g review-mcp

# Index repository symbols (tree-sitter)
review-mcp index

# Review branch
review-mcp review --base main --head HEAD

# All output formats
review-mcp review --base main --head HEAD --output all -f report

# Static only
review-mcp review --base main --head HEAD --static-only
```

## GitHub Action

```yaml
- uses: simhanson123/review-mcp/action.yml@v1.0.0
  with:
    output-format: all
    post-comment: "true"
    fail-on-blocker: "true"
```

## MCP Client Config

```json
{
  "mcpServers": {
    "review-mcp": {
      "command": "npx",
      "args": ["-y", "review-mcp", "mcp"],
      "cwd": "/path/to/your/repo"
    }
  }
}
```

## Configuration

Copy [`.review-mcp.yml`](.review-mcp.yml) to your repo root.

## Development

```bash
git clone https://github.com/simhanson123/review-mcp.git
cd review-mcp
npm install
npm test
npm run build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [OpenAI Codex for OSS Plan](docs/openai-codex-for-oss-plan.md)
- [Changelog](CHANGELOG.md)

## License

MIT