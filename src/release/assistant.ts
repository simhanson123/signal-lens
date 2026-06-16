import { execSync } from "node:child_process";

export interface MergedPr {
  number: number;
  title: string;
  author: string;
  labels: string[];
}

export interface ReleaseDraft {
  version: string;
  changelog: string;
  breakingChanges: string[];
  migrationNotes: string[];
}

export function listMergedPrs(
  repoRoot: string,
  sinceTag?: string
): MergedPr[] {
  try {
    const range = sinceTag ? `${sinceTag}..HEAD` : "HEAD~20..HEAD";
    const log = execSync(
      `git log ${range} --merges --pretty=format:"%s"`,
      { cwd: repoRoot, encoding: "utf-8" }
    ).trim();

    if (!log) return [];

    return log.split("\n").filter(Boolean).map((line, i) => {
      const match = line.match(/Merge pull request #(\d+) from .+/);
      return {
        number: match ? Number(match[1]) : i + 1,
        title: line,
        author: "unknown",
        labels: [],
      };
    });
  } catch {
    return [];
  }
}

export function draftReleaseNotes(
  version: string,
  prs: MergedPr[]
): ReleaseDraft {
  const changelog = prs.length
    ? prs.map((pr) => `- #${pr.number}: ${pr.title}`).join("\n")
    : "- No merged PRs found in range";

  const breakingChanges = prs
    .filter((pr) => /breaking|BREAKING/i.test(pr.title))
    .map((pr) => pr.title);

  return {
    version,
    changelog: `## ${version}\n\n${changelog}`,
    breakingChanges,
    migrationNotes: breakingChanges.length
      ? ["Review breaking changes listed above before upgrading."]
      : [],
  };
}