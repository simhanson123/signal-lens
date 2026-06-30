import { describe, expect, it } from "vitest";
import { createCustomRulesAnalyzer } from "../src/analyzers/custom-rules.js";
import type { DiffContext } from "../src/core/types.js";

function makeContext(diff: string): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: ".",
    changedFiles: [],
    diff,
    summary: "",
  };
}

describe("custom-rules analyzer", () => {
  it("detects matching pattern in added lines", async () => {
    const analyzer = createCustomRulesAnalyzer([
      { id: "no-console", pattern: "console\\.log", severity: "low", message: "No console.log" },
    ]);

    const diff = `+++ b/src/app.ts
+console.log("hello");
+const x = 1;`;

    const findings = await analyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("low");
    expect(findings[0].title).toBe("No console.log");
    expect(findings[0].evidence[0].file).toBe("src/app.ts");
  });

  it("respects path filters", async () => {
    const analyzer = createCustomRulesAnalyzer([
      {
        id: "src-only",
        pattern: "TODO",
        severity: "low",
        message: "TODO found",
        paths: ["src/**/*.ts"],
      },
    ]);

    const diff = `+++ b/src/file.ts
+// TODO: fix this
+++ b/docs/readme.md
+TODO list`;

    const findings = await analyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence[0].file).toBe("src/file.ts");
  });

  it("produces stable IDs across runs", async () => {
    const analyzer = createCustomRulesAnalyzer([
      { id: "test-rule", pattern: "evil\\(\\)", severity: "high", message: "evil detected" },
    ]);

    const diff = `+++ b/code.ts
+evil()`;

    const findings1 = await analyzer.analyze(makeContext(diff));
    const findings2 = await analyzer.analyze(makeContext(diff));
    expect(findings1[0].id).toBe(findings2[0].id);
  });

  it("returns no findings for empty rules", async () => {
    const analyzer = createCustomRulesAnalyzer([]);
    const findings = await analyzer.analyze(makeContext("+++ b/x.ts\n+anything"));
    expect(findings).toHaveLength(0);
  });

  it("supports multiple rules", async () => {
    const analyzer = createCustomRulesAnalyzer([
      { id: "rule-a", pattern: "foo", severity: "low", message: "Found foo" },
      { id: "rule-b", pattern: "bar", severity: "high", message: "Found bar" },
    ]);

    const diff = `+++ b/x.ts
+foo()
+bar()`;

    const findings = await analyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(2);
  });

  it("does not match removed lines", async () => {
    const analyzer = createCustomRulesAnalyzer([
      { id: "added-only", pattern: "debugger", severity: "high", message: "No debugger" },
    ]);

    const diff = `+++ b/x.ts
+const x = 1;
-debugger`;

    const findings = await analyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });
});
