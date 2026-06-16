import { describe, expect, it } from "vitest";
import { testCoverageAnalyzer } from "../src/analyzers/test-coverage.js";
import type { DiffContext } from "../src/core/types.js";

function makeContext(overrides: Partial<DiffContext>): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: process.cwd(),
    changedFiles: [],
    diff: "",
    summary: "",
    ...overrides,
  };
}

describe("testCoverageAnalyzer", () => {
  it("flags source changes without test file updates", async () => {
    const findings = await testCoverageAnalyzer.analyze(
      makeContext({
        changedFiles: [
          { path: "src/utils.ts", status: "modified", category: "code", additions: 10, deletions: 2 },
        ],
        diff: "+++ b/src/utils.ts\n+export function helper() {}",
      })
    );

    expect(findings.some((f) => f.id === "test-missing-files")).toBe(true);
    expect(findings[0].severity).toBe("medium");
  });

  it("passes when test files are also changed", async () => {
    const findings = await testCoverageAnalyzer.analyze(
      makeContext({
        changedFiles: [
          { path: "src/utils.ts", status: "modified", category: "code", additions: 10, deletions: 2 },
          { path: "tests/utils.test.ts", status: "modified", category: "test", additions: 5, deletions: 0 },
        ],
        diff: "+++ b/src/utils.ts\n+export function helper() {}",
      })
    );

    expect(findings.filter((f) => f.id === "test-missing-files")).toHaveLength(0);
  });

  it("flags new exported functions without test changes", async () => {
    const findings = await testCoverageAnalyzer.analyze(
      makeContext({
        changedFiles: [
          { path: "src/parser.ts", status: "modified", category: "code", additions: 8, deletions: 0 },
        ],
        diff: [
          "+++ b/src/parser.ts",
          "+export function parseInput(data: string) {",
          "+  return data.trim();",
          "+}",
        ].join("\n"),
      })
    );

    expect(findings.some((f) => f.title.includes("parseInput"))).toBe(true);
  });
});