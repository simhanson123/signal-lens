# AI Providers

Signal Lens supports multiple AI providers for the AI review layer. Static analyzers always run regardless of provider.

## Provider comparison

| Provider | Key needed | Cost | Privacy | Setup |
|----------|-----------|------|---------|-------|
| OpenAI | `OPENAI_API_KEY` | Per-token | Cloud | Easiest |
| Anthropic | `ANTHROPIC_API_KEY` | Per-token | Cloud | Easy |
| Ollama | None | Free | Local | Install + pull model |
| Mock | None | Free | n/a | Tests only |

## Static-only mode (no AI)

```bash
signal-lens review --base main --head HEAD --static-only
```

Runs all four static analyzers. No API key, no cost.

## OpenAI

```yaml
ai:
  provider: openai
  model: gpt-4o-mini      # or gpt-4o, gpt-4-turbo, etc.
```

```bash
export OPENAI_API_KEY=sk-...
```

## Anthropic

```yaml
ai:
  provider: anthropic
  model: claude-3-5-haiku-20241022
```

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

> **Note:** The `model` setting is honored. You can also override via `ANTHROPIC_MODEL` env var.

## Ollama (local, no API key)

```bash
# Install: https://ollama.com
ollama pull qwen2.5-coder:7b
```

```yaml
ai:
  provider: ollama
  model: qwen2.5-coder:7b
  ollama:
    baseUrl: http://localhost:11434
```

If Ollama is not running, the review still completes with static analysis only. The metadata will show `aiReview: "skipped"` with a reason.

## Model selection

| Setting | OpenAI | Anthropic | Ollama |
|---------|--------|-----------|--------|
| `ai.model` in config | Used | Used | Used |
| Env override | — | `ANTHROPIC_MODEL` | `OLLAMA_MODEL` |
| Default | `gpt-4o-mini` | `claude-3-5-haiku-20241022` | `qwen2.5-coder:7b` |

## Error handling

If the AI provider returns an error (invalid key, rate limit, network failure), the review metadata includes the reason:

- `aiReview: "error"` — HTTP error from provider (check `aiSkipReason` for details)
- `aiReview: "skipped"` — provider not available or not reachable

Static analysis results are always included regardless of AI status.

## Token usage

Only the OpenAI provider reports token usage in the review metadata. Anthropic and Ollama do not expose token counts in their response format.
