import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { collectPrMetadata } from "../github/pr-collector.js";
import { isIgnored } from "../utils/glob.js";
import type { ChangedFile, DiffContext, PrContext } from "./types.js";
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
      return {
        path,
        status: "modified" as ChangedFile["status"],
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
  ignorePaths?: string[];
}): DiffContext {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  if (!existsSync(resolve(repoRoot, ".git"))) {
    throw new Error(`Not a git repository: ${repoRoot}`);
  }

  const base = options.base;
  const head = options.head;
  const diff = runGit(["diff", `${base}...${head}`], repoRoot);
  const statusMap = parseNameStatus(repoRoot, base, head);

  let changedFiles = parseNumstat(repoRoot, base, head).map((file) => ({
    ...file,
    status: statusMap.get(file.path) ?? file.status,
    category: classifyFile(file.path),
  }));

  if (options.ignorePaths?.length) {
    changedFiles = changedFiles.filter((f) => !isIgnored(f.path, options.ignorePaths!));
  }

  const fileCount = changedFiles.length;
  const totalAdditions = changedFiles.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = changedFiles.reduce((sum, f) => sum + f.deletions, 0);

  return {
    base,
    head,
    repoRoot,
    changedFiles,
    diff,
    summary: `${fileCount} file(s) changed, +${totalAdditions}/-${totalDeletions} lines`,
  };
}

export async function collectDiffWithPr(options: {
  base: string;
  head: string;
  repoRoot?: string;
  ignorePaths?: string[];
  pr: { owner: string; repo: string; pullNumber: number; token?: string };
}): Promise<{ context: DiffContext; prContext?: PrContext }> {
  const context = collectDiff(options);
  const meta = await collectPrMetadata({
    owner: options.pr.owner,
    repo: options.pr.repo,
    pullNumber: options.pr.pullNumber,
    token: options.pr.token,
  });

  if (!meta) return { context };

  const prContext: PrContext = {
    number: meta.number,
    title: meta.title,
    body: meta.body,
    author: meta.author,
    labels: meta.labels,
    ciStatus: meta.ciStatus,
    url: meta.url,
  };

  if (meta.baseSha) context.base = meta.baseSha;
  if (meta.headSha) context.head = meta.headSha;

  return { context, prContext };
}