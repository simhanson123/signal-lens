# Configuration

Signal Lens reads settings from `.signal-lens.yml` at your repository root. Run `signal-lens init` to generate one with defaults.

## Quick start

```bash
signal-lens init
```

This creates `.signal-lens.yml` with sensible defaults. Edit it as needed.

## All options

```yaml
version: 1

ai:
  enabled: true                # Set false for static-only review
  provider: auto               # auto | openai | anthropic | ollama | mock
  model: gpt-4o-mini           # Model name (see Providers doc)
  perspectives:                # Each triggers a separate AI call
    - security
    - architecture
    - correctness
  ollama:                      # Optional — local AI without API keys
    baseUrl: http://localhost:11434

analyzers:
  ci-weakening: true           # continue-on-error, removed tests, coverage drops
  duplicate-utility: true       # New functions duplicating existing symbols
  security-boundary: true       # Injection, hardcoded secrets, permission issues
  injection: true               # SQL/path/command injection, unsafe deserialization
  secret-entropy: true          # High-entropy strings in key-like variable names
  test-coverage: true           # Source changes without test updates
  dependency-vuln: auto         # Check new deps against OSV database (auto = network-dependent)
  ai-review: auto               # true | false | auto

rules:
  architecture: []             # Project-specific rules for the AI reviewer

ignore:
  paths:                       # Glob patterns for excluded files
    - node_modules/**
    - dist/**
    - coverage/**
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI provider authentication |
| `ANTHROPIC_API_KEY` | Anthropic provider authentication |
| `SIGNAL_LENS_PROVIDER` | Override `ai.provider` (`openai`/`anthropic`/`ollama`/`mock`) |
| `OLLAMA_BASE_URL` | Override Ollama base URL (default `http://localhost:11434`) |
| `OLLAMA_MODEL` | Override Ollama model (default `qwen2.5-coder:7b`) |
| `ANTHROPIC_MODEL` | Override Anthropic model (default `claude-3-5-haiku-20241022`) |
| `GITHUB_TOKEN` / `GH_TOKEN` | PR comments and inline comments |
| `SIGNAL_LENS_WEBHOOK_URL` | Slack/Discord webhook for finding notifications |

## Provider auto-detection order

When `provider: auto` (default):

1. **OpenAI** — if `OPENAI_API_KEY` is set
2. **Anthropic** — if `ANTHROPIC_API_KEY` is set
3. **Ollama** — if locally reachable
4. **Mock** — in test environments

## JSON Schema (IDE autocomplete)

Add this to the top of your `.signal-lens.yml` for validation and autocomplete:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/simhanson123/signal-lens/main/docs/signal-lens.schema.json
```

## Debugging

```bash
signal-lens config          # Print resolved configuration
signal-lens providers       # Show provider availability
```

## Inline ignore comments

Suppress findings directly in source code using special comments:

```typescript
// signal-lens-ignore-next-line — suppresses the finding on the next line
const apiKey = getApiKey(); // finding suppressed if this line would trigger one

// signal-lens-disable       — suppresses all findings in this file
// signal-lens-enable        — re-enables findings after a disable
```

Supported syntax in any language: `//`, `#`, `/* */`.

Variants: `signal-lens-ignore-next-line`, `signal-lens-disable-next-line`,
`signal-lens-ignore` (all equivalent for next-line suppression).
