import { getAvailableProvider } from "../providers/registry.js";
import type { ReviewMcpConfig } from "../config/schema.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

export function createAiReviewAnalyzer(config: ReviewMcpConfig): Analyzer {
  return {
    name: "ai-review",

    async analyze(context: DiffContext): Promise<Finding[]> {
      const provider = getAvailableProvider(process.env.REVIEW_MCP_PROVIDER);
      if (!provider || !provider.isAvailable()) {
        return [];
      }

      const response = await provider.review({
        context,
        perspectives: config.ai.perspectives,
        model: config.ai.model,
        architectureRules: config.rules.architecture,
      });

      return response.findings;
    },
  };
}