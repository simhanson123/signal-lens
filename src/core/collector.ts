import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ChangedFile, DiffContext } from "./types.js";
import { classifyFile } from "./classifier.js";

function runGit(args: string[], cwd: string): string {
  return execSync(`git ${args.join(" ")}`, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function parseNumstat(repoRoot: string, base: string, head: string): ChangedFile[] {
  const output = runGit(["diff", "--numstat", `${base}...${head}`], repoRoot);
  if (!output) return [];

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, path] = line.split("\t");
      const status: ChangedFile["status"] =
        additions === "-" && deletions === "-" ? "modified" : "modified";

      return {
        path,
        status,
        category: classifyFile(path),
        additions: additions === "-" ? 0 : Number(additions),
        deletions: deletions === "-" ? 0 : Number(deletions),
      };
    });
}

function parseNameStatus(repoRoot: string, base: string, head: string): Map<string, ChangedFile["status"]> {
  const output = runGit(["diff", "--name-status", `${base}...${head}`], repoRoot);
  const statusMap = new Map<string, ChangedFile["status"]>();

  if (!output) return statusMap;

  for (const line of output.split("\n").filter(Boolean)) {
    const [rawStatus, ...rest] = line.split("\t");
    const path = rest.length > 1 ? rest[1] : rest[0];
    const statusChar = rawStatus[0];

    let status: ChangedFile["status"] = "modified";
    if (statusChar === "A") status = "added";
    else if (statusChar === "D") status = "deleted";
    else if (statusChar === "R") status = "renamed";

    statusMap.set(path, status);
  }

  return statusMap;
}

export function collectDiff(options: {
  base: string;
  head: string;
  repoRoot?: string;
}): DiffContext {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());

  if (!existsSync(resolve(repoRoot, ".git"))) {
    throw new Error(`Not a git repository: ${repoRoot}`);
  }

  const base = options.base;
  const head = options.head;

  const diff = runGit(["diff", `${base}...${head}`], repoRoot);
  const numstatFiles = parseNumstat(repoRoot, base, head);
  const statusMap = parseNameStatus(repoRoot, base, head);

  const changedFiles = numstatFiles.map((file) => ({
    ...file,
    status: statusMap.get(file.path) ?? file.status,
    category: classifyFile(file.path),
  }));

  const fileCount = changedFiles.length;
  const totalAdditions = changedFiles.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = changedFiles.reduce((sum, f) => sum + f.deletions, 0);

  const summary = `${fileCount} file(s) changed, +${totalAdditions}/-${totalDeletions} lines`;

  return {
    base,
    head,
    repoRoot,
    changedFiles,
    diff,
    summary,
  };
}