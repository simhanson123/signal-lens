import type { ReviewHistoryEntry } from "../memory/history.js";
import type { FeedbackEntry } from "../memory/feedback.js";

export interface TrendsReport {
  totalReviews: number;
  avgFindingsPerReview: number;
  avgBlockersPerReview: number;
  avgDurationMs: number;
  findingTrend: Array<{ createdAt: string; findings: number; blockers: number }>;
  categoryDistribution: Record<string, number>;
  aiVsStaticRatio: { ai: number; static: number };
  falsePositiveRate: number;
}

export function computeTrends(
  history: ReviewHistoryEntry[],
  feedback: FeedbackEntry[] = []
): TrendsReport {
  const totalReviews = history.length;

  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      avgFindingsPerReview: 0,
      avgBlockersPerReview: 0,
      avgDurationMs: 0,
      findingTrend: [],
      categoryDistribution: {},
      aiVsStaticRatio: { ai: 0, static: 0 },
      falsePositiveRate: 0,
    };
  }

  const totalFindings = history.reduce((sum, h) => sum + h.findingCount, 0);
  const totalBlockers = history.reduce((sum, h) => sum + h.blockerCount, 0);

  const durations = history
    .map((h) => h.result.metadata?.durationMs)
    .filter((d): d is number => typeof d === "number");
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const findingTrend = history
    .map((h) => ({ createdAt: h.createdAt, findings: h.findingCount, blockers: h.blockerCount }))
    .reverse();

  const categoryDistribution: Record<string, number> = {};
  let aiCount = 0;
  let staticCount = 0;

  for (const h of history) {
    for (const f of h.result.findings) {
      const cat = f.category ?? "unknown";
      categoryDistribution[cat] = (categoryDistribution[cat] ?? 0) + 1;
      if (cat.startsWith("ai-")) {
        aiCount++;
      } else {
        staticCount++;
      }
    }
  }

  const falsePositiveCount = feedback.filter((f) => f.type === "false-positive").length;
  const falsePositiveRate = totalFindings > 0
    ? Math.round((falsePositiveCount / totalFindings) * 1000) / 10
    : 0;

  return {
    totalReviews,
    avgFindingsPerReview: Math.round((totalFindings / totalReviews) * 10) / 10,
    avgBlockersPerReview: Math.round((totalBlockers / totalReviews) * 10) / 10,
    avgDurationMs,
    findingTrend,
    categoryDistribution,
    aiVsStaticRatio: { ai: aiCount, static: staticCount },
    falsePositiveRate,
  };
}

export function formatTrendsMarkdown(report: TrendsReport): string {
  const lines: string[] = ["## Signal Lens — Review Trends", ""];

  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total reviews | ${report.totalReviews} |`);
  lines.push(`| Avg findings/review | ${report.avgFindingsPerReview} |`);
  lines.push(`| Avg blockers/review | ${report.avgBlockersPerReview} |`);
  lines.push(`| Avg duration | ${report.avgDurationMs}ms |`);
  lines.push(`| False-positive rate | ${report.falsePositiveRate}% |`);
  lines.push("");

  if (report.findingTrend.length > 0) {
    lines.push(`### Finding Count Trend (last ${report.findingTrend.length})`);
    lines.push("| Date | Findings | Blockers |");
    lines.push("|------|----------|----------|");
    for (const t of report.findingTrend) {
      const date = t.createdAt.split("T")[0];
      lines.push(`| ${date} | ${t.findings} | ${t.blockers} |`);
    }
    lines.push("");
  }

  const categories = Object.entries(report.categoryDistribution).sort((a, b) => b[1] - a[1]);
  if (categories.length > 0) {
    lines.push("### Category Distribution");
    lines.push("| Category | Count |");
    lines.push("|----------|-------|");
    for (const [cat, count] of categories) {
      lines.push(`| ${cat} | ${count} |`);
    }
    lines.push("");
  }

  lines.push("### AI vs Static");
  lines.push("| Type | Count |");
  lines.push("|------|-------|");
  lines.push(`| Static | ${report.aiVsStaticRatio.static} |`);
  lines.push(`| AI | ${report.aiVsStaticRatio.ai} |`);

  return lines.join("\n");
}

export function formatTrendsJson(report: TrendsReport): string {
  return JSON.stringify(report, null, 2);
}
