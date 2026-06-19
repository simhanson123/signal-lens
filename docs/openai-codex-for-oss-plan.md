# OpenAI Codex for Open Source — Application Plan

**Apply at:** https://developers.openai.com/community/codex-for-oss

**Repository:** https://github.com/simhanson123/review-mcp

**Current release:** v1.2.0 (43 tests, 4 fixture scenarios)

## Application Readiness Checklist

| Requirement | Status |
|-------------|--------|
| Public GitHub repository | Done |
| MIT license | Done |
| README (problem, install, Action example) | Done |
| `.github/workflows/review-mcp.yml` | Done (v1.2.0) |
| Fixture review snapshots (3+) | Done (4 scenarios) |
| `docs/architecture.md` | Done |
| `docs/security.md` | Done |
| `docs/openai-codex-for-oss-plan.md` | Done |
| CONTRIBUTING.md + CODE_OF_CONDUCT.md | Done |
| Evidence-based findings with confidence | Done |
| Human-in-the-loop write operations | Done |

## Project Positioning

> `review-mcp` is an open-source maintainer automation agent that uses MCP to provide repository-level context for AI-powered pull request review, issue triage, and release workflows. It helps maintainers review agent-generated PRs by detecting CI weakening, duplicated utilities, security boundary regressions, missing tests, and release risks with evidence-based findings.

## Why This Repository Qualifies

> review-mcp helps OSS maintainers handle the growing volume of AI-generated pull requests. It uses MCP to expose repository context, maintainer rules, prior review feedback, and release metadata to AI reviewers. The project directly targets PR review, maintainer automation, and release workflows by detecting CI weakening, duplicated utilities, security boundary regressions, and missing tests with evidence-based findings.

## Product Usage Plan

> We will use Codex and OpenAI API credits to run multi-pass PR reviews, summarize repository architecture, classify risk areas, generate maintainer-focused review comments, triage issues, and draft release notes. API usage is central to the product: each PR review combines diff analysis, repository context retrieval through MCP, security boundary checks, and structured output generation for GitHub comments, SARIF, and release artifacts.

## Responsible AI Alignment

OpenAI's workplace AI fundamentals map directly to how `review-mcp` is designed:

| AI Practice | How review-mcp implements it |
|-------------|------------------------------|
| **Clear instructions** | Structured MCP prompts (`strict_pr_review`, `security_boundary_review`), JSON-schema AI outputs, severity taxonomy |
| **Providing context** | MCP Resources (`repo://summary`, `repo://symbols`, architecture rules), Tree-sitter index, import graph |
| **Reviewing outputs** | Evidence + confidence on every finding, `/review-mcp false-positive` feedback loop, SARIF for human triage |
| **Responsible use** | Read-only default, separate write job for comments, no shell execution of model output, fork PR protection |

The maintainer's real work task this project improves: **reviewing AI-generated pull requests with less fatigue and more evidence**.

## v1.2.0 Capabilities (Shipped)

- **Ollama provider** — local LLM review without API keys (demonstrates multi-provider design)
- **Inline PR comments** — line-level findings via `post-inline` / `--post-inline`
- **Test coverage analyzer** — flags source changes without test updates
- **MCP `scan_test_coverage`** — test-coverage analyzer exposed as MCP tool
- **Cursor MCP descriptors** — `mcps/review-mcp/` for IDE tool schema discovery
- **GitHub Action** — `post-inline-comments` input

## API Credit Usage Breakdown

| Use Case | API Calls | Frequency |
|----------|-----------|-----------|
| PR diff analysis + risk classification | 1-2 per PR | Every PR |
| Repository context summarization | 1 per repo index | On change / daily |
| Multi-perspective review (security, architecture) | 2-4 per PR | High-risk PRs |
| Issue triage | 1 per issue | New issues |
| Release note drafting | 1 per release | Per release cycle |

Estimated monthly usage (active OSS project, ~50 PRs/month): **150-300 API calls**.

## Codex Security Usage

Codex Security will validate:

- MCP server tool permission model
- GitHub Action token scope
- Prompt injection resistance in workflow integrations
- Secret handling in CI pipelines
- Inline comment write path isolation

## Success Metrics

| Metric | Target |
|--------|--------|
| Accepted finding rate | > 40% of findings lead to fixes |
| False positive rate | < 20% marked false-positive |
| CI weakening detections | Track blockers caught pre-merge |
| Maintainer time saved | 30%+ reduction in review latency |

## Suggested Application Steps

1. Complete OpenAI's introductory AI course (optional but strengthens AI literacy narrative)
2. Submit application at https://developers.openai.com/community/codex-for-oss
3. Link repository: https://github.com/simhanson123/review-mcp
4. Use the positioning and usage plan text above in the application form
5. Mention v1.2.0 release, 43 tests, MCP server, and maintainer automation scope