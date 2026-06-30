import { createAiReviewAnalyzer, type AiReviewAnalyzer } from "../analyzers/ai-review.js";
import { createCustomRulesAnalyzer } from "../analyzers/custom-rules.js";
import {
  ciWeakeningAnalyzer,
  dependencyVulnAnalyzer,
  duplicateUtilityAnalyzer,
  injectionAnalyzer,
  secretEntropyAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
} from "../analyzers/index.js";
import { loadConfig, shouldRunAiReview } from "../config/loader.js";
import { collectDiff, collectDiffWithPr } from "../core/collector.js";
import { buildReviewSummary } from "../core/classifier.js";
import { filterByFeedback } from "../memory/feedback.js";
import { filterByIgnoreComments } from "../core/ignore-comments.js";
import { getLastReviewHead, saveReviewHistory } from "../memory/history.js";
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
import { VERSION } from "../core/version.js";

export async function runReview(
  options: ReviewOptions,
  extraAnalyzers: Analyzer[] = []
): Promise<ReviewResult> {
  const start = Date.now();
  const repoRoot = options.repoRoot ?? process.cwd();
  const config = loadConfig(repoRoot);

  let baseRef = options.base;
  if (options.incremental) {
    const lastHead = getLastReviewHead(repoRoot, options.base);
    if (lastHead) {
      baseRef = lastHead;
    }
  }

  let prContext: PrContext | undefined;
  let context;

  if (options.pr) {
    const enriched = await collectDiffWithPr({
      base: baseRef,
      head: options.head,
      repoRoot,
      pr: options.pr,
      ignorePaths: config.ignore.paths,
    });
    context = enriched.context;
    prContext = enriched.prContext;
  } else {
    context = collectDiff({
      base: baseRef,
      head: options.head,
      repoRoot,
      ignorePaths: config.ignore.paths,
    });
  }

  const repoSummary = buildRepoSummary(repoRoot, config);
  const summary = buildReviewSummary(context, prContext, repoSummary);

  const analyzers = buildAnalyzers(config, options);
  const allAnalyzers = [...analyzers, ...extraAnalyzers];

  const settleResults = await Promise.allSettled(
    allAnalyzers.map((analyzer) => analyzer.analyze(context))
  );

  const findingsFromAnalyzers: Finding[] = [];
  const analyzerErrors: Array<{ analyzer: string; error: string }> = [];

  for (let i = 0; i < settleResults.length; i++) {
    const result = settleResults[i];
    if (result.status === "fulfilled") {
      findingsFromAnalyzers.push(...result.value);
    } else {
      analyzerErrors.push({
        analyzer: allAnalyzers[i].name,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  let findings = synthesizeFindings(findingsFromAnalyzers);
  findings = filterByFeedback(findings, repoRoot);
  findings = filterByIgnoreComments(findings, context.diff);

  const aiStatus = resolveAiStatus(config, options);
  const aiAnalyzer = analyzers.find(
    (a): a is AiReviewAnalyzer => a.name === "ai-review"
  );
  const aiError = aiAnalyzer?.lastError;

  const aiReview: ReviewResult["metadata"]["aiReview"] = aiError
    ? "error"
    : aiAnalyzer?.wasSkipped
      ? "skipped"
      : aiStatus.status;
  const aiSkipReason = aiError
    ? `AI provider error (${aiError.status}): ${aiError.message}`
    : aiAnalyzer?.skipReason ?? aiStatus.reason;
  const result: ReviewResult = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    base: context.base,
    head: context.head,
    summary,
    findings,
    changedFiles: context.changedFiles,
    pr: prContext,
    metadata: {
      analyzerCount: allAnalyzers.length,
      durationMs: Date.now() - start,
      aiReview,
      aiSkipReason,
      staticOnly: aiReview !== "completed",
      provider: aiStatus.provider,
      repoContextUsed: true,
      analyzerErrors: analyzerErrors.length > 0 ? analyzerErrors : undefined,
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
  if (config.analyzers["injection"]) analyzers.push(injectionAnalyzer);
  if (config.analyzers["secret-entropy"]) analyzers.push(secretEntropyAnalyzer);
  if (config.analyzers["test-coverage"]) analyzers.push(testCoverageAnalyzer);
  if (config.analyzers["dependency-vuln"]) analyzers.push(dependencyVulnAnalyzer);

  if (shouldRunAiReview(config) && !options.noAi) {
    analyzers.push(createAiReviewAnalyzer(config));
  }

  if (config.rules.custom && config.rules.custom.length > 0) {
    analyzers.push(createCustomRulesAnalyzer(config.rules.custom));
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

  const provider = getAvailableProvider(process.env.SIGNAL_LENS_PROVIDER, config.ai.provider);
  if (!provider) {
    return {
      status: "skipped",
      reason: "No AI provider available. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or run Ollama locally.",
    };
  }

  return { status: "completed", provider: provider.name };
}