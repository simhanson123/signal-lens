import { describe, expect, it } from "vitest";
import { computeTrends, formatTrendsMarkdown, formatTrendsJson } from "../src/core/trends.js";
import type { ReviewHistoryEntry } from "../src/memory/history.js";
import type { FeedbackEntry } from "../src/memory/feedback.js";
import type { ReviewResult } from "../src/core/types.js";

function makeReviewResult(
  findings: ReviewResult["findings"],
  durationMs = 1000
): ReviewResult {
  return {
    version: "2.2.0",
    generatedAt: "2026-07-01T00:00:00Z",
    base: "main",
    head: "HEAD",
    summary: { purpose: "", scope: "", riskFiles: [], categories: { code: 0, test: 0, docs: 0, ci: 0, dependency: 0, "security-sensitive": 0 } },
    findings,
    metadata: { analyzerCount: 5, durationMs, aiReview: "completed", staticOnly: false },
  };
}

function makeHistoryEntry(
  createdAt: string,
  findings: ReviewResult["findings"],
  durationMs = 1000
): ReviewHistoryEntry {
  return {
    id: `rh-${createdAt}`,
    baseRef: "main",
    headRef: "HEAD",
    findingCount: findings.length,
    blockerCount: findings.filter((f) => f.severity === "blocker").length,
    result: makeReviewResult(findings, durationMs),
    createdAt,
  };
}

function makeFeedback(type: FeedbackEntry["type"]): FeedbackEntry {
  return {
    id: `fb-${type}-${Math.random()}`,
    findingId: "some-id",
    type,
    recordedAt: "2026-07-01T00:00:00Z",
  };
}

const baseFinding = {
  reason: "",
  evidence: [],
  suggestedAction: "",
  confidence: 0.8,
};

describe("computeTrends", () => {
  it("returns zeros for empty history", () => {
    const report = computeTrends([]);
    expect(report.totalReviews).toBe(0);
    expect(report.avgFindingsPerReview).toBe(0);
    expect(report.falsePositiveRate).toBe(0);
  });

  it("computes averages correctly", () => {
    const history = [
      makeHistoryEntry("2026-07-01T10:00:00Z", [
        { ...baseFinding, id: "1", severity: "blocker", category: "injection", title: "a" },
        { ...baseFinding, id: "2", severity: "high", category: "ci-weakening", title: "b" },
      ], 1500),
      makeHistoryEntry("2026-07-02T10:00:00Z", [
        { ...baseFinding, id: "3", severity: "low", category: "test-coverage", title: "c" },
      ], 500),
    ];

    const report = computeTrends(history);
    expect(report.totalReviews).toBe(2);
    expect(report.avgFindingsPerReview).toBe(1.5);
    expect(report.avgBlockersPerReview).toBe(0.5);
    expect(report.avgDurationMs).toBe(1000);
  });

  it("computes category distribution", () => {
    const history = [
      makeHistoryEntry("2026-07-01", [
        { ...baseFinding, id: "1", severity: "high", category: "ci-weakening", title: "a" },
        { ...baseFinding, id: "2", severity: "high", category: "ci-weakening", title: "b" },
        { ...baseFinding, id: "3", severity: "high", category: "injection", title: "c" },
      ]),
    ];

    const report = computeTrends(history);
    expect(report.categoryDistribution["ci-weakening"]).toBe(2);
    expect(report.categoryDistribution["injection"]).toBe(1);
  });

  it("computes AI vs static ratio", () => {
    const history = [
      makeHistoryEntry("2026-07-01", [
        { ...baseFinding, id: "1", severity: "high", category: "ci-weakening", title: "a" },
        { ...baseFinding, id: "2", severity: "high", category: "ai-security", title: "b" },
        { ...baseFinding, id: "3", severity: "high", category: "ai-architecture", title: "c" },
      ]),
    ];

    const report = computeTrends(history);
    expect(report.aiVsStaticRatio.static).toBe(1);
    expect(report.aiVsStaticRatio.ai).toBe(2);
  });

  it("computes false-positive rate", () => {
    const history = [
      makeHistoryEntry("2026-07-01", [
        { ...baseFinding, id: "1", severity: "high", category: "x", title: "a" },
        { ...baseFinding, id: "2", severity: "high", category: "x", title: "b" },
      ]),
      makeHistoryEntry("2026-07-02", [
        { ...baseFinding, id: "3", severity: "high", category: "x", title: "c" },
        { ...baseFinding, id: "4", severity: "high", category: "x", title: "d" },
      ]),
    ];
    const feedback = [
      makeFeedback("false-positive"),
      makeFeedback("false-positive"),
      makeFeedback("accepted"),
    ];

    const report = computeTrends(history, feedback);
    expect(report.falsePositiveRate).toBe(50);
  });

  it("finding trend is in chronological order", () => {
    const history = [
      makeHistoryEntry("2026-07-02T10:00:00Z", [{ ...baseFinding, id: "1", severity: "low", category: "x", title: "a" }]),
      makeHistoryEntry("2026-07-01T10:00:00Z", [{ ...baseFinding, id: "2", severity: "low", category: "x", title: "b" }]),
    ];

    const report = computeTrends(history);
    expect(report.findingTrend[0].createdAt).toBe("2026-07-01T10:00:00Z");
    expect(report.findingTrend[1].createdAt).toBe("2026-07-02T10:00:00Z");
  });
});

describe("formatTrendsMarkdown", () => {
  it("includes all sections", () => {
    const history = [
      makeHistoryEntry("2026-07-01", [
        { ...baseFinding, id: "1", severity: "blocker", category: "ci-weakening", title: "a" },
      ]),
    ];
    const report = computeTrends(history);
    const md = formatTrendsMarkdown(report);

    expect(md).toContain("Review Trends");
    expect(md).toContain("Total reviews");
    expect(md).toContain("Category Distribution");
    expect(md).toContain("AI vs Static");
    expect(md).toContain("ci-weakening");
  });

  it("handles empty history gracefully", () => {
    const report = computeTrends([]);
    const md = formatTrendsMarkdown(report);
    expect(md).toContain("Review Trends");
    expect(md).toContain("| Total reviews | 0 |");
  });
});

describe("formatTrendsJson", () => {
  it("produces valid JSON", () => {
    const history = [
      makeHistoryEntry("2026-07-01", [
        { ...baseFinding, id: "1", severity: "high", category: "x", title: "a" },
      ]),
    ];
    const report = computeTrends(history);
    const json = formatTrendsJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.totalReviews).toBe(1);
    expect(parsed.categoryDistribution.x).toBe(1);
  });
});
