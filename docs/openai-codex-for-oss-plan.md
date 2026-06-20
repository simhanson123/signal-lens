# OpenAI Codex for Open Source — Application Plan

**Apply at:** https://developers.openai.com/community/codex-for-oss

**Repository:** https://github.com/simhanson123/signal-lens

**Current release:** v2.0.1 (44 tests, 4 fixture scenarios)

## Application Readiness Checklist

| Requirement | Status |
|-------------|--------|
| Public GitHub repository | Done |
| MIT license | Done |
| README (problem, install, Action example) | Done |
| `.github/workflows/signal-lens.yml` | Done (v2.0.0) |
| Fixture review snapshots (3+) | Done (4 scenarios) |
| `docs/architecture.md` | Done |
| `docs/security.md` | Done |
| `docs/openai-codex-for-oss-plan.md` | Done |
| CONTRIBUTING.md + CODE_OF_CONDUCT.md | Done |
| Evidence-based findings with confidence | Done |
| Human-in-the-loop write operations | Done |

## Project Positioning

> `signal-lens` is an open-source maintainer PR review platform that catches what diff-only review misses — CI weakening, security boundary regressions, duplicate utilities, and missing tests — with evidence-based findings. It ships as Agent Skills, CLI, GitHub Action, and optional MCP integration for repository-level context in AI-powered review, issue triage, and release workflows.

## Why This Repository Qualifies

> signal-lens helps OSS maintainers handle the growing volume of AI-generated pull requests. It provides context-first review through static analyzers, Tree-sitter indexing, maintainer rules, and feedback memory — exposed via Skills, CLI, Action, and MCP. The project directly targets PR review, maintainer automation, and release workflows.

## Product Usage Plan

> We will use Codex and OpenAI API credits to run multi-pass PR reviews, summarize repository architecture, classify risk areas, generate maintainer-focused review comments, triage issues, and draft release notes. API usage is central to the product: each PR review combines diff analysis, repository context (index + rules + optional MCP), security boundary checks, and structured output for GitHub comments, SARIF, and release artifacts.

## Responsible AI Alignment

OpenAI's workplace AI fundamentals map directly to how `signal-lens` is designed:

| AI Practice | How signal-lens implements it |
|-------------|------------------------------|
| **Clear instructions** | Structured MCP prompts (`strict_pr_review`, `security_boundary_review`), JSON-schema AI outputs, severity taxonomy |
| **Providing context** | MCP Resources (`repo://summary`, `repo://symbols`, architecture rules), Tree-sitter index, import graph |
| **Reviewing outputs** | Evidence + confidence on every finding, `/signal-lens false-positive` feedback loop, SARIF for human triage |
| **Responsible use** | Read-only default, separate write job for comments, no shell execution of model output, fork PR protection |

The maintainer's real work task this project improves: **reviewing AI-generated pull requests with less fatigue and more evidence**.

## v2.0.0 Capabilities (Shipped)

- **Agent Skills** — `/signal-lens` for Claude Code + Grok/Codex (primary entry point)
- **Auto MCP/CLI routing** — Skill + `capabilities` command
- **Static analyzers** — CI weakening, security boundaries, duplicates, test coverage
- **Ollama provider** — local LLM without API keys
- **Inline PR comments**, SARIF, GitHub Action
- **Optional MCP server** — 7 tools, 5 resources (integration layer, not product identity)

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
3. Link repository: https://github.com/simhanson123/signal-lens
4. Use the positioning and usage plan text above in the application form
5. Mention v2.0.0 release, 44 tests, Agent Skills + maintainer PR review positioning