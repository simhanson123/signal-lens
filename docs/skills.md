# Agent Skills (Claude Code + Grok/Codex)

`review-mcp` is a **maintainer PR review platform**. The recommended entry point is the **Agent Skill** (`/review-mcp`), which auto-routes to MCP or CLI.

## Locations in this repo

| Path | Host |
|------|------|
| `skills/review-mcp/` | Canonical source |
| `.claude/skills/review-mcp/` | Claude Code (project) |
| `.grok/skills/review-mcp/` | Grok / Codex (project) |

## Use in your OSS repository

Copy the skill into the repo you are maintaining:

```bash
# Claude Code
mkdir -p .claude/skills/review-mcp
cp -r path/to/review-mcp/skills/review-mcp/* .claude/skills/review-mcp/

# Grok / Codex
mkdir -p .grok/skills/review-mcp
cp -r path/to/review-mcp/skills/review-mcp/* .grok/skills/review-mcp/
```

Ensure `review-mcp` is on PATH (`npm install -g review-mcp`) or build from source (`npm run build` → uses `dist/cli.js`).

## Auto-routing (MCP vs CLI)

The skill **auto-selects** the backend:

| Agent has MCP tool `review_pr`? | Backend |
|--------------------------------|---------|
| Yes | MCP tools (`review_pr`, `scan_*`, resources) |
| No | CLI via `run-review-auto.sh` or `run-review.sh` |

Check with:

```bash
review-mcp capabilities
```

## Invoke

```
/review-mcp                  # auto: MCP if connected, else CLI
/review-mcp --branch my-feature
/review-mcp --with-ai
```

## Scripts

`skills/review-mcp/scripts/run-review-auto.sh` — capabilities + routing hint + CLI review

`skills/review-mcp/scripts/run-review.sh`:

- Auto-detects `main` / `master` as base
- Runs `review-mcp index` (best-effort)
- Runs `review-mcp review --output all --static-only` by default
- Prints JSON + markdown for the agent to summarize

```bash
bash skills/review-mcp/scripts/run-review.sh --base main --head HEAD --static-only
```

## Layers

| Layer | Role |
|-------|------|
| **Skill** | Primary entry — when to review, how to summarize |
| **CLI / Action** | Evidence-based findings, CI integration |
| **MCP** *(optional)* | Tool/resource access for MCP-connected hosts |

> Product name slug: `review-mcp`. Product identity: maintainer PR review, not MCP-only tooling.

See [Agent Skills standard](https://agentskills.io) and [Claude Code skills](https://code.claude.com/docs/en/skills).