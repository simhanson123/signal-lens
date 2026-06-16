# OpenAI Codex for Open Source — Application Plan

**Apply at:** https://developers.openai.com/community/codex-for-oss

**Repository:** https://github.com/simhanson123/review-mcp

## Project Positioning

> `review-mcp` is an open-source maintainer automation agent that uses MCP to provide repository-level context for AI-powered pull request review, issue triage, and release workflows. It helps maintainers review agent-generated PRs by detecting CI weakening, duplicated utilities, security boundary regressions, missing tests, and release risks with evidence-based findings.

## Why This Repository Qualifies

> review-mcp helps OSS maintainers handle the growing volume of AI-generated pull requests. It uses MCP to expose repository context, maintainer rules, prior review feedback, and release metadata to AI reviewers. The project directly targets PR review, maintainer automation, and release workflows by detecting CI weakening, duplicated utilities, security boundary regressions, and missing tests with evidence-based findings.

## Product Usage Plan

> We will use Codex and OpenAI API credits to run multi-pass PR reviews, summarize repository architecture, classify risk areas, generate maintainer-focused review comments, triage issues, and draft release notes. API usage is central to the product: each PR review combines diff analysis, repository context retrieval through MCP, security boundary checks, and structured output generation for GitHub comments, SARIF, and release artifacts.

## API Credit Usage Breakdown

| Use Case | API Calls | Frequency |
|----------|-----------|-----------|
| PR diff analysis + risk classification | 1-2 per PR | Every PR |
| Repository context summarization | 1 per repo index | On change / daily |
| Multi-perspective review (security, architecture) | 2-4 per PR | High-risk PRs |
| Issue triage (v0.3) | 1 per issue | New issues |
| Release note drafting (v0.3) | 1 per release | Per release cycle |

## Codex Security Usage

Codex Security will validate:

- MCP server tool permission model
- GitHub Action token scope
- Prompt injection resistance in workflow integrations
- Secret handling in CI pipelines

## Success Metrics

| Metric | Target |
|--------|--------|
| Accepted finding rate | > 40% of findings lead to fixes |
| False positive rate | < 20% marked false-positive |
| CI weakening detections | Track blockers caught pre-merge |
| Maintainer time saved | 30%+ reduction in review latency |