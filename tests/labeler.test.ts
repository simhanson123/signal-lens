import { describe, expect, it, vi } from "vitest";
import { computeLabels, applyLabels, LABELS } from "../src/github/labeler.js";
import type { ReviewResult } from "../src/core/types.js";

function makeResult(findings: ReviewResult["findings"]): ReviewResult {
  return {
    version: "2.2.0",
    generatedAt: "2026-07-01T00:00:00Z",
    base: "main",
    head: "HEAD",
    summary: { purpose: "", scope: "", riskFiles: [], categories: { code: 0, test: 0, docs: 0, ci: 0, dependency: 0, "security-sensitive": 0 } },
    findings,
  };
}

describe("computeLabels", () => {
  it("labels blocker findings", () => {
    const result = makeResult([
      { id: "1", severity: "blocker", category: "injection", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    expect(computeLabels(result)).toContain(LABELS.blocker);
  });

  it("labels security findings (security-boundary + injection)", () => {
    const result = makeResult([
      { id: "1", severity: "high", category: "security-boundary", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
      { id: "2", severity: "high", category: "injection", title: "y", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    const labels = computeLabels(result);
    expect(labels).toContain(LABELS.security);
  });

  it("labels ci-weakening findings", () => {
    const result = makeResult([
      { id: "1", severity: "medium", category: "ci-weakening", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    expect(computeLabels(result)).toContain(LABELS.ci);
  });

  it("labels test-coverage findings", () => {
    const result = makeResult([
      { id: "1", severity: "low", category: "test-coverage", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    expect(computeLabels(result)).toContain(LABELS.testGap);
  });

  it("labels custom-rule findings", () => {
    const result = makeResult([
      { id: "1", severity: "low", category: "custom-rule", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    expect(computeLabels(result)).toContain(LABELS.custom);
  });

  it("labels clean when no findings", () => {
    const result = makeResult([]);
    expect(computeLabels(result)).toEqual([LABELS.clean]);
  });

  it("combines multiple labels", () => {
    const result = makeResult([
      { id: "1", severity: "blocker", category: "security-boundary", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
      { id: "2", severity: "high", category: "ci-weakening", title: "y", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
      { id: "3", severity: "medium", category: "test-coverage", title: "z", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    const labels = computeLabels(result);
    expect(labels).toContain(LABELS.blocker);
    expect(labels).toContain(LABELS.security);
    expect(labels).toContain(LABELS.ci);
    expect(labels).toContain(LABELS.testGap);
  });
});

describe("applyLabels", () => {
  it("removes stale and adds new labels", async () => {
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [
        { name: "signal-lens:clean" },
        { name: "signal-lens:ci" },
        { name: "bug" },
      ],
    });
    const removeLabel = vi.fn().mockResolvedValue({});
    const addLabels = vi.fn().mockResolvedValue({});

    const mockOctokit = {
      issues: { listLabelsOnIssue, removeLabel, addLabels },
    } as unknown as import("@octokit/rest").Octokit;

    const newLabels = [LABELS.blocker, LABELS.security];
    await applyLabels(mockOctokit, "owner", "repo", 42, newLabels);

    // Should remove stale signal-lens labels
    expect(removeLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "signal-lens:clean" })
    );
    expect(removeLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "signal-lens:ci" })
    );
    // Should NOT remove non-signal-lens labels
    expect(removeLabel).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "bug" })
    );
    // Should add both new labels (neither exists yet)
    expect(addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: newLabels })
    );
  });

  it("only adds labels not already present", async () => {
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [{ name: "signal-lens:security" }],
    });
    const removeLabel = vi.fn().mockResolvedValue({});
    const addLabels = vi.fn().mockResolvedValue({});

    const mockOctokit = {
      issues: { listLabelsOnIssue, removeLabel, addLabels },
    } as unknown as import("@octokit/rest").Octokit;

    await applyLabels(mockOctokit, "owner", "repo", 42, [LABELS.security, LABELS.blocker]);

    // Should only add blocker (security already exists)
    expect(addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: [LABELS.blocker] })
    );
  });
});
