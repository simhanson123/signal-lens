import { describe, expect, it } from "vitest";
import { ciWeakeningAnalyzer } from "../src/analyzers/ci-weakening.js";
import { securityBoundaryAnalyzer } from "../src/analyzers/security-boundary.js";
import type { DiffContext } from "../src/core/types.js";

function makeContext(diff: string, files: string[]): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: process.cwd(),
    changedFiles: files.map((path) => ({
      path,
      status: "modified" as const,
      category: path.includes(".github") ? "ci" : "code",
      additions: 5,
      deletions: 1,
    })),
    diff,
    summary: "test",
  };
}

describe("ciWeakeningAnalyzer", () => {
  it("detects continue-on-error in workflow", async () => {
    const diff = `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -10,0 +11,1 @@
+      continue-on-error: true
`;
    const findings = await ciWeakeningAnalyzer.analyze(
      makeContext(diff, [".github/workflows/ci.yml"])
    );

    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].category).toBe("ci-weakening");
    expect(findings[0].severity).toBe("high");
  });

  it("detects removed test command", async () => {
    const diff = `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -10,1 +10,0 @@
-      run: npm test
`;
    const findings = await ciWeakeningAnalyzer.analyze(
      makeContext(diff, [".github/workflows/ci.yml"])
    );

    expect(findings.some((f) => f.title.includes("Test command removed"))).toBe(true);
  });
});

describe("securityBoundaryAnalyzer", () => {
  it("detects untrusted GitHub event content in workflow", async () => {
    const diff = `diff --git a/.github/workflows/review.yml b/.github/workflows/review.yml
+++ b/.github/workflows/review.yml
@@ -5,0 +6,1 @@
+        run: echo "\${{ github.event.pull_request.body }}"
`;
    const findings = await securityBoundaryAnalyzer.analyze(
      makeContext(diff, [".github/workflows/review.yml"])
    );

    expect(findings.some((f) => f.severity === "blocker")).toBe(true);
  });

  it("detects hardcoded secrets", async () => {
    const diff = `diff --git a/src/config.ts b/src/config.ts
+++ b/src/config.ts
@@ -1,0 +2,1 @@
+const api_key = "sk-live-abc123secret"
`;
    const findings = await securityBoundaryAnalyzer.analyze(
      makeContext(diff, ["src/config.ts"])
    );

    expect(findings.some((f) => f.title.includes("hardcoded secret"))).toBe(true);
  });
});