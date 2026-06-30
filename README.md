# Signal Lens

**Context-first maintainer PR review for open-source repos**

Catches what diff-only review misses: CI weakening, security boundaries, injection risks, hardcoded secrets, duplicate utilities, missing tests, and vulnerable dependencies — with evidence, not opinions.

**Surfaces:** Agent Skill · CLI · GitHub Action · MCP (optional) — v2.2.0

**Repository:** https://github.com/simhanson123/signal-lens  
**npm:** https://www.npmjs.com/package/signal-lens

> **Signal Lens** (`signal-lens`) is context-first maintainer PR review — not an MCP-only tool. Slug: CLI, npm, Action, GitHub repo.

## Why maintainers use it

AI and agent-generated PRs look clean but hide risks in workflows, tests, and security boundaries. `signal-lens` compresses those signals so you can decide faster:

| Risk | What signal-lens checks |
|------|------------------------|
| CI weakening | `continue-on-error`, removed tests, coverage drops |
| Security boundaries | Untrusted input in workflows, hardcoded secrets |
| Injection risks | SQL injection, path traversal, command injection, unsafe deserialization |
| Secret entropy | High-entropy strings in key-like variable names (Shannon entropy) |
| Dependency vulnerabilities | New deps checked against the OSV database |
| Duplicate utilities | New helpers vs existing symbols (Tree-sitter index) |
| Test gaps | Source changes without test updates |
| Custom rules | Project-specific regex patterns via `.signal-lens.yml` |

## Features

| Area | Commands / Surfaces |
|------|---------------------|
| **Agent Skill** | `/signal-lens` — Claude Code + Grok/Codex (auto MCP or CLI) |
| **PR Review** | `signal-lens review`, GitHub Action |
| **PR Walkthrough** | `signal-lens review -o walkthrough` — risk-level summary |
| **Incremental** | `signal-lens review --incremental` — only changed files since last review |
| **Inline Comments** | `signal-lens post-inline`, `review --post-inline` |
| **Auto-Labeling** | `signal-lens label`, `review --apply-labels` — `signal-lens:*` labels on PR |
| **Ignore Comments** | `// signal-lens-ignore-next-line`, `// signal-lens-disable` in source |
| **Notifications** | `review --notify <url>` — Slack/Discord on blocker/high findings |
| **Review Trends** | `signal-lens trends` — metrics from review history |
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

## Install

```bash
npm install -g signal-lens
signal-lens --version   # 2.2.0
```

## Quick Start

```bash
# Generate a config file (optional — defaults work without one)
signal-lens init

# Review current branch (base auto-detected as main/master)
signal-lens review --static-only

# Review with AI (set OPENAI_API_KEY or use Ollama)
signal-lens review
```

From source:

```bash
git clone https://github.com/simhanson123/signal-lens.git
cd signal-lens && npm install && npm run build
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
- uses: simhanson123/signal-lens/action.yml@v2.2.0
  with:
    output-format: all
    post-comment: "true"
    post-inline-comments: "true"
    apply-labels: "true"          # Auto-label PRs with signal-lens:*
    notify-webhook: ""            # Slack/Discord webhook URL
    fail-on-blocker: "true"
    upload-sarif: "true"          # Upload to GitHub Code Scanning
```

## CLI

```bash
signal-lens review                              # Auto-detects base branch
signal-lens review --base main --head HEAD -o all -f report
signal-lens review --apply-labels --notify $WEBHOOK_URL --pr 12
signal-lens init                                # Create .signal-lens.yml
signal-lens config                              # Show resolved configuration
signal-lens index                               # Build symbol index
signal-lens trends                              # Review quality metrics
signal-lens providers                           # Check AI provider availability
```

See [CLI Reference](docs/cli-reference.md) for all commands.

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

- [Configuration](docs/configuration.md)
- [AI Providers](docs/providers.md)
- [CLI Reference](docs/cli-reference.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Agent Skills](docs/skills.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Improvement Roadmap](docs/improvement-roadmap.md)
- [Changelog](CHANGELOG.md)

## License

MIT