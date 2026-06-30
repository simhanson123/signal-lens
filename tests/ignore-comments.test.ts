import { describe, expect, it } from "vitest";
import { parseIgnoreComments, filterByIgnoreComments } from "../src/core/ignore-comments.js";
import type { Evidence, Finding } from "../src/core/types.js";

function makeFinding(file: string, line?: number, id = "test-1"): Finding {
  const evidence: Evidence[] = [{ file }];
  if (line != null) evidence[0].line = line;
  return {
    id,
    severity: "high",
    category: "test",
    title: "Test finding",
    reason: "reason",
    evidence,
    suggestedAction: "fix it",
    confidence: 0.8,
  };
}

describe("parseIgnoreComments", () => {
  it("detects signal-lens-ignore-next-line for the next line", () => {
    const diff = `+++ b/src/config.ts
@@ -1,3 +1,5 @@
 const existing = 1;
+const apiKey = getApiKey();
+// signal-lens-ignore-next-line
+const token = getToken();`;
    const result = parseIgnoreComments(diff);
    expect(result.lineSuppressions.has("src/config.ts:4")).toBe(true);
    expect(result.lineSuppressions.has("src/config.ts:2")).toBe(false);
  });

  it("supports hash-style comments", () => {
    const diff = `+++ b/script.py
@@ -1,2 +1,4 @@
 x = 1
+# signal-lens-ignore-next-line
+y = 2`;
    const result = parseIgnoreComments(diff);
    expect(result.lineSuppressions.has("script.py:3")).toBe(true);
  });

  it("supports block-style comments", () => {
    const diff = `+++ b/style.css
@@ -1,2 +1,4 @@
 a {}
+/* signal-lens-ignore-next-line */
+b {}`;
    const result = parseIgnoreComments(diff);
    expect(result.lineSuppressions.has("style.css:3")).toBe(true);
  });

  it("supports signal-lens-disable-next-line variant", () => {
    const diff = `+++ b/app.ts
@@ -1,2 +1,4 @@
 a
+// signal-lens-disable-next-line
+b`;
    const result = parseIgnoreComments(diff);
    expect(result.lineSuppressions.has("app.ts:3")).toBe(true);
  });

  it("supports file-level signal-lens-disable", () => {
    const diff = `+++ b/generated.ts
@@ -1,1 +1,3 @@
+// signal-lens-disable
 const a = 1;
+const b = 2;`;
    const result = parseIgnoreComments(diff);
    expect(result.disabledFiles.has("generated.ts")).toBe(true);
  });

  it("re-enables with signal-lens-enable", () => {
    const diff = `+++ b/mixed.ts
@@ -1,1 +1,5 @@
+// signal-lens-disable
+const a = 1;
+// signal-lens-enable
+const b = 2;`;
    const result = parseIgnoreComments(diff);
    expect(result.disabledFiles.has("mixed.ts")).toBe(false);
    expect(result.lineSuppressions.has("mixed.ts:2")).toBe(true);
    expect(result.lineSuppressions.has("mixed.ts:4")).toBe(false);
  });

  it("returns empty sets for clean diffs", () => {
    const diff = `+++ b/clean.ts
@@ -1,1 +1,2 @@
 const a = 1;
+const b = 2;`;
    const result = parseIgnoreComments(diff);
    expect(result.lineSuppressions.size).toBe(0);
    expect(result.disabledFiles.size).toBe(0);
  });
});

describe("filterByIgnoreComments", () => {
  it("suppresses findings with matching file:line", () => {
    const diff = `+++ b/src/config.ts
@@ -1,2 +1,4 @@
 const existing = 1;
+const apiKey = getApiKey();
+// signal-lens-ignore-next-line
+const token = getToken();`;
    const findings = [
      makeFinding("src/config.ts", 4, "f1"),
      makeFinding("src/config.ts", 2, "f2"),
    ];
    const filtered = filterByIgnoreComments(findings, diff);
    expect(filtered.some((f) => f.id === "f1")).toBe(false);
    expect(filtered.some((f) => f.id === "f2")).toBe(true);
  });

  it("suppresses all findings in disabled files", () => {
    const diff = `+++ b/generated.ts
@@ -1,1 +1,3 @@
+// signal-lens-disable
 const a = 1;
+const b = 2;`;
    const findings = [
      makeFinding("generated.ts", 2, "f1"),
      makeFinding("other.ts", 1, "f2"),
    ];
    const filtered = filterByIgnoreComments(findings, diff);
    expect(filtered.some((f) => f.id === "f1")).toBe(false);
    expect(filtered.some((f) => f.id === "f2")).toBe(true);
  });

  it("does not suppress findings without line numbers unless file is disabled", () => {
    const diff = `+++ b/code.ts
@@ -1,1 +1,3 @@
 const a = 1;
+const b = 2;
+// signal-lens-ignore-next-line`;
    const findings = [makeFinding("code.ts", undefined, "f1")];
    const filtered = filterByIgnoreComments(findings, diff);
    expect(filtered.some((f) => f.id === "f1")).toBe(true);
  });

  it("passes through findings with no evidence", () => {
    const diff = `+++ b/code.ts
@@ -1,1 +1,2 @@
+// signal-lens-disable
 const a = 1;`;
    const findings = [
      { ...makeFinding("other.ts", 1, "f1"), evidence: [] },
    ] as Finding[];
    const filtered = filterByIgnoreComments(findings, diff);
    expect(filtered.some((f) => f.id === "f1")).toBe(true);
  });
});
