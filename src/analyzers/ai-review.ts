import { getAvailableProvider } from "../providers/registry.js";
import type { ReviewMcpConfig } from "../config/schema.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

export function createAiReviewAnalyzer(config: ReviewMcpConfig): Analyzer {
  return {
    name: "ai-review",

    async analyze(context: DiffContext): Promise<Finding[]> {
      const provider = getAvailableProvider(
        process.env.REVIEW_MCP_PROVIDER,
        config.ai.provider
      );
      if (!provider) return [];

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

      if (response.skipped) return [];
      return response.findings;
    },
  };
}