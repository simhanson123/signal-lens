# Architecture

## Overview

`review-mcp` is a context-first PR review pipeline designed for open-source maintainers handling AI-generated pull requests. The system collects diff context, classifies risk areas, runs specialized analyzers, and produces evidence-based reports.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Action  │     │       CLI        │     │  MCP Server     │
│   (v0.1 MVP)    │     │    (v0.1 MVP)    │     │    (v0.2)       │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                          │
         └───────────────────────┼──────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   Review Orchestrator  │
                    └────────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Diff Collector  │   │ Risk Classifier │   │ Context Indexer │
│                 │   │                 │   │   (v0.2)        │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │           Analyzers                │
              │  CI Weakening │ Duplicate Utility  │
              │  Security Boundary │ (+ AI v0.2)   │
              └────────────────┬───────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │     Reporter (Markdown / JSON)     │
              └────────────────────────────────────┘
```

## Components

### Diff Collector

Uses `git diff` to gather base/head changes, file statistics, and full patch content. Entry point for both CLI and GitHub Action.

### Risk Classifier

Categorizes changed files into: `code`, `test`, `docs`, `ci`, `dependency`, `security-sensitive`. Produces a review summary with purpose, scope, and risk file list.

### Analyzers (v0.1)

| Analyzer | Purpose |
|----------|---------|
| `ci-weakening` | Detects CI quality gate weakening patterns |
| `duplicate-utility` | Finds new symbols similar to existing utilities |
| `security-boundary` | Checks secrets, permissions, untrusted input flows |

### Review Orchestrator

Coordinates collection, classification, parallel analyzer execution, deduplication, and report generation.

### Reporter

Outputs structured Markdown (for PR comments) and JSON (for automation artifacts).

## MCP Interface (v0.2)

Planned MCP resources, tools, and prompts:

**Resources:** `repo://summary`, `repo://symbols/{name}`, `repo://architecture/rules`, `repo://reviews/history`

**Tools:** `review_pr`, `scan_ci_weakening`, `find_duplicate_utility`, `trace_security_boundary`, `record_feedback`

**Prompts:** `strict_pr_review`, `maintainer_triage`, `security_boundary_review`

## Data Flow

1. PR event triggers Action or maintainer runs CLI
2. Collector fetches diff between base and head
3. Classifier tags files and builds summary
4. Analyzers run in parallel on diff context
5. Orchestrator merges and deduplicates findings
6. Reporter writes Markdown/JSON output
7. (Optional) Action posts PR comment with write permission

## Technology Stack

- **Language:** TypeScript (Node.js 20+)
- **CLI:** Commander
- **Testing:** Vitest
- **Parsing (v0.2):** Tree-sitter symbol indexer
- **Storage (v0.2):** SQLite for feedback memory