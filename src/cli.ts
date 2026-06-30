#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { loadConfig } from "./config/loader.js";
import { writeOutput } from "./core/reporter.js";
import { detectDefaultBranch } from "./core/git-default-branch.js";
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
import { postInlineReviewComments } from "./github/inline-comments.js";
import { applyReviewLabels } from "./github/labeler.js";
import { sendNotification, shouldNotify } from "./notifications/webhook.js";
import { computeTrends, formatTrendsMarkdown, formatTrendsJson } from "./core/trends.js";
import { loadReviewHistory } from "./memory/history.js";
import { loadFeedback } from "./memory/feedback.js";
import { buildCapabilitiesReport } from "./capabilities.js";
import { runReview } from "./orchestrator/review.js";
import { VERSION } from "./core/version.js";

const program = new Command();

program.name("signal-lens").description("Signal Lens — context-first maintainer PR review").version(VERSION);

program
  .command("review")
  .description("Review changes between base and head refs")
  .option("--base <ref>", "Base git ref (default: auto-detected default branch)")
  .option("--head <ref>", "Head git ref", "HEAD")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output <format>", "markdown|json|sarif|both|all|walkthrough", "markdown")
  .option("-f, --output-file <path>", "Write output to file")
  .option("--static-only", "Skip AI review")
  .option("--incremental", "Only review files changed since last review")
  .option("--pr <number>", "GitHub PR number for enriched metadata", (v) => Number(v))
  .option("--owner <owner>", "GitHub owner (with --pr)")
  .option("--github-repo <repo>", "GitHub repo name (with --pr)")
  .option("--post-inline", "Post inline PR comments for findings with file+line evidence")
  .option("--max-inline <n>", "Max inline comments to post", (v) => Number(v))
  .option("--apply-labels", "Apply signal-lens labels to the PR (requires --pr)")
  .option("--notify <url>", "Send finding summary to a Slack/Discord webhook URL")
  .action(async (opts) => {
    const format = opts.output as "markdown" | "json" | "sarif" | "both" | "all" | "walkthrough";
    const base = opts.base ?? detectDefaultBranch(opts.repo);
    const head = opts.head;
    const result = await runReview({
      base,
      head,
      repoRoot: opts.repo,
      output: format,
      outputFile: opts.outputFile,
      noAi: opts.staticOnly,
      incremental: opts.incremental,
      pr:
        opts.pr && opts.owner && opts.githubRepo
          ? { owner: opts.owner, repo: opts.githubRepo, pullNumber: opts.pr }
          : undefined,
    });

    const out = writeOutput(result, format, opts.outputFile);
    if (!opts.outputFile) {
      if (out.walkthrough) console.log(out.walkthrough);
      if (out.markdown) console.log(out.markdown);
      if (out.json && (format === "json" || format === "both" || format === "all")) console.log(out.json);
      if (out.sarif) console.log(out.sarif);
    }

    if (opts.postInline && opts.pr && opts.owner && opts.githubRepo) {
      const commitSha = resolveCommitSha(opts.repo, opts.head);
      const inline = await postInlineReviewComments({
        owner: opts.owner,
        repo: opts.githubRepo,
        pullNumber: opts.pr,
        commitSha,
        findings: result.findings,
        maxComments: opts.maxInline,
      });
      console.error(
        JSON.stringify({ inlineComments: inline }, null, 2)
      );
    }

    if (opts.applyLabels && opts.pr && opts.owner && opts.githubRepo) {
      const labels = await applyReviewLabels({
        owner: opts.owner,
        repo: opts.githubRepo,
        prNumber: opts.pr,
        result,
      });
      console.error(JSON.stringify({ appliedLabels: labels }, null, 2));
    }

    const webhookUrl = opts.notify ?? process.env.SIGNAL_LENS_WEBHOOK_URL;
    if (webhookUrl && shouldNotify(result)) {
      try {
        await sendNotification(webhookUrl, result);
        console.error("  Webhook notification sent.");
      } catch (err) {
        console.error(`  Webhook notification failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const hasBlocker = result.findings.some((f) => f.severity === "blocker");
    if (hasBlocker) {
      console.error("\n  signal-lens found blocker-level findings — review before merging.\n");
    }
    process.exit(hasBlocker ? 1 : 0);
  });

program
  .command("index")
  .description("Tree-sitter symbol index + import graph")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output-file <path>", "Write index JSON to file")
  .action(async (opts) => {
    await initTreeSitter();
    const files = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.jsx" "*.py" "*.go" "*.rs" "*.java"', {
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
  .description("Start optional MCP server for tool/resource access (stdio)")
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
      console.error("No /signal-lens command found in body");
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
  .command("init")
  .description("Create a .signal-lens.yml configuration file with sensible defaults")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("--force", "Overwrite existing .signal-lens.yml")
  .action((opts) => {
    const configPath = resolve(opts.repo, ".signal-lens.yml");
    if (existsSync(configPath) && !opts.force) {
      console.error(`.signal-lens.yml already exists at ${configPath}. Use --force to overwrite.`);
      process.exit(1);
    }
    writeFileSync(configPath, CONFIG_TEMPLATE, "utf-8");
    console.log(`Created ${configPath}`);
    console.log("Edit it to customize analyzers, rules, and AI provider settings.");
    console.log("Docs: https://github.com/simhanson123/signal-lens/blob/main/docs/configuration.md");
  });

program
  .command("config")
  .description("Show the resolved configuration for this repository")
  .option("--repo <path>", "Repository root", process.cwd())
  .action((opts) => {
    const config = loadConfig(opts.repo);
    console.log(JSON.stringify(config, null, 2));
  });

program
  .command("providers")
  .description("List AI providers and availability")
  .action(() => console.log(JSON.stringify(listProviders(), null, 2)));

program
  .command("capabilities")
  .description("Report CLI/MCP availability and routing hints for agents")
  .option("--repo <path>", "Repository root", process.cwd())
  .action((opts) => console.log(JSON.stringify(buildCapabilitiesReport(opts.repo), null, 2)));

program
  .command("post-inline")
  .description("Post inline review comments on a GitHub PR")
  .requiredOption("--owner <owner>", "GitHub owner")
  .requiredOption("--github-repo <repo>", "GitHub repo name")
  .requiredOption("--pr <number>", "Pull request number", (v) => Number(v))
  .requiredOption("--commit <sha>", "Head commit SHA for the PR")
  .option("-f, --report-file <path>", "Review JSON report file")
  .option("--max-inline <n>", "Max inline comments to post", (v) => Number(v))
  .action(async (opts) => {
    const result = await postInlineReviewComments({
      owner: opts.owner,
      repo: opts.githubRepo,
      pullNumber: opts.pr,
      commitSha: opts.commit,
      reportFile: opts.reportFile,
      maxComments: opts.maxInline,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 0 && result.posted === 0 ? 1 : 0);
  });

program
  .command("label")
  .description("Apply signal-lens labels to a GitHub PR based on review findings")
  .requiredOption("--owner <owner>", "GitHub owner")
  .requiredOption("--github-repo <repo>", "GitHub repo name")
  .requiredOption("--pr <number>", "Pull request number", (v) => Number(v))
  .requiredOption("-f, --report-file <path>", "Review JSON report file")
  .action(async (opts) => {
    const labels = await applyReviewLabels({
      owner: opts.owner,
      repo: opts.githubRepo,
      prNumber: opts.pr,
      reportFile: opts.reportFile,
    });
    console.log(JSON.stringify({ appliedLabels: labels }, null, 2));
  });

program
  .command("trends")
  .description("Show review quality trends from review history")
  .option("--repo <path>", "Repository root", process.cwd())
  .option("-o, --output <format>", "markdown|json", "markdown")
  .option("--limit <n>", "Number of recent reviews to analyze", (v) => Number(v))
  .action((opts) => {
    const limit = opts.limit ?? 50;
    const history = loadReviewHistory(opts.repo, limit);
    const feedback = loadFeedback(opts.repo);
    const report = computeTrends(history, feedback);

    if (opts.output === "json") {
      console.log(formatTrendsJson(report));
    } else {
      console.log(formatTrendsMarkdown(report));
    }
  });

function resolveCommitSha(repoRoot: string, ref: string): string {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref;
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: repoRoot, encoding: "utf-8" }).trim();
  } catch {
    return ref;
  }
}

const CONFIG_TEMPLATE = `# Signal Lens configuration
# Docs: https://github.com/simhanson123/signal-lens/blob/main/docs/configuration.md

version: 1

ai:
  enabled: true
  provider: auto          # auto | openai | anthropic | ollama | mock
  model: gpt-4o-mini
  perspectives:           # What aspects the AI reviewer focuses on
    - security
    - architecture
    - correctness
  # ollama:                # Uncomment for local AI (no API key needed)
  #   baseUrl: http://localhost:11434

analyzers:
  ci-weakening: true       # Detects continue-on-error, removed tests, coverage drops
  duplicate-utility: true  # Finds functions that duplicate existing symbols
  security-boundary: true  # Checks for injection, hardcoded secrets, permission issues
  injection: true          # Detects SQL/path/command injection, unsafe deserialization
  secret-entropy: true     # Flags high-entropy strings in key-like variable names
  test-coverage: true      # Warns when source changes lack test updates
  dependency-vuln: auto    # Checks new deps against OSV database (auto = network-dependent)
  ai-review: auto          # true | false | auto (runs only if a provider key is set)

rules:
  architecture: []
  # Project-specific rules passed to the AI reviewer, e.g.:
  # - "All API routes must go through src/middleware/auth.ts"
  # - "Never use 'any' type — use 'unknown' and narrow"
  custom: []
  # Custom static rules (regex patterns matched against added lines):
  # - id: no-console-log
  #   pattern: "console\\.log"
  #   severity: low
  #   message: "Avoid console.log in production code"
  #   paths: ["src/**/*.ts"]
  # - id: no-eval
  #   pattern: "\\beval\\s*\\("
  #   severity: high
  #   message: "eval() is dangerous"

ignore:
  paths:
    - node_modules/**
    - dist/**
    - coverage/**
`;

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    process.exit(err.exitCode);
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  signal-lens encountered an error:\n  ${message}\n`);
  console.error("  For help: signal-lens --help");
  console.error("  Troubleshooting: docs/troubleshooting.md\n");
  process.exit(1);
});