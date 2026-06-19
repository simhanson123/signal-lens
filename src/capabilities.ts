import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { listProviders } from "./providers/registry.js";

export const MCP_TOOLS = [
  "review_pr",
  "scan_ci_weakening",
  "find_duplicate_utility",
  "trace_security_boundary",
  "scan_test_coverage",
  "record_feedback",
  "draft_release_notes",
] as const;

export const MCP_RESOURCES = [
  "repo://summary",
  "repo://symbols/{name}",
  "repo://architecture/rules",
  "repo://reviews/history",
  "repo://release/current",
] as const;

export interface CapabilitiesReport {
  version: string;
  cli: {
    available: boolean;
    resolvedPath: string | null;
    repoRoot: string;
    isGitRepo: boolean;
  };
  mcp: {
    serverCommand: string;
    tools: readonly string[];
    resources: readonly string[];
    hostConnected: "unknown";
  };
  routing: {
    prefer: "mcp-when-connected";
    forAgent: string;
    cliFallback: string;
    detection: string;
  };
  providers: ReturnType<typeof listProviders>;
}

export function resolveCliPath(repoRoot: string): string | null {
  try {
    const which = process.platform === "win32" ? "where signal-lens" : "command -v signal-lens";
    const path = execSync(which, { encoding: "utf-8" }).trim().split("\n")[0];
    if (path) return path;
  } catch {
    /* continue */
  }

  const localBin = resolve(repoRoot, "node_modules/.bin/signal-lens");
  if (existsSync(localBin)) return localBin;

  const distCli = resolve(repoRoot, "dist/cli.js");
  if (existsSync(distCli)) return `node ${distCli}`;

  let dir = repoRoot;
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, "dist/cli.js");
    if (existsSync(candidate)) return `node ${candidate}`;
    dir = resolve(dir, "..");
  }

  return null;
}

export function buildCapabilitiesReport(repoRoot = process.cwd()): CapabilitiesReport {
  const cliPath = resolveCliPath(repoRoot);
  let isGitRepo = false;
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: repoRoot, stdio: "ignore" });
    isGitRepo = true;
  } catch {
    isGitRepo = false;
  }

  const skillScript = "bash <skill-dir>/scripts/run-review.sh --static-only";

  return {
    version: "2.0.0",
    cli: {
      available: cliPath !== null,
      resolvedPath: cliPath,
      repoRoot,
      isGitRepo,
    },
    mcp: {
      serverCommand: "signal-lens mcp",
      tools: MCP_TOOLS,
      resources: MCP_RESOURCES,
      hostConnected: "unknown",
    },
    routing: {
      prefer: "mcp-when-connected",
      forAgent:
        "If MCP tools review_pr (or scan_ci_weakening) appear in your available tools, use MCP. " +
        "Otherwise run the CLI via run-review.sh or signal-lens review.",
      cliFallback: `signal-lens review --base main --head HEAD --static-only --output json`,
      detection:
        `Check your tool list for: ${MCP_TOOLS.slice(0, 4).join(", ")}. ` +
        "Present = MCP path. Absent = CLI path.",
    },
    providers: listProviders(),
  };
}