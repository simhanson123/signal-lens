import { execSync } from "node:child_process";
import { createOctokit } from "../github/client.js";

export interface MergedPr {
  number: number;
  title: string;
  author: string;
  labels: string[];
  body?: string;
}

export interface ReleaseDraft {
  version: string;
  changelog: string;
  breakingChanges: string[];
  migrationNotes: string[];
}

export function listMergedPrs(repoRoot: string, sinceTag?: string): MergedPr[] {
  try {
    const range = sinceTag ? `${sinceTag}..HEAD` : "HEAD~30..HEAD";
    const log = execSync(`git log ${range} --merges --pretty=format:"%s|||%an"`, {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();

    if (!log) return [];

    return log.split("\n").filter(Boolean).map((line, i) => {
      const [subject, author] = line.split("|||");
      const match = subject.match(/Merge pull request #(\d+) from .+/);
      return {
        number: match ? Number(match[1]) : i + 1,
        title: subject,
        author: author ?? "unknown",
        labels: [],
      };
    });
  } catch {
    return [];
  }
}

export async function listMergedPrsFromGitHub(options: {
  owner: string;
  repo: string;
  token?: string;
  base?: string;
}): Promise<MergedPr[]> {
  const octokit = createOctokit(options.token);
  if (!octokit) return [];

  const { data } = await octokit.pulls.list({
    owner: options.owner,
    repo: options.repo,
    state: "closed",
    base: options.base,
    per_page: 50,
    sort: "updated",
    direction: "desc",
  });

  return data
    .filter((pr) => pr.merged_at)
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? "unknown",
      labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
      body: pr.body ?? undefined,
    }));
}

export function draftReleaseNotes(version: string, prs: MergedPr[]): ReleaseDraft {
  const features: string[] = [];
  const fixes: string[] = [];
  const breaking: string[] = [];

  for (const pr of prs) {
    const line = `- #${pr.number}: ${pr.title} (@${pr.author})`;
    if (/breaking|BREAKING/i.test(pr.title + (pr.body ?? ""))) {
      breaking.push(line);
    } else if (/fix|bug|patch/i.test(pr.title)) {
      fixes.push(line);
    } else {
      features.push(line);
    }
  }

  const sections: string[] = [`## ${version}`];
  if (breaking.length) sections.push("### Breaking Changes\n" + breaking.join("\n"));
  if (features.length) sections.push("### Features\n" + features.join("\n"));
  if (fixes.length) sections.push("### Fixes\n" + fixes.join("\n"));
  if (!breaking.length && !features.length && !fixes.length) {
    sections.push("- No merged PRs found in range");
  }

  return {
    version,
    changelog: sections.join("\n\n"),
    breakingChanges: breaking,
    migrationNotes: breaking.length
      ? ["Review breaking changes above. Update `.review-mcp.yml` and CI workflows if needed."]
      : [],
  };
}

export function getCurrentReleaseState(repoRoot: string): {
  latestTag?: string;
  unreleasedCommits: number;
} {
  try {
    const tag = execSync("git describe --tags --abbrev=0", {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    const count = execSync(`git rev-list ${tag}..HEAD --count`, {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    return { latestTag: tag, unreleasedCommits: Number(count) };
  } catch {
    return { unreleasedCommits: 0 };
  }
}