# review-mcp

**Context-first PR review for open-source maintainers**

Catches what diff-only review misses: CI weakening, security boundaries, duplicate utilities, and missing tests — with evidence, not opinions.

**Surfaces:** Agent Skill · CLI · GitHub Action · MCP (optional) — v1.3.2

**Repository:** https://github.com/simhanson123/review-mcp

> The name `review-mcp` is the project slug (CLI, npm, Action). The product is **maintainer PR review infrastructure**, not an MCP-only tool.

## Why maintainers use it

AI and agent-generated PRs look clean but hide risks in workflows, tests, and security boundaries. `review-mcp` compresses those signals so you can decide faster:

| Risk | What review-mcp checks |
|------|------------------------|
| CI weakening | `continue-on-error`, removed tests, coverage drops |
| Security boundaries | Untrusted input in workflows, hardcoded secrets |
| Duplicate utilities | New helpers vs existing symbols (Tree-sitter index) |
| Test gaps | Source changes without test updates |

## Features

| Area | Commands / Surfaces |
|------|---------------------|
| **Agent Skill** | `/review-mcp` — Claude Code + Grok/Codex (auto MCP or CLI) |
| **PR Review** | `review-mcp review`, GitHub Action |
| **Inline Comments** | `review-mcp post-inline`, `review --post-inline` |
| **Tree-sitter Index** | `review-mcp index` → SQLite symbol + import graph |
| **Issue Triage** | `review-mcp triage` |
| **Release Notes** | `review-mcp release` |
| **Auto-fix Draft** | `review-mcp fix`, `/review-mcp fix` |
| **Slash Commands** | `/review-mcp explain`, `false-positive`, `fix`, `release-notes` |
| **MCP Server** *(optional)* | `review-mcp mcp` — 5 resources, 7 tools, 4 prompts |
| **GitHub App** *(experimental)* | `review-mcp serve` + `github-app/manifest.yml` |
| **AI Providers** | OpenAI, Anthropic, **Ollama (local)**, mock |
| **Output** | Markdown, JSON, SARIF (Code Scanning) |

### No API key required

Static analyzers run without any API key. For AI review without cloud APIs, use **Ollama**.

## Quick Start

```bash
# From source (npm package not yet published)
git clone https://github.com/simhanson123/review-mcp.git
cd review-mcp && npm install && npm run build

# Index repository symbols
node dist/cli.js index

# Review branch (static — no API key)
node dist/cli.js review --base main --head HEAD --static-only
```

## Agent Skill (recommended entry point)

```
/review-mcp
/review-mcp --branch my-feature
```

Copy into your OSS repo:

```bash
cp -r skills/review-mcp .claude/skills/review-mcp   # Claude Code
cp -r skills/review-mcp .grok/skills/review-mcp     # Grok / Codex
```

Auto-routes: MCP tools when connected, else CLI. See [docs/skills.md](docs/skills.md).

```bash
review-mcp capabilities
```

## GitHub Action

```yaml
- uses: simhanson123/review-mcp/action.yml@v1.3.2
  with:
    output-format: all
    post-comment: "true"
    post-inline-comments: "true"
    fail-on-blocker: "true"
```

## CLI

```bash
review-mcp review --base main --head HEAD --static-only
review-mcp review --base main --head HEAD --output all -f report
review-mcp index
review-mcp capabilities
```

## Ollama (Local AI Review)

```bash
ollama pull qwen2.5-coder:7b
REVIEW_MCP_PROVIDER=ollama review-mcp review --base main --head HEAD
```

## MCP (optional integration)

For Cursor, Claude Desktop, or other MCP hosts:

```json
{
  "mcpServers": {
    "review-mcp": {
      "command": "review-mcp",
      "args": ["mcp"],
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