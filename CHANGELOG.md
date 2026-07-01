# Changelog

## 2.2.0 — 2026-07-01

### Added
- **Inline ignore comments** — suppress findings via `// signal-lens-ignore-next-line`, `// signal-lens-disable`, `// signal-lens-enable` in source code
- **PR auto-labeling** — automatically add/remove `signal-lens:*` labels based on review findings (`signal-lens label`, `review --apply-labels`, Action `apply-labels` input)
- **Secret entropy scanner** — detects hardcoded secrets by calculating Shannon entropy on string literals assigned to key-like variable names (`secret-entropy` analyzer)
- **Dependency vulnerability check** — checks added dependencies against the OSV database (`dependency-vuln` analyzer, network-dependent, fails gracefully offline)
- **Slack/Discord notifications** — sends finding summaries to webhooks on blocker/high findings (`review --notify <url>`, `SIGNAL_LENS_WEBHOOK_URL`, Action `notify-webhook` input)
- **Review quality trends** — tracks finding counts, category distribution, false-positive rate, AI vs static ratio, and average duration from review history (`signal-lens trends`)

### Changed
- AI providers now run all perspectives concurrently via `Promise.all` (3x speedup for multi-perspective reviews)
- Action includes `apply-labels` and `notify-webhook` inputs

### Fixed
- **Line numbers in evidence** — all static analyzers now populate `evidence.line`, enabling inline PR comments and line-level `signal-lens-ignore-next-line` suppression (previously neither feature worked because no analyzer emitted line numbers)
- Fixture snapshots regenerated with stable finding IDs and current version

## 2.1.0 — 2026-06-30

### Added
- **PR Walkthrough** — high-level summary comment with risk assessment, file changes by area, and key findings (`signal-lens review -o walkthrough`)
- **Incremental re-review** — `--incremental` flag reviews only files changed since the last review (uses review history)
- **Custom rules engine** — define project-specific regex rules in `.signal-lens.yml` (`rules.custom`)
- **Injection analyzer** — detects SQL injection, path traversal, command injection, unsafe deserialization
- **Multi-language symbol support** — Rust (`.rs`) and Java (`.java`) now indexed; Go/Rust/Java import patterns added
- **`signal-lens init`** — scaffolds `.signal-lens.yml` with inline documentation
- **`signal-lens config`** — prints the resolved configuration for debugging
- **Auto-detect base branch** — `review` without `--base` detects `main`/`master` automatically
- **JSON Schema** — `docs/signal-lens.schema.json` for IDE autocomplete in `.signal-lens.yml`
- **SARIF upload step** — `upload-sarif` input in GitHub Action for Code Scanning integration
- **Docs** — `configuration.md`, `providers.md`, `cli-reference.md`, `troubleshooting.md`
- **Improvement roadmap** — `docs/improvement-roadmap.md`

### Fixed
- **Stable finding IDs** — CI-weakening and security-boundary findings now use deterministic IDs (was array-index-based, breaking feedback memory)
- **AI provider error visibility** — HTTP 401/429/500 and network errors are now surfaced in `metadata.aiSkipReason` (was silently swallowed)
- **Anthropic model selection** — `ai.model` config is now honored (was ignored, always used Haiku)
- **Ollama skip tracking** — unreachable Ollama now reports `aiReview: "skipped"` with reason (was reported as "completed")
- **`Promise.allSettled`** — one analyzer failure no longer aborts the entire review (was `Promise.all`)
- **zod config validation** — invalid config values now throw descriptive errors (was silently defaulted)
- **Global error handler** — CLI errors now print friendly messages instead of raw stack traces
- **Blocker exit message** — `review` exit 1 now explains why

### Changed
- Version string sourced from `package.json` via `src/core/version.ts` (was hardcoded in 4+ places)
- Symbol extraction unified in `src/core/diff-symbols.ts` (was triplicated across 3 files)
- Anthropic `max_tokens` increased from 2048 to 4096
- `review` `--base`/`--head` are now optional (was `requiredOption`)

## 2.0.1 — 2026-06-20

### Added
- **Tag-triggered release workflow** — pushing `v*` tags creates GitHub Releases automatically
- Release notes templates under `.github/release-notes/`

### Changed
- Action/workflow → `@v2.0.1`

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
- Updated package description, CLI tagline, and docs
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

### Changed
- MCP server version synced to 1.2.0 (7 tools, 5 resources, 4 prompts)
- Architecture docs updated to reflect shipped v1.x scope

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