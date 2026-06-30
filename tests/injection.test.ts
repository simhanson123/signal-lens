import { describe, expect, it } from "vitest";
import { injectionAnalyzer } from "../src/analyzers/injection.js";
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

describe("injection analyzer", () => {
  it("detects SQL injection via template literal", async () => {
    const diff = `+++ b/db.ts
+const query = \`SELECT * FROM users WHERE id = \${userId}\`;`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.title.includes("SQL"))).toBe(true);
  });

  it("detects path traversal", async () => {
    const diff = `+++ b/files.ts
+const path = userInput + "../../../etc/passwd";`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.some((f) => f.title.includes("path traversal"))).toBe(true);
  });

  it("detects command injection", async () => {
    const diff = `+++ b/run.ts
+execSync(\`ls \${req.query.dir}\`);`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.some((f) => f.severity === "blocker")).toBe(true);
  });

  it("detects unsafe pickle", async () => {
    const diff = `+++ b/load.py
+data = pickle.loads(request.body)`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.some((f) => f.title.includes("pickle"))).toBe(true);
  });

  it("detects unsafe yaml.load", async () => {
    const diff = `+++ b/config.py
+config = yaml.load(user_input)`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.some((f) => f.title.includes("YAML"))).toBe(true);
  });

  it("does not flag safe yaml.safe_load", async () => {
    const diff = `+++ b/config.py
+config = yaml.safe_load(user_input)`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings.some((f) => f.title.includes("YAML"))).toBe(false);
  });

  it("returns no findings for clean code", async () => {
    const diff = `+++ b/clean.ts
+const x = 1 + 2;`;
    const findings = await injectionAnalyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });
});
