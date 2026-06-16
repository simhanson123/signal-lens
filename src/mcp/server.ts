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
import { runReview } from "../orchestrator/review.js";

export async function startMcpServer(repoRoot = process.cwd()): Promise<void> {
  const config = loadConfig(repoRoot);

  const server = new McpServer({
    name: "review-mcp",
    version: "0.2.0",
  });

  server.resource(
    "repo-summary",
    "repo://summary",
    async () => ({
      contents: [
        {
          uri: "repo://summary",
          mimeType: "application/json",
          text: JSON.stringify(buildRepoSummary(repoRoot, config), null, 2),
        },
      ],
    })
  );

  server.resource(
    "architecture-rules",
    "repo://architecture/rules",
    async () => ({
      contents: [
        {
          uri: "repo://architecture/rules",
          mimeType: "application/json",
          text: JSON.stringify({ rules: config.rules.architecture }, null, 2),
        },
      ],
    })
  );

  server.resource(
    "symbol-lookup",
    "repo://symbols/{name}",
    async (uri) => {
      const name = decodeURIComponent(uri.pathname.replace(/^\//, ""));
      const resource = getSymbolResource(repoRoot, name);
      return {
        contents: [
          {
            uri: `repo://symbols/${name}`,
            mimeType: "application/json",
            text: JSON.stringify(resource, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "review_pr",
    "Review a PR diff between base and head refs with structured findings",
    {
      base: z.string().describe("Base git ref"),
      head: z.string().describe("Head git ref"),
      format: z.enum(["json", "markdown", "sarif"]).optional(),
    },
    async ({ base, head, format }) => {
      const result = await runReview({ base, head, repoRoot });
      const output =
        format === "sarif"
          ? toSarif(result)
          : format === "markdown"
            ? toMarkdown(result)
            : toJson(result);

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );

  server.tool(
    "scan_ci_weakening",
    "Detect CI, test, coverage, and lint gate weakening in a diff",
    { base: z.string(), head: z.string() },
    async ({ base, head }) => {
      const context = collectDiff({ base, head, repoRoot });
      const findings = await ciWeakeningAnalyzer.analyze(context);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }],
      };
    }
  );

  server.tool(
    "find_duplicate_utility",
    "Find new symbols that may duplicate existing utilities",
    { base: z.string(), head: z.string() },
    async ({ base, head }) => {
      const context = collectDiff({ base, head, repoRoot });
      const findings = await duplicateUtilityAnalyzer.analyze(context);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }],
      };
    }
  );

  server.tool(
    "trace_security_boundary",
    "Analyze security boundary regressions in a diff",
    { base: z.string(), head: z.string() },
    async ({ base, head }) => {
      const context = collectDiff({ base, head, repoRoot });
      const findings = await securityBoundaryAnalyzer.analyze(context);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(findings, null, 2) }],
      };
    }
  );

  server.prompt(
    "strict_pr_review",
    "Review only merge-blocking issues with evidence",
    { base: z.string(), head: z.string() },
    async ({ base, head }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Perform a strict maintainer PR review between ${base} and ${head}. Report only blocker and high severity issues with file-level evidence. Ignore style nitpicks.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "security_boundary_review",
    "Focus on auth, permissions, secrets, and workflow injection risks",
    { base: z.string(), head: z.string() },
    async ({ base, head }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Review security boundaries for diff ${base}...${head}. Check untrusted input in workflows, secret exposure, permission scope, and auth bypass patterns.`,
          },
        },
      ],
    })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  startMcpServer(process.cwd()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}