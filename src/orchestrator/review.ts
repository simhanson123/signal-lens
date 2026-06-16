import { createAiReviewAnalyzer } from "../analyzers/ai-review.js";
import {
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
} from "../analyzers/index.js";
import { loadConfig, shouldRunAiReview } from "../config/loader.js";
import { collectDiff } from "../core/collector.js";
import { buildReviewSummary } from "../core/classifier.js";
import { getDefaultProvider } from "../providers/index.js";
import type {
  Analyzer,
  Finding,
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

  const context = collectDiff({
    base: options.base,
    head: options.head,
    repoRoot,
  });

  const summary = buildReviewSummary(context);
  const analyzers = buildAnalyzers(config, options);
  const allAnalyzers = [...analyzers, ...extraAnalyzers];

  const findingSets = await Promise.all(
    allAnalyzers.map((analyzer) => analyzer.analyze(context))
  );

  const findings = dedupeFindings(findingSets.flat());
  const aiStatus = resolveAiStatus(config, options);

  return {
    version: "0.2.0",
    generatedAt: new Date().toISOString(),
    base: context.base,
    head: context.head,
    summary,
    findings,
    metadata: {
      analyzerCount: allAnalyzers.length,
      durationMs: Date.now() - start,
      aiReview: aiStatus.status,
      aiSkipReason: aiStatus.reason,
      staticOnly: aiStatus.status !== "completed",
    },
  };
}

function buildAnalyzers(
  config: ReturnType<typeof loadConfig>,
  options: ReviewOptions
): Analyzer[] {
  const analyzers: Analyzer[] = [];

  if (config.analyzers["ci-weakening"]) {
    analyzers.push(ciWeakeningAnalyzer);
  }
  if (config.analyzers["duplicate-utility"]) {
    analyzers.push(duplicateUtilityAnalyzer);
  }
  if (config.analyzers["security-boundary"]) {
    analyzers.push(securityBoundaryAnalyzer);
  }

  const wantAi = shouldRunAiReview(config) && !options.noAi;
  if (wantAi) {
    analyzers.push(createAiReviewAnalyzer(config));
  }

  return analyzers;
}

function resolveAiStatus(
  config: ReturnType<typeof loadConfig>,
  options: ReviewOptions
): { status: ReviewResult["metadata"]["aiReview"]; reason?: string } {
  if (options.noAi || !config.ai.enabled || config.analyzers["ai-review"] === false) {
    return { status: "disabled", reason: "AI review disabled by configuration or --static-only flag" };
  }

  const provider = getDefaultProvider();
  if (!provider.isAvailable()) {
    return { status: "skipped", reason: provider.unavailableReason() };
  }

  return { status: "completed" };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.category}:${f.title}:${f.evidence[0]?.file ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}