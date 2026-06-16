import { describe, expect, it } from "vitest";
import { triageIssueLocally } from "../src/issue/triage.js";

describe("issue triage", () => {
  it("flags missing reproduction", () => {
    const result = triageIssueLocally({
      number: 10,
      title: "App crashes on startup",
      body: "It just crashes.",
      labels: [],
      author: "user1",
    });

    expect(result.missingReproduction).toBe(true);
    expect(result.suggestedLabels).toContain("needs-reproduction");
  });

  it("detects duplicate issues", () => {
    const existing = [{
      number: 5,
      title: "Login page crash on startup",
      body: "steps to reproduce...",
      labels: [],
      author: "user2",
    }];

    const result = triageIssueLocally({
      number: 11,
      title: "Login crash when app starts",
      body: "steps to reproduce: open app",
      labels: [],
      author: "user1",
    }, existing);

    expect(result.duplicateOf).toBe(5);
  });
});