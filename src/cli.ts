#!/usr/bin/env node

import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { loadConfig } from "./config/loader.js";
import { writeOutput } from "./core/reporter.js";
import { startGitHubAppServer } from "./github/app.js";
import { parseGitHubRepo } from "./github/pr-collector.js";
import { executeSlashCommand, parseSlashCommand } from "./github/slash-commands.js";
import { buildImportGraph } from "./indexer/imports.js";
import { buildRepoSummary } from "./indexer/repo-summary.js";
import { indexAndPersistSymbols, initTreeSitter } from "./indexer/tree-sitter.js";
import { recordFeedback } from "./memory/feedback.js";
import { triageIssuesFromGitHub, triageIssueLocally } from "./issue/triage.js";
import { listProviders } from "./providers/registry.js";
import { draftReleaseNotes, getCurrentReleaseState, listMergedPrs } from "./release/assistant.js";
import { generateFixDraft } from "./autofix/draft.js";
import { startMcpServer } from "./mcp/server.js";
import { runReview } from "./orchestrator/review.js";

const program = new Command();

program.name("review-mcp").description("MCP-based AI PR review and maintainer automation agent").version("1.0.0");

program
  .command("review")
  .description("Review changes between base and head refs")
  .requiredOption("--base <ref>", "Base git ref")
  .requiredOption("--head <ref>", "Head git ref")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output <format>", "markdown|json|sarif|both|all", "markdown")
  .option("-f, --output-file <path>", "Write output to file")
  .option("--static-only", "Skip AI review")
  .option("--pr <number>", "GitHub PR number for enriched metadata", (v) => Number(v))
  .option("--owner <owner>", "GitHub owner (with --pr)")
  .option("--github-repo <repo>", "GitHub repo name (with --pr)")
  .action(async (opts) => {
    const format = opts.output as "markdown" | "json" | "sarif" | "both" | "all";
    const result = await runReview({
      base: opts.base,
      head: opts.head,
      repoRoot: opts.repo,
      output: format,
      outputFile: opts.outputFile,
      noAi: opts.staticOnly,
      pr:
        opts.pr && opts.owner && opts.githubRepo
          ? { owner: opts.owner, repo: opts.githubRepo, pullNumber: opts.pr }
          : undefined,
    });

    const out = writeOutput(result, format, opts.outputFile);
    if (!opts.outputFile) {
      if (out.markdown) console.log(out.markdown);
      if (out.json && (format === "json" || format === "both" || format === "all")) console.log(out.json);
      if (out.sarif) console.log(out.sarif);
    }

    process.exit(result.findings.some((f) => f.severity === "blocker") ? 1 : 0);
  });

program
  .command("index")
  .description("Tree-sitter symbol index + import graph")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output-file <path>", "Write index JSON to file")
  .action(async (opts) => {
    await initTreeSitter();
    const files = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.jsx" "*.py" "*.go"', {
      cwd: opts.repo,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const symbols = await indexAndPersistSymbols(opts.repo, files);
    const imports = buildImportGraph(opts.repo, files);
    const config = loadConfig(opts.repo);
    const payload = {
      summary: buildRepoSummary(opts.repo, config),
      symbols,
      symbolCount: symbols.length,
      importEdgeCount: [...imports.values()].reduce((n, v) => n + v.length, 0),
    };

    const json = JSON.stringify(payload, null, 2);
    if (opts.outputFile) writeFileSync(opts.outputFile, json, "utf-8");
    else console.log(json);
  });

program
  .command("mcp")
  .description("Start MCP Context Server (stdio)")
  .option("--repo <path>", "Repository root", process.cwd())
  .action(async (opts) => startMcpServer(opts.repo));

program
  .command("serve")
  .description("Start GitHub App webhook server")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("--port <port>", "Port", "3000")
  .action(async (opts) => startGitHubAppServer({ repoRoot: opts.repo, port: Number(opts.port) }));

program
  .command("feedback")
  .description("Record maintainer feedback")
  .requiredOption("--finding-id <id>", "Finding ID")
  .requiredOption("--type <type>", "false-positive|accepted|ignored-rule")
  .option("--reason <reason>", "Optional reason")
  .option("--repo <path>", "Repository root", process.cwd())
  .action((opts) => {
    const entry = recordFeedback(opts.repo, {
      findingId: opts.findingId,
      type: opts.type,
      reason: opts.reason,
      recordedBy: "cli",
    });
    console.log(JSON.stringify(entry, null, 2));
  });

program
  .command("release")
  .description("Draft release notes from merged PRs")
  .option("--version <version>", "Release version", "unreleased")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output-file <path>", "Write changelog to file")
  .action((opts) => {
    const prs = listMergedPrs(opts.repo);
    const draft = draftReleaseNotes(opts.version, prs);
    const state = getCurrentReleaseState(opts.repo);
    const output = `${draft.changelog}\n\n<!-- latest tag: ${state.latestTag ?? "none"}, unreleased commits: ${state.unreleasedCommits} -->`;
    if (opts.outputFile) writeFileSync(opts.outputFile, output, "utf-8");
    else console.log(output);
  });

program
  .command("triage")
  .description("Triage open GitHub issues")
  .option("--owner <owner>", "GitHub owner")
  .option("--github-repo <repo>", "GitHub repo")
  .option("--repo <path>", "Local repo root", process.cwd())
  .option("--title <title>", "Triage a single issue locally")
  .option("--body <body>", "Issue body for local triage")
  .action(async (opts) => {
    if (opts.title) {
      const result = triageIssueLocally({
        number: 1,
        title: opts.title,
        body: opts.body ?? "",
        labels: [],
        author: "local",
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!opts.owner || !opts.githubRepo) {
      console.error("Provide --owner and --github-repo, or --title for local triage");
      process.exit(2);
    }

    const results = await triageIssuesFromGitHub({
      owner: opts.owner,
      repo: opts.githubRepo,
    });
    console.log(JSON.stringify(results, null, 2));
  });

program
  .command("fix")
  .description("Generate auto-fix draft (requires approval)")
  .requiredOption("--finding-id <id>", "Finding ID")
  .option("--repo <path>", "Repository root", process.cwd())
  .action(async (opts) => {
    const draft = await generateFixDraft(opts.repo, opts.findingId);
    console.log(draft.message);
  });

program
  .command("slash")
  .description("Execute a slash command from comment body")
  .requiredOption("--body <text>", "Comment body")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("--base <ref>", "Base ref")
  .option("--head <ref>", "Head ref")
  .action(async (opts) => {
    const parsed = parseSlashCommand(opts.body);
    if (!parsed) {
      console.error("No /review-mcp command found in body");
      process.exit(2);
    }
    const response = await executeSlashCommand({
      command: parsed.command,
      args: parsed.args,
      repoRoot: opts.repo,
      base: opts.base,
      head: opts.head,
    });
    console.log(response.message);
  });

program
  .command("providers")
  .description("List AI providers and availability")
  .action(() => console.log(JSON.stringify(listProviders(), null, 2)));

program.parse();