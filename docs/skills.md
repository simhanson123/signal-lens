# Agent Skills (Claude Code + Grok/Codex)

`signal-lens` is a **maintainer PR review platform**. The recommended entry point is the **Agent Skill** (`/signal-lens`), which auto-routes to MCP or CLI.

## Locations in this repo

| Path | Host |
|------|------|
| `skills/signal-lens/` | Canonical source |
| `.claude/skills/signal-lens/` | Claude Code (project) |
| `.grok/skills/signal-lens/` | Grok / Codex (project) |

## Use in your OSS repository

Copy the skill into the repo you are maintaining:

```bash
# Claude Code
mkdir -p .claude/skills/signal-lens
cp -r path/to/signal-lens/skills/signal-lens/* .claude/skills/signal-lens/

# Grok / Codex
mkdir -p .grok/skills/signal-lens
cp -r path/to/signal-lens/skills/signal-lens/* .grok/skills/signal-lens/
```

Ensure `signal-lens` is on PATH (`npm install -g signal-lens`) or build from source (`npm run build` → uses `dist/cli.js`).

## Auto-routing (MCP vs CLI)

The skill **auto-selects** the backend:

| Agent has MCP tool `review_pr`? | Backend |
|--------------------------------|---------|
| Yes | MCP tools (`review_pr`, `scan_*`, resources) |
| No | CLI via `run-review-auto.sh` or `run-review.sh` |

Check with:

```bash
signal-lens capabilities
```

## Invoke

```
/signal-lens                  # auto: MCP if connected, else CLI
/signal-lens --branch my-feature
/signal-lens --with-ai
```

## Scripts

`skills/signal-lens/scripts/run-review-auto.sh` — capabilities + routing hint + CLI review

`skills/signal-lens/scripts/run-review.sh`:

- Auto-detects `main` / `master` as base
- Runs `signal-lens index` (best-effort)
- Runs `signal-lens review --output all --static-only` by default
- Prints JSON + markdown for the agent to summarize

```bash
bash skills/signal-lens/scripts/run-review.sh --base main --head HEAD --static-only
```

## Layers

| Layer | Role |
|-------|------|
| **Skill** | Primary entry — when to review, how to summarize |
| **CLI / Action** | Evidence-based findings, CI integration |
| **MCP** *(optional)* | Tool/resource access for MCP-connected hosts |

> Product name slug: `signal-lens`. Product identity: maintainer PR review, not MCP-only tooling.

See [Agent Skills standard](https://agentskills.io) and [Claude Code skills](https://code.claude.com/docs/en/skills).