# Changelog

## 2.0.0 — 2026-06-20

### Changed
- **Rebrand to Signal Lens** — project renamed from `review-mcp` to `signal-lens`
- GitHub repository: `simhanson123/signal-lens`
- npm package, CLI binary, MCP server name: `signal-lens`
- Config file: `.signal-lens.yml` (loader falls back to `.review-mcp.yml`)
- Store directory: `.signal-lens/` (was `.review-mcp/`)
- Slash commands: `/signal-lens` (was `/review-mcp`)
- Env vars: `SIGNAL_LENS_*` (registry keeps `REVIEW_MCP_*` fallback)
- Schema type: `SignalLensConfig` (was `ReviewMcpConfig`)
- Skill paths: `skills/signal-lens/`, `.claude/skills/signal-lens/`, `.grok/skills/signal-lens/`
- Action/workflow → `@v2.0.0`

## 1.3.2 — 2026-06-19

### Changed
- **Branding repositioning** — product is maintainer PR review, not MCP-only tool
- README rewritten: problem-first, Skill as recommended entry, MCP as optional
- Updated package description, CLI tagline, OpenAI plan positioning, docs, handover
- Action/workflow → `@v1.3.2`

### Note
- Repository slug `review-mcp` unchanged (CLI, npm, Action compatibility)

## 1.3.1 — 2026-06-19

### Added
- **`review-mcp capabilities`** — CLI/MCP routing report for agents
- **`run-review-auto.sh`** — capabilities + routing hint + CLI fallback
- Skill auto-routing: MCP when `review_pr` tool is connected, else CLI

### Changed
- `SKILL.md` default flow is auto-detect backend (Step 0)

## 1.3.0 — 2026-06-19

### Added
- **Agent Skill** — `skills/review-mcp/SKILL.md` + `scripts/run-review.sh` for Claude Code and Grok/Codex
- Project skill paths: `.claude/skills/review-mcp/`, `.grok/skills/review-mcp/`
- `docs/skills.md` — installation and `/review-mcp` usage

### Changed
- Version strings unified to 1.3.0 (CLI, orchestrator, MCP server)
- README: Agent Skill section, Action `@v1.3.0`

## 1.2.0 — 2026-06-19

### Added
- **MCP `scan_test_coverage` tool** — exposes test-coverage analyzer via MCP
- **Cursor MCP descriptors** — `mcps/review-mcp/` tool/resource/prompt schemas for IDE integration
- **Korean planning & handover docs** — `docs/planning-ko.md`, `docs/handover-2026-06-19.md`

### Changed
- MCP server version synced to 1.2.0 (7 tools, 5 resources, 4 prompts)
- Architecture and OpenAI application docs updated to reflect shipped v1.x scope

## 1.1.0 — 2026-06-17

### Added
- **Ollama provider** — local LLM review without API keys (`ai.provider: ollama`)
- **Inline PR comments** — `review-mcp post-inline` and `review --post-inline`
- **Test coverage analyzer** — detects source changes without test updates
- GitHub Action `post-inline-comments` input

### Changed
- Auto provider order: OpenAI → Anthropic → Ollama → mock
- Default analyzers include `test-coverage`

## 1.0.0 — 2026-06-16

### Added
- Tree-sitter symbol indexer with SQLite persistence (`review-mcp index`)
- Import graph extraction and storage
- SQLite feedback memory and review history
- Multi-provider AI support (OpenAI, Anthropic, mock)
- Multi-perspective AI review orchestration
- MCP server: all 5 resources, 6 tools, 4 prompts
- Issue triage (`review-mcp triage`)
- Release assistant (`review-mcp release`)
- Auto-fix draft (`review-mcp fix`, `/review-mcp fix`)
- Slash commands: explain, false-positive, fix, release-notes, review
- GitHub App webhook server (`review-mcp serve`)
- SARIF output + GitHub Code Scanning upload workflow
- GitHub PR metadata collection (labels, CI status, body)
- Feedback filtering in review pipeline

### Changed
- Version 1.0.0 — full v0.1 + v0.2 + v0.3 feature completeness
- Action: separate read analysis from write comment step; fail on blockers
- Reporter includes finding IDs and slash-command follow-up hints