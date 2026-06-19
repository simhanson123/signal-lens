# review-mcp

**MCP-based AI PR review and maintainer automation agent** — v1.3.0

Context-first PR review for open-source maintainers handling AI-generated pull requests.

**Repository:** https://github.com/simhanson123/review-mcp

## Features

| Area | Commands / Surfaces |
|------|---------------------|
| PR Review | `review-mcp review`, GitHub Action, MCP `review_pr` |
| Inline Comments | `review-mcp post-inline`, `review --post-inline` |
| Tree-sitter Index | `review-mcp index` → SQLite symbol + import graph |
| MCP Server | `review-mcp mcp` — 5 resources, 7 tools, 4 prompts |
| Issue Triage | `review-mcp triage` |
| Release Notes | `review-mcp release`, MCP `draft_release_notes` |
| Auto-fix Draft | `review-mcp fix`, `/review-mcp fix` |
| Slash Commands | `/review-mcp explain`, `false-positive`, `fix`, `release-notes` |
| Agent Skills | `/review-mcp` — Claude Code + Grok/Codex (`skills/review-mcp/`) |
| GitHub App | `review-mcp serve` + `github-app/manifest.yml` (experimental) |
| AI Providers | OpenAI, Anthropic, **Ollama (local)**, mock |
| Output | Markdown, JSON, SARIF (Code Scanning) |

### No API key required

Static analyzers run without any API key. For AI review without cloud APIs, use **Ollama** — a free tool that runs LLMs on your own machine.

## Quick Start

```bash
npm install -g review-mcp

# Index repository symbols (tree-sitter)
review-mcp index

# Review branch
review-mcp review --base main --head HEAD

# All output formats
review-mcp review --base main --head HEAD --output all -f report

# Static only (no AI)
review-mcp review --base main --head HEAD --static-only
```

## Ollama (Local AI Review)

[Ollama](https://ollama.com) runs open-source LLMs locally — no API key, no data sent to the cloud.

```bash
# 1. Install Ollama from https://ollama.com
# 2. Pull a code-focused model
ollama pull qwen2.5-coder:7b

# 3. Run review with Ollama
REVIEW_MCP_PROVIDER=ollama review-mcp review --base main --head HEAD
```

Or configure in `.review-mcp.yml`:

```yaml
ai:
  provider: ollama
  model: qwen2.5-coder:7b
  ollama:
    baseUrl: http://localhost:11434
```

Provider auto-detection order: OpenAI → Anthropic → Ollama → mock.

## Inline PR Comments

Post findings directly on the changed lines in a GitHub PR (requires `file` + `line` evidence):

```bash
# After generating a JSON report
review-mcp post-inline \
  --owner myorg \
  --github-repo myrepo \
  --pr 42 \
  --commit abc123def456 \
  --report-file report.json

# Or inline during review
review-mcp review --base main --head HEAD \
  --pr 42 --owner myorg --github-repo myrepo \
  --post-inline --output json -f report
```

## GitHub Action

```yaml
- uses: simhanson123/review-mcp/action.yml@v1.3.0
  with:
    output-format: all
    post-comment: "true"
    post-inline-comments: "true"
    fail-on-blocker: "true"
```

## Agent Skill (Claude Code + Grok/Codex)

Copy `skills/review-mcp/` into your project:

```bash
# Claude Code
cp -r skills/review-mcp .claude/skills/review-mcp

# Grok / Codex
cp -r skills/review-mcp .grok/skills/review-mcp
```

Then invoke:

```
/review-mcp
/review-mcp --branch my-feature
/review-mcp --with-ai
```

The skill runs `scripts/run-review.sh` (static analyzers first), then summarizes blockers with evidence. See [docs/skills.md](docs/skills.md).

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

- [Agent Skills](docs/skills.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [OpenAI Codex for OSS Plan](docs/openai-codex-for-oss-plan.md)
- [Changelog](CHANGELOG.md)

## License

MIT