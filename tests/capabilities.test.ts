import { describe, expect, it } from "vitest";
import { buildCapabilitiesReport, MCP_TOOLS } from "../src/capabilities.js";

describe("buildCapabilitiesReport", () => {
  it("reports CLI availability and routing hints", () => {
    const report = buildCapabilitiesReport(process.cwd());

    expect(report.cli.isGitRepo).toBe(true);
    expect(report.cli.available).toBe(true);
    expect(report.mcp.tools).toEqual(MCP_TOOLS);
    expect(report.routing.prefer).toBe("mcp-when-connected");
    expect(report.routing.forAgent).toContain("review_pr");
    expect(report.providers.length).toBeGreaterThan(0);
  });
});