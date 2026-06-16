import { describe, expect, it } from "vitest";
import { toMarkdown, toJson } from "../src/core/reporter.js";
import type { ReviewResult } from "../src/core/types.js";

const sampleResult: ReviewResult = {
  version: "0.1.0",
  generatedAt: "2026-06-16T00:00:00.000Z",
  base: "main",
  head: "feature/test",
  summary: {
    purpose: "CI/workflow changes",
    scope: "1 file changed",
    riskFiles: [".github/workflows/ci.yml"],
    categories: { code: 0, test: 0, docs: 0, ci: 1, dependency: 0, "security-sensitive": 0 },
  },
  findings: [
    {
      id: "ci-1",
      severity: "high",
      category: "ci-weakening",
      title: "CI step set to continue on error",
      reason: "Test reason",
      evidence: [{ file: ".github/workflows/ci.yml", snippet: "continue-on-error: true" }],
      suggestedAction: "Remove continue-on-error",
      confidence: 0.85,
    },
  ],
  metadata: {
    analyzerCount: 3,
    durationMs: 42,
    aiReview: "skipped",
    aiSkipReason: "OPENAI_API_KEY is not set",
    staticOnly: true,
  },
};

describe("reporter", () => {
  it("generates markdown report", () => {
    const md = toMarkdown(sampleResult);
    expect(md).toContain("## review-mcp Report");
    expect(md).toContain("CI step set to continue on error");
    expect(md).toContain("🔴 HIGH");
  });

  it("generates JSON report", () => {
    const json = toJson(sampleResult);
    const parsed = JSON.parse(json);
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.version).toBe("0.1.0");
  });
});