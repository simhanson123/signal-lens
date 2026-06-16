# Changelog

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