import { describe, expect, it } from "vitest";
import {
  secretEntropyAnalyzer,
  shannonEntropy,
  getAssignmentTarget,
  extractStringLiterals,
} from "../src/analyzers/secret-entropy.js";
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

describe("shannonEntropy", () => {
  it("returns 0 for empty string", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("returns low entropy for repetitive strings", () => {
    expect(shannonEntropy("aaaaaaaaaa")).toBeCloseTo(0, 1);
  });

  it("returns high entropy for random-looking strings", () => {
    expect(shannonEntropy("sk-proj-AbC123xYz789dEf456gHi")).toBeGreaterThan(4.5);
  });
});

describe("getAssignmentTarget", () => {
  it("extracts const variable name", () => {
    expect(getAssignmentTarget('const apiKey = "value"')).toBe("apiKey");
  });

  it("extracts object property name", () => {
    expect(getAssignmentTarget('secretKey: "value"')).toBe("secretKey");
  });

  it("extracts plain assignment", () => {
    expect(getAssignmentTarget('config.token = "value"')).toBe("token");
  });

  it("returns empty for no assignment", () => {
    expect(getAssignmentTarget('console.log("hello")')).toBe("");
  });
});

describe("extractStringLiterals", () => {
  it("extracts double-quoted strings", () => {
    expect(extractStringLiterals('x = "hello world"')).toContain("hello world");
  });

  it("extracts single-quoted strings", () => {
    expect(extractStringLiterals("x = 'hello world'")).toContain("hello world");
  });

  it("extracts backtick strings", () => {
    expect(extractStringLiterals("x = `hello world`")).toContain("hello world");
  });
});

describe("secretEntropyAnalyzer", () => {
  it("detects high-entropy secret in apiKey assignment", async () => {
    const diff = `+++ b/config.ts
+const apiKey = "sk-proj-AbC123xYz789dEf456gHi012";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].title).toContain("secret");
    expect(findings[0].category).toBe("secret-entropy");
  });

  it("detects secrets in object property assignment", async () => {
    const diff = `+++ b/auth.ts
+  authToken: "sk-ant-api03-T6bV8xK2nM9pQ4rS7wY1zA3cD5eF0gH6";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag low-entropy placeholder strings", async () => {
    const diff = `+++ b/config.ts
+const apiKey = "your-api-key-here";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });

  it("does not flag high-entropy strings without secret-like variable names", async () => {
    const diff = `+++ b/util.ts
+const greeting = "sk-proj-AbC123xYz789dEf456gHi012";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });

  it("does not flag short strings", async () => {
    const diff = `+++ b/config.ts
+const apiKey = "sk-ab12";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });

  it("masks the secret value in evidence", async () => {
    const diff = `+++ b/config.ts
+const apiKey = "sk-proj-AbC123xYz789dEf456gHi012";`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    const snippet = findings[0].evidence[0].snippet ?? "";
    expect(snippet).toContain("…");
    expect(snippet).not.toContain("AbC123xYz789dEf456gHi012");
  });

  it("returns no findings for clean code", async () => {
    const diff = `+++ b/clean.ts
+const count = 42;`;
    const findings = await secretEntropyAnalyzer.analyze(makeContext(diff));
    expect(findings).toHaveLength(0);
  });
});
