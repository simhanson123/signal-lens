import { describe, expect, it } from "vitest";
import { toSarif } from "../src/core/sarif.js";
import type { ReviewResult } from "../src/core/types.js";

const sample: ReviewResult = {
  version: "0.2.0",
  generatedAt: "2026-06-16T00:00:00.000Z",
  base: "main",
  head: "feature",
  summary: {
    purpose: "test",
    scope: "1 file",
    riskFiles: [],
    categories: { code: 1, test: 0, docs: 0, ci: 0, dependency: 0, "security-sensitive": 0 },
  },
  findings: [
    {
      id: "sec-1",
      severity: "blocker",
      category: "security-boundary",
      title: "Hardcoded secret",
      reason: "test",
      evidence: [{ file: "src/config.ts", line: 5 }],
      suggestedAction: "Remove secret",
      confidence: 0.9,
    },
  ],
  metadata: {
    analyzerCount: 3,
    durationMs: 10,
    aiReview: "skipped",
    aiSkipReason: "OPENAI_API_KEY is not set",
    staticOnly: true,
  },
};

describe("toSarif", () => {
  it("produces valid SARIF 2.1.0 output", () => {
    const sarif = JSON.parse(toSarif(sample));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.name).toBe("review-mcp");
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].level).toBe("error");
  });
});