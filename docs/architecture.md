# Architecture

## Overview

`review-mcp` v1.0.0 is a context-first PR review and maintainer automation platform.

```
GitHub Action / CLI / GitHub App / MCP Server
                    │
                    ▼
           Review Orchestrator
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
Diff Collector  Risk Classifier  Context Indexer (Tree-sitter + SQLite)
    │               │               │
    └───────────────┼───────────────┘
                    ▼
         Static Analyzers + Multi-pass AI Providers
                    │
                    ▼
      Synthesizer → Feedback Filter → History Store
                    │
                    ▼
         Markdown / JSON / SARIF Reporter
```

## Components

| Component | Path | Role |
|-----------|------|------|
| CLI | `src/cli.ts` | review, index, mcp, serve, feedback, release, triage, fix, slash |
| GitHub Action | `action.yml` | Read-only review + optional PR comment + SARIF |
| GitHub App | `src/github/app.ts` | Webhook server for PR events and slash commands |
| MCP Server | `src/mcp/server.ts` | Full MCP resources, tools, prompts |
| Tree-sitter Indexer | `src/indexer/tree-sitter.ts` | WASM parsers, symbol SQLite store |
| Import Graph | `src/indexer/imports.ts` | Module dependency edges |
| Feedback Memory | `src/memory/feedback.ts` | SQLite false-positive / accepted findings |
| Review History | `src/memory/history.ts` | SQLite review result archive |
| Issue Triage | `src/issue/triage.ts` | Duplicate detection, label recommendations |
| Release Assistant | `src/release/assistant.ts` | Changelog from merged PRs |
| Auto-fix Draft | `src/autofix/draft.ts` | Human-approved patch proposals |
| Providers | `src/providers/` | OpenAI, Anthropic, mock registry |

## MCP Interface

### Resources
- `repo://summary`
- `repo://symbols/{name}`
- `repo://architecture/rules`
- `repo://reviews/history`
- `repo://release/current`

### Tools
- `review_pr`, `scan_ci_weakening`, `find_duplicate_utility`, `trace_security_boundary`
- `record_feedback` (write — human approval)
- `draft_release_notes`

### Prompts
- `strict_pr_review`, `maintainer_triage`, `security_boundary_review`, `release_preparation`

## Security Model

- Read-only default for review jobs
- Write operations (comments, feedback) require explicit approval paths
- Fork PR secrets excluded in example workflows
- Untrusted input: PR body, issue body, commit messages