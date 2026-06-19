# Signal Lens

**Context-first maintainer PR review for open-source repos**

Catches what diff-only review misses: CI weakening, security boundaries, duplicate utilities, and missing tests — with evidence, not opinions.

**Surfaces:** Agent Skill · CLI · GitHub Action · MCP (optional) — v2.0.0

**Repository:** https://github.com/simhanson123/signal-lens

> **Signal Lens** (`signal-lens`) is context-first maintainer PR review — not an MCP-only tool. Slug: CLI, npm, Action, GitHub repo.

## Why maintainers use it

AI and agent-generated PRs look clean but hide risks in workflows, tests, and security boundaries. `signal-lens` compresses those signals so you can decide faster:

| Risk | What signal-lens checks |
|------|------------------------|
| CI weakening | `continue-on-error`, removed tests, coverage drops |
| Security boundaries | Untrusted input in workflows, hardcoded secrets |
| Duplicate utilities | New helpers vs existing symbols (Tree-sitter index) |
| Test gaps | Source changes without test updates |

## Features

| Area | Commands / Surfaces |
|------|---------------------|
| **Agent Skill** | `/signal-lens` — Claude Code + Grok/Codex (auto MCP or CLI) |
| **PR Review** | `signal-lens review`, GitHub Action |
| **Inline Comments** | `signal-lens post-inline`, `review --post-inline` |
| **Tree-sitter Index** | `signal-lens index` → SQLite symbol + import graph |
| **Issue Triage** | `signal-lens triage` |
| **Release Notes** | `signal-lens release` |
| **Auto-fix Draft** | `signal-lens fix`, `/signal-lens fix` |
| **Slash Commands** | `/signal-lens explain`, `false-positive`, `fix`, `release-notes` |
| **MCP Server** *(optional)* | `signal-lens mcp` — 5 resources, 7 tools, 4 prompts |
| **GitHub App** *(experimental)* | `signal-lens serve` + `github-app/manifest.yml` |
| **AI Providers** | OpenAI, Anthropic, **Ollama (local)**, mock |
| **Output** | Markdown, JSON, SARIF (Code Scanning) |

### No API key required

Static analyzers run without any API key. For AI review without cloud APIs, use **Ollama**.

## Quick Start

```bash
# From source (npm package not yet published)
git clone https://github.com/simhanson123/signal-lens.git
cd signal-lens && npm install && npm run build

# Index repository symbols
node dist/cli.js index

# Review branch (static — no API key)
node dist/cli.js review --base main --head HEAD --static-only
```

## Agent Skill (recommended entry point)

```
/signal-lens
/signal-lens --branch my-feature
```

Copy into your OSS repo:

```bash
cp -r skills/signal-lens .claude/skills/signal-lens   # Claude Code
cp -r skills/signal-lens .grok/skills/signal-lens     # Grok / Codex
```

Auto-routes: MCP tools when connected, else CLI. See [docs/skills.md](docs/skills.md).

```bash
signal-lens capabilities
```

## GitHub Action

```yaml
- uses: simhanson123/signal-lens/action.yml@v2.0.0
  with:
    output-format: all
    post-comment: "true"
    post-inline-comments: "true"
    fail-on-blocker: "true"
```

## CLI

```bash
signal-lens review --base main --head HEAD --static-only
signal-lens review --base main --head HEAD --output all -f report
signal-lens index
signal-lens capabilities
```

## Ollama (Local AI Review)

```bash
ollama pull qwen2.5-coder:7b
SIGNAL_LENS_PROVIDER=ollama signal-lens review --base main --head HEAD
```

## MCP (optional integration)

For Cursor, Claude Desktop, or other MCP hosts:

```json
{
  "mcpServers": {
    "signal-lens": {
      "command": "signal-lens",
      "args": ["mcp"],
      "cwd": "/path/to/your/repo"
    }
  }
}
```

## Configuration

Copy [`.signal-lens.yml`](.signal-lens.yml) to your repo root.

## Development

```bash
git clone https://github.com/simhanson123/signal-lens.git
cd signal-lens
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