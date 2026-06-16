import { defaultAnalyzers } from "../analyzers/index.js";
import { collectDiff } from "../core/collector.js";
import { buildReviewSummary } from "../core/classifier.js";
import type {
  Analyzer,
  Finding,
  ReviewOptions,
  ReviewResult,
} from "../core/types.js";

export async function runReview(
  options: ReviewOptions,
  analyzers: Analyzer[] = defaultAnalyzers
): Promise<ReviewResult> {
  const start = Date.now();

  const context = collectDiff({
    base: options.base,
    head: options.head,
    repoRoot: options.repoRoot,
  });

  const summary = buildReviewSummary(context);

  const findingSets = await Promise.all(
    analyzers.map((analyzer) => analyzer.analyze(context))
  );

  const findings = dedupeFindings(findingSets.flat());

  return {
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    base: context.base,
    head: context.head,
    summary,
    findings,
    metadata: {
      analyzerCount: analyzers.length,
      durationMs: Date.now() - start,
    },
  };
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