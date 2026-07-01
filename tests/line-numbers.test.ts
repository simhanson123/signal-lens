import { describe, expect, it } from "vitest";
import { securityBoundaryAnalyzer } from "../src/analyzers/security-boundary.js";
import { ciWeakeningAnalyzer } from "../src/analyzers/ci-weakening.js";
import { injectionAnalyzer } from "../src/analyzers/injection.js";
import { secretEntropyAnalyzer } from "../src/analyzers/secret-entropy.js";
import { createCustomRulesAnalyzer } from "../src/analyzers/custom-rules.js";
import type { DiffContext } from "../src/core/types.js";

function makeContext(diff: string, files: Array<{ path: string; category: string }>): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: ".",
    changedFiles: files.map((f) => ({
      path: f.path,
      status: "modified" as const,
      category: f.category as DiffContext["changedFiles"][0]["category"],
      additions: 1,
      deletions: 0,
    })),
    diff,
    summary: "test",
  };
}

describe("line numbers in evidence", () => {
  it("ci-weakening includes line number for added lines", async () => {
    const diff = `+++ b/.github/workflows/ci.yml
@@ -10,0 +11,1 @@
+      continue-on-error: true`;
    const findings = await ciWeakeningAnalyzer.analyze(
      makeContext(diff, [{ path: ".github/workflows/ci.yml", category: "ci" }])
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].evidence[0].line).toBe(11);
  });

  it("security-boundary includes line number", async () => {
    const diff = `+++ b/.github/workflows/review.yml
@@ -5,0 +6,1 @@
+        run: echo "\${{ github.event.pull_request.body }}"`;
    const findings = await securityBoundaryAnalyzer.analyze(
      makeContext(diff, [{ path: ".github/workflows/review.yml", category: "ci" }])
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].evidence[0].line).toBe(6);
  });

  it("injection includes line number", async () => {
    const diff = `+++ b/run.ts
@@ -1,0 +2,1 @@
+execSync(\`ls \${req.query.dir}\`);`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff, [{ path: "run.ts", category: "code" }]));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].evidence[0].line).toBe(2);
  });

  it("secret-entropy includes line number", async () => {
    const diff = `+++ b/config.ts
@@ -8,0 +9,1 @@
+const apiKey = "sk-proj-AbC123xYz789dEf456gHi012abc";`;
    const findings = await secretEntropyAnalyzer.analyze(
      makeContext(diff, [{ path: "config.ts", category: "code" }])
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].evidence[0].line).toBe(9);
  });

  it("custom-rules includes line number", async () => {
    const analyzer = createCustomRulesAnalyzer([
      { id: "no-console", pattern: "console\\.log", severity: "low", message: "No console.log" },
    ]);
    const diff = `+++ b/src/app.ts
@@ -3,0 +4,1 @@
+console.log("hello");`;
    const findings = await analyzer.analyze(makeContext(diff, [{ path: "src/app.ts", category: "code" }]));
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence[0].line).toBe(4);
  });

  it("line-level ignore suppression works with line numbers", async () => {
    const { filterByIgnoreComments } = await import("../src/core/ignore-comments.js");
    const diff = `+++ b/.github/workflows/ci.yml
@@ -10,0 +11,2 @@
+// signal-lens-ignore-next-line
+      continue-on-error: true`;
    const findings = await ciWeakeningAnalyzer.analyze(
      makeContext(diff, [{ path: ".github/workflows/ci.yml", category: "ci" }])
    );
    expect(findings.length).toBeGreaterThan(0);
    const filtered = filterByIgnoreComments(findings, diff);
    expect(filtered).toHaveLength(0);
  });
});
