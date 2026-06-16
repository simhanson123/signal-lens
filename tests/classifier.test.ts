import { describe, expect, it } from "vitest";
import { classifyFile, buildReviewSummary } from "../src/core/classifier.js";
import type { DiffContext } from "../src/core/types.js";

describe("classifyFile", () => {
  it("classifies CI files", () => {
    expect(classifyFile(".github/workflows/ci.yml")).toBe("ci");
  });

  it("classifies test files", () => {
    expect(classifyFile("src/utils.test.ts")).toBe("test");
    expect(classifyFile("tests/integration/api.spec.ts")).toBe("test");
  });

  it("classifies dependency files", () => {
    expect(classifyFile("package.json")).toBe("dependency");
  });

  it("classifies security-sensitive paths", () => {
    expect(classifyFile("src/auth/middleware.ts")).toBe("security-sensitive");
  });

  it("defaults to code", () => {
    expect(classifyFile("src/index.ts")).toBe("code");
  });
});

describe("buildReviewSummary", () => {
  it("identifies risk files and purpose", () => {
    const context: DiffContext = {
      base: "main",
      head: "HEAD",
      repoRoot: "/repo",
      changedFiles: [
        { path: ".github/workflows/ci.yml", status: "modified", category: "ci", additions: 2, deletions: 1 },
        { path: "src/app.ts", status: "modified", category: "code", additions: 50, deletions: 10 },
      ],
      diff: "",
      summary: "2 files changed",
    };

    const summary = buildReviewSummary(context);

    expect(summary.riskFiles).toContain(".github/workflows/ci.yml");
    expect(summary.purpose).toContain("CI/workflow changes");
  });
});