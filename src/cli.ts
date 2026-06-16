#!/usr/bin/env node

import { Command } from "commander";
import { writeOutput } from "./core/reporter.js";
import { runReview } from "./orchestrator/review.js";

const program = new Command();

program
  .name("review-mcp")
  .description("MCP-based AI PR review and maintainer automation agent")
  .version("0.1.0");

program
  .command("review")
  .description("Review changes between base and head refs")
  .requiredOption("--base <ref>", "Base git ref (e.g. main)")
  .requiredOption("--head <ref>", "Head git ref (e.g. HEAD or feature-branch)")
  .option("--repo <path>", "Repository root path", process.cwd())
  .option("-o, --output <format>", "Output format: markdown, json, or both", "markdown")
  .option("-f, --output-file <path>", "Write output to file")
  .action(async (opts) => {
    const format = opts.output as "markdown" | "json" | "both";
    if (!["markdown", "json", "both"].includes(format)) {
      console.error("Invalid output format. Use: markdown, json, or both");
      process.exit(1);
    }

    try {
      const result = await runReview({
        base: opts.base,
        head: opts.head,
        repoRoot: opts.repo,
        output: format,
        outputFile: opts.outputFile,
      });

      const { markdown, json } = writeOutput(result, format, opts.outputFile);

      if (!opts.outputFile) {
        if (markdown) console.log(markdown);
        if (json && format !== "markdown") console.log(json);
      }

      const hasBlocker = result.findings.some((f) => f.severity === "blocker");
      process.exit(hasBlocker ? 1 : 0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    }
  });

program.parse();