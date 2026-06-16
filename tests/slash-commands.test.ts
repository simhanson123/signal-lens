import { describe, expect, it } from "vitest";
import { parseSlashCommand } from "../src/github/slash-commands.js";

describe("slash commands", () => {
  it("parses review command", () => {
    const parsed = parseSlashCommand("Please check\n/review-mcp explain");
    expect(parsed?.command).toBe("explain");
  });

  it("parses false-positive with args", () => {
    const parsed = parseSlashCommand("/review-mcp false-positive ci-1 flaky test");
    expect(parsed?.command).toBe("false-positive");
    expect(parsed?.args).toContain("ci-1");
  });

  it("returns null for unrelated comments", () => {
    expect(parseSlashCommand("LGTM")).toBeNull();
  });
});