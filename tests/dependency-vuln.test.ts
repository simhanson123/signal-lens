import { describe, expect, it, vi, afterEach } from "vitest";
import { dependencyVulnAnalyzer } from "../src/analyzers/dependency-vuln.js";
import type { DiffContext, ChangedFile } from "../src/core/types.js";

function makeContext(diff: string, files?: ChangedFile[]): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: ".",
    changedFiles: files ?? [],
    diff,
    summary: "",
  };
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("dependencyVulnAnalyzer", () => {
  it("parses npm dependencies from package.json diff", async () => {
    let capturedBody: unknown;
    global.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return { ok: true, status: 200, json: async () => ({ results: [{ vulns: [{ id: "GHSA-test", summary: "Test vuln", database_specific: { severity: "HIGH" } }] }] }) };
    });

    const diff = `+++ b/package.json
+    "lodash": "4.17.0",`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "package.json", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    const queries = (capturedBody as { queries: unknown[] }).queries;
    expect(queries).toHaveLength(1);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("lodash@4.17.0");
    expect(findings[0].severity).toBe("high");
  });

  it("parses pip dependencies from requirements.txt diff", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [{ id: "PYSEC-1", summary: "RCE", database_specific: { severity: "CRITICAL" } }] }] }),
    });

    const diff = `+++ b/requirements.txt
+flask==2.0.0`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "requirements.txt", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("flask@2.0.0");
    expect(findings[0].severity).toBe("blocker");
  });

  it("parses go dependencies from go.mod diff", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [{ id: "GO-1", summary: "DoS", database_specific: { severity: "MODERATE" } }] }] }),
    });

    const diff = `+++ b/go.mod
+	github.com/gin-gonic/gin v1.7.0`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "go.mod", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("github.com/gin-gonic/gin@1.7.0");
  });

  it("parses cargo dependencies from Cargo.toml diff", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [{ id: "RUSTSEC-1", summary: "UAF", database_specific: { severity: "HIGH" } }] }] }),
    });

    const diff = `+++ b/Cargo.toml
+serde = "1.0"`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "Cargo.toml", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("serde@1.0");
  });

  it("returns empty when no dependency files changed", async () => {
    global.fetch = vi.fn();

    const diff = `+++ b/src/index.ts
+const x = 1;`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "src/index.ts", status: "modified", category: "code", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns empty when OSV API fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));

    const diff = `+++ b/package.json
+    "lodash": "4.17.0",`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "package.json", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(0);
  });

  it("returns empty when no vulnerabilities found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{}] }),
    });

    const diff = `+++ b/package.json
+    "express": "4.18.0",`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "package.json", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings).toHaveLength(0);
  });

  it("includes vulnerability IDs in finding reason", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [{ id: "CVE-2021-1234", summary: "Buffer overflow" }] }] }),
    });

    const diff = `+++ b/package.json
+    "lodash": "4.17.0",`;
    const findings = await dependencyVulnAnalyzer.analyze(
      makeContext(diff, [{ path: "package.json", status: "modified", category: "dependency", additions: 1, deletions: 0 }])
    );

    expect(findings[0].reason).toContain("CVE-2021-1234");
    expect(findings[0].reason).toContain("Buffer overflow");
  });
});
