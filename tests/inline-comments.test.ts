import { describe, expect, it } from "vitest";
import {
  findingsWithInlineTargets,
  formatInlineComment,
  postInlineReviewComments,
} from "../src/github/inline-comments.js";
import type { Finding } from "../src/core/types.js";

const sampleFinding: Finding = {
  id: "sec-1",
  severity: "high",
  category: "security",
  title: "Unsafe eval usage",
  reason: "eval() executes arbitrary code",
  evidence: [{ file: "src/app.ts", line: 10 }],
  suggestedAction: "Use a safe parser instead",
  confidence: 0.85,
};

describe("inline-comments", () => {
  it("filters findings with file and line evidence", () => {
    const findings: Finding[] = [
      sampleFinding,
      {
        ...sampleFinding,
        id: "no-line",
        evidence: [{ file: "src/app.ts" }],
      },
      {
        ...sampleFinding,
        id: "no-file",
        evidence: [{ file: "", line: 5 }],
      },
    ];

    const targets = findingsWithInlineTargets(findings);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe("sec-1");
  });

  it("formats inline comment with severity badge and slash hint", () => {
    const body = formatInlineComment(sampleFinding);
    expect(body).toContain("**[Signal Lens HIGH]**");
    expect(body).toContain("Unsafe eval usage");
    expect(body).toContain("/signal-lens false-positive sec-1");
  });

  it("returns error when no GitHub token", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;

    const result = await postInlineReviewComments({
      owner: "acme",
      repo: "app",
      pullNumber: 1,
      commitSha: "abc123",
      findings: [sampleFinding],
    });

    expect(result.posted).toBe(0);
    expect(result.errors[0]).toContain("No GitHub token");

    if (original) process.env.GITHUB_TOKEN = original;
  });
});