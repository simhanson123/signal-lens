import { describe, expect, it } from "vitest";
import { toWalkthrough } from "../src/core/walkthrough.js";
import type { ChangedFile, Finding, ReviewResult } from "../src/core/types.js";

function makeResult(opts: {
  findings?: Finding[];
  changedFiles?: ChangedFile[];
}): ReviewResult {
  return {
    version: "2.1.0",
    generatedAt: "2026-06-30T00:00:00Z",
    base: "main",
    head: "HEAD",
    summary: {
      purpose: "test",
      scope: "test scope",
      riskFiles: [],
      categories: { code: 0, test: 0, docs: 0, ci: 0, dependency: 0, "security-sensitive": 0 },
    },
    findings: opts.findings ?? [],
    changedFiles: opts.changedFiles,
    metadata: {
      analyzerCount: 5,
      durationMs: 100,
      aiReview: "completed",
      staticOnly: false,
      repoContextUsed: true,
    },
  };
}

describe("toWalkthrough", () => {
  it("generates a summary with file counts and additions/deletions", () => {
    const result = makeResult({
      changedFiles: [
        { path: "src/a.ts", status: "modified", category: "code", additions: 10, deletions: 2 },
        { path: "src/b.ts", status: "added", category: "code", additions: 30, deletions: 0 },
      ],
    });

    const md = toWalkthrough(result);
    expect(md).toContain("2 file(s) changed");
    expect(md).toContain("+40");
    expect(md).toContain("−2");
  });

  it("shows minimal risk when no findings", () => {
    const md = toWalkthrough(makeResult({}));
    expect(md).toContain("Minimal");
    expect(md).toContain("🟢");
  });

  it("shows high risk when blocker present", () => {
    const result = makeResult({
      findings: [
        { id: "x", severity: "blocker", category: "ci-weakening", title: "Test removed", reason: "r", evidence: [{ file: "ci.yml" }], suggestedAction: "fix", confidence: 0.9 },
      ],
    });
    const md = toWalkthrough(result);
    expect(md).toContain("High");
    expect(md).toContain("🛑");
    expect(md).toContain("1 blocker");
  });

  it("groups files by category", () => {
    const result = makeResult({
      changedFiles: [
        { path: "src/a.ts", status: "modified", category: "code", additions: 5, deletions: 0 },
        { path: "tests/a.test.ts", status: "modified", category: "test", additions: 3, deletions: 0 },
        { path: ".github/workflows/ci.yml", status: "modified", category: "ci", additions: 1, deletions: 1 },
      ],
    });

    const md = toWalkthrough(result);
    expect(md).toContain("**code**");
    expect(md).toContain("**test**");
    expect(md).toContain("**ci**");
  });

  it("lists key findings (blocker + high only)", () => {
    const result = makeResult({
      findings: [
        { id: "1", severity: "blocker", category: "sec", title: "Blocker issue", reason: "r", evidence: [{ file: "a.ts", line: 10 }], suggestedAction: "fix", confidence: 0.9 },
        { id: "2", severity: "high", category: "sec", title: "High issue", reason: "r", evidence: [{ file: "b.ts" }], suggestedAction: "fix", confidence: 0.8 },
        { id: "3", severity: "low", category: "sec", title: "Low issue", reason: "r", evidence: [], suggestedAction: "fix", confidence: 0.5 },
      ],
    });

    const md = toWalkthrough(result);
    expect(md).toContain("Blocker issue");
    expect(md).toContain("High issue");
    expect(md).not.toContain("Low issue");
    expect(md).toContain("1 additional medium/low finding");
  });

  it("truncates file list when more than 8 per category", () => {
    const files: ChangedFile[] = [];
    for (let i = 0; i < 10; i++) {
      files.push({ path: `src/file${i}.ts`, status: "modified" as const, category: "code" as const, additions: 1, deletions: 0 });
    }
    const md = toWalkthrough(makeResult({ changedFiles: files }));
    expect(md).toContain("and 2 more");
  });
});
