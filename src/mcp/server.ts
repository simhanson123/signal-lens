#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ciWeakeningAnalyzer } from "../analyzers/ci-weakening.js";
import { duplicateUtilityAnalyzer } from "../analyzers/duplicate-utility.js";
import { securityBoundaryAnalyzer } from "../analyzers/security-boundary.js";
import { loadConfig } from "../config/loader.js";
import { collectDiff } from "../core/collector.js";
import { toJson, toMarkdown } from "../core/reporter.js";
import { toSarif } from "../core/sarif.js";
import { buildRepoSummary, getSymbolResource } from "../indexer/repo-summary.js";
import { recordFeedback } from "../memory/feedback.js";
import { loadReviewHistory } from "../memory/history.js";
import { draftReleaseNotes, getCurrentReleaseState, listMergedPrs } from "../release/assistant.js";
import { runReview } from "../orchestrator/review.js";

export async function startMcpServer(repoRoot = process.cwd()): Promise<void> {
  const config = loadConfig(repoRoot);
  const server = new McpServer({ name: "review-mcp", version: "1.0.0" });

  server.resource("repo-summary", "repo://summary", async () => ({
    contents: [{ uri: "repo://summary", mimeType: "application/json", text: JSON.stringify(buildRepoSummary(repoRoot, config), null, 2) }],
  }));

  server.resource("architecture-rules", "repo://architecture/rules", async () => ({
    contents: [{ uri: "repo://architecture/rules", mimeType: "application/json", text: JSON.stringify({ rules: config.rules.architecture }, null, 2) }],
  }));

  server.resource("symbol-lookup", "repo://symbols/{name}", async (uri) => {
    const name = decodeURIComponent(uri.pathname.replace(/^\//, ""));
    return {
      contents: [{ uri: `repo://symbols/${name}`, mimeType: "application/json", text: JSON.stringify(getSymbolResource(repoRoot, name), null, 2) }],
    };
  });

  server.resource("review-history", "repo://reviews/history", async () => ({
    contents: [{ uri: "repo://reviews/history", mimeType: "application/json", text: JSON.stringify(loadReviewHistory(repoRoot, 20), null, 2) }],
  }));

  server.resource("release-current", "repo://release/current", async () => {
    const state = getCurrentReleaseState(repoRoot);
    const prs = listMergedPrs(repoRoot);
    const draft = draftReleaseNotes("unreleased", prs);
    return {
      contents: [{
        uri: "repo://release/current",
        mimeType: "application/json",
        text: JSON.stringify({ ...state, draft }, null, 2),
      }],
    };
  });

  server.tool("review_pr", "Review PR diff with structured findings", {
    base: z.string(), head: z.string(), format: z.enum(["json", "markdown", "sarif"]).optional(),
  }, async ({ base, head, format }) => {
    const result = await runReview({ base, head, repoRoot });
    const output = format === "sarif" ? toSarif(result) : format === "markdown" ? toMarkdown(result) : toJson(result);
    return { content: [{ type: "text" as const, text: output }] };
  });

  server.tool("scan_ci_weakening", "Detect CI weakening", { base: z.string(), head: z.string() }, async ({ base, head }) => {
    const findings = await ciWeakeningAnalyzer.analyze(collectDiff({ base, head, repoRoot }));
    return { content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }] };
  });

  server.tool("find_duplicate_utility", "Find duplicate utilities", { base: z.string(), head: z.string() }, async ({ base, head }) => {
    const findings = await duplicateUtilityAnalyzer.analyze(collectDiff({ base, head, repoRoot }));
    return { content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }] };
  });

  server.tool("trace_security_boundary", "Trace security boundaries", { base: z.string(), head: z.string() }, async ({ base, head }) => {
    const findings = await securityBoundaryAnalyzer.analyze(collectDiff({ base, head, repoRoot }));
    return { content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }] };
  });

  server.tool(
    "record_feedback",
    "Record false-positive or accepted finding (write — requires human approval)",
    { findingId: z.string(), type: z.enum(["false-positive", "accepted", "ignored-rule"]), reason: z.string().optional() },
    async ({ findingId, type, reason }) => {
      const entry = recordFeedback(repoRoot, { findingId, type, reason, recordedBy: "mcp" });
      return { content: [{ type: "text" as const, text: JSON.stringify({ recorded: entry, humanApprovalRequired: type !== "accepted" }, null, 2) }] };
    }
  );

  server.tool(
    "draft_release_notes",
    "Draft release notes from merged PRs",
    { version: z.string().default("unreleased") },
    async ({ version }) => {
      const draft = draftReleaseNotes(version, listMergedPrs(repoRoot));
      return { content: [{ type: "text" as const, text: draft.changelog }] };
    }
  );

  server.prompt("strict_pr_review", "Blocker/high issues only", { base: z.string(), head: z.string() }, async ({ base, head }) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text: `Strict review ${base}...${head}. Blockers/high only with evidence.` } }],
  }));

  server.prompt("maintainer_triage", "Triage issues/PRs by priority", { context: z.string() }, async ({ context }) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text: `Triage the following maintainer queue:\n${context}` } }],
  }));

  server.prompt("security_boundary_review", "Security-focused review", { base: z.string(), head: z.string() }, async ({ base, head }) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text: `Security boundary review for ${base}...${head}` } }],
  }));

  server.prompt("release_preparation", "Prepare changelog and migration notes", { version: z.string() }, async ({ version }) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text: `Prepare release ${version}: changelog, breaking changes, migration notes.` } }],
  }));

  await server.connect(new StdioServerTransport());
}