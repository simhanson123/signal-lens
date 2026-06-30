import { getAvailableProvider } from "../providers/registry.js";
import type { AiProviderError } from "../providers/types.js";
import type { SignalLensConfig } from "../config/schema.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

export interface AiReviewAnalyzer extends Analyzer {
  lastError?: AiProviderError;
  wasSkipped?: boolean;
  skipReason?: string;
}

export function createAiReviewAnalyzer(config: SignalLensConfig): AiReviewAnalyzer {
  const self: AiReviewAnalyzer = {
    name: "ai-review",
    lastError: undefined,
    wasSkipped: false,
    skipReason: undefined,

    async analyze(context: DiffContext): Promise<Finding[]> {
      const provider = getAvailableProvider(
        process.env.SIGNAL_LENS_PROVIDER,
        config.ai.provider
      );
      if (!provider) {
        self.wasSkipped = true;
        self.skipReason = "No AI provider available. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or run Ollama locally.";
        return [];
      }

      const model =
        config.ai.provider === "ollama" || provider.name === "ollama"
          ? config.ai.model === "gpt-4o-mini"
            ? process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b"
            : config.ai.model
          : config.ai.model;

      const response = await provider.review({
        context,
        perspectives: config.ai.perspectives,
        model,
        architectureRules: config.rules.architecture,
        ollamaBaseUrl: config.ai.ollama?.baseUrl,
      });

      if (response.error) {
        self.lastError = response.error;
      }

      if (response.skipped) {
        self.wasSkipped = true;
        self.skipReason = response.skipReason ?? "AI provider was not reachable.";
        return [];
      }
      return response.findings;
    },
  };

  return self;
}