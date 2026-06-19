import { createAiReviewAnalyzer } from "../analyzers/ai-review.js";
import {
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
} from "../analyzers/index.js";
import { loadConfig, shouldRunAiReview } from "../config/loader.js";
import { collectDiff, collectDiffWithPr } from "../core/collector.js";
import { buildReviewSummary } from "../core/classifier.js";
import { filterByFeedback } from "../memory/feedback.js";
import { saveReviewHistory } from "../memory/history.js";
import { buildRepoSummary } from "../indexer/repo-summary.js";
import { getAvailableProvider } from "../providers/registry.js";
import { synthesizeFindings } from "./synthesizer.js";
import type {
  Analyzer,
  Finding,
  PrContext,
  ReviewOptions,
  ReviewResult,
} from "../core/types.js";

export async function runReview(
  options: ReviewOptions,
  extraAnalyzers: Analyzer[] = []
): Promise<ReviewResult> {
  const start = Date.now();
  const repoRoot = options.repoRoot ?? process.cwd();
  const config = loadConfig(repoRoot);

  let prContext: PrContext | undefined;
  let context;

  if (options.pr) {
    const enriched = await collectDiffWithPr({
      base: options.base,
      head: options.head,
      repoRoot,
      pr: options.pr,
      ignorePaths: config.ignore.paths,
    });
    context = enriched.context;
    prContext = enriched.prContext;
  } else {
    context = collectDiff({
      base: options.base,
      head: options.head,
      repoRoot,
      ignorePaths: config.ignore.paths,
    });
  }

  const repoSummary = buildRepoSummary(repoRoot, config);
  const summary = buildReviewSummary(context, prContext, repoSummary);

  const analyzers = buildAnalyzers(config, options);
  const allAnalyzers = [...analyzers, ...extraAnalyzers];

  const findingSets = await Promise.all(
    allAnalyzers.map((analyzer) => analyzer.analyze(context))
  );

  let findings = synthesizeFindings(findingSets.flat());
  findings = filterByFeedback(findings, repoRoot);

  const aiStatus = resolveAiStatus(config, options);
  const result: ReviewResult = {
    version: "1.3.0",
    generatedAt: new Date().toISOString(),
    base: context.base,
    head: context.head,
    summary,
    findings,
    pr: prContext,
    metadata: {
      analyzerCount: allAnalyzers.length,
      durationMs: Date.now() - start,
      aiReview: aiStatus.status,
      aiSkipReason: aiStatus.reason,
      staticOnly: aiStatus.status !== "completed",
      provider: aiStatus.provider,
      repoContextUsed: true,
    },
  };

  saveReviewHistory(repoRoot, result);
  return result;
}

function buildAnalyzers(
  config: ReturnType<typeof loadConfig>,
  options: ReviewOptions
): Analyzer[] {
  const analyzers: Analyzer[] = [];

  if (config.analyzers["ci-weakening"]) analyzers.push(ciWeakeningAnalyzer);
  if (config.analyzers["duplicate-utility"]) analyzers.push(duplicateUtilityAnalyzer);
  if (config.analyzers["security-boundary"]) analyzers.push(securityBoundaryAnalyzer);
  if (config.analyzers["test-coverage"]) analyzers.push(testCoverageAnalyzer);

  if (shouldRunAiReview(config) && !options.noAi) {
    analyzers.push(createAiReviewAnalyzer(config));
  }

  return analyzers;
}

function resolveAiStatus(
  config: ReturnType<typeof loadConfig>,
  options: ReviewOptions
): { status: ReviewResult["metadata"]["aiReview"]; reason?: string; provider?: string } {
  if (options.noAi || !config.ai.enabled || config.analyzers["ai-review"] === false) {
    return { status: "disabled", reason: "AI review disabled by configuration or --static-only flag" };
  }

  const provider = getAvailableProvider(process.env.REVIEW_MCP_PROVIDER, config.ai.provider);
  if (!provider) {
    return {
      status: "skipped",
      reason: "No AI provider available. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or run Ollama locally.",
    };
  }

  return { status: "completed", provider: provider.name };
}