#!/usr/bin/env node

import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { writeOutput } from "./core/reporter.js";
import { indexRepository } from "./indexer/symbols.js";
import { buildRepoSummary } from "./indexer/repo-summary.js";
import { loadConfig } from "./config/loader.js";
import { startMcpServer } from "./mcp/server.js";
import { runReview } from "./orchestrator/review.js";

const program = new Command();

program
  .name("review-mcp")
  .description("MCP-based AI PR review and maintainer automation agent")
  .version("0.2.0");

program
  .command("review")
  .description("Review changes between base and head refs")
  .requiredOption("--base <ref>", "Base git ref (e.g. main)")
  .requiredOption("--head <ref>", "Head git ref (e.g. HEAD or feature-branch)")
  .option("--repo <path>", "Repository root path", process.cwd())
  .option("-o, --output <format>", "Output format: markdown, json, sarif, or both", "markdown")
  .option("-f, --output-file <path>", "Write output to file")
  .option("--static-only", "Run static analyzers only, skip AI review")
  .action(async (opts) => {
    const format = opts.output as "markdown" | "json" | "sarif" | "both";
    if (!["markdown", "json", "sarif", "both"].includes(format)) {
      console.error("Invalid output format. Use: markdown, json, sarif, or both");
      process.exit(1);
    }

    try {
      const result = await runReview({
        base: opts.base,
        head: opts.head,
        repoRoot: opts.repo,
        output: format,
        outputFile: opts.outputFile,
        noAi: Boolean(opts.staticOnly),
      });

      const { markdown, json, sarif } = writeOutput(result, format, opts.outputFile);

      if (!opts.outputFile) {
        if (markdown) console.log(markdown);
        if (json && (format === "json" || format === "both")) console.log(json);
        if (sarif) console.log(sarif);
      }

      const hasBlocker = result.findings.some((f) => f.severity === "blocker");
      process.exit(hasBlocker ? 1 : 0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    }
  });

program
  .command("index")
  .description("Index repository symbols for context-aware review")
  .option("--repo <path>", "Repository root path", process.cwd())
  .option("-o, --output-file <path>", "Write symbol index to JSON file")
  .action((opts) => {
    const config = loadConfig(opts.repo);
    const symbols = indexRepository(opts.repo);
    const summary = buildRepoSummary(opts.repo, config);
    const payload = { summary, symbols, count: symbols.length };

    const json = JSON.stringify(payload, null, 2);
    if (opts.outputFile) {
      writeFileSync(opts.outputFile, json, "utf-8");
      console.log(`Indexed ${symbols.length} symbols → ${opts.outputFile}`);
    } else {
      console.log(json);
    }
  });

program
  .command("mcp")
  .description("Start MCP Context Server (stdio transport)")
  .option("--repo <path>", "Repository root path", process.cwd())
  .action(async (opts) => {
    await startMcpServer(opts.repo);
  });

program.parse();