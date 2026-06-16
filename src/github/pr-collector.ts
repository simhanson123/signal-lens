import { createOctokit } from "./client.js";

export interface PrMetadata {
  number?: number;
  title?: string;
  body?: string;
  author?: string;
  labels: string[];
  baseSha: string;
  headSha: string;
  ciStatus?: "success" | "failure" | "pending" | "unknown";
  url?: string;
}

export async function collectPrMetadata(options: {
  owner: string;
  repo: string;
  pullNumber: number;
  token?: string;
}): Promise<PrMetadata | null> {
  const octokit = createOctokit(options.token);
  if (!octokit) return null;

  const { data: pr } = await octokit.pulls.get({
    owner: options.owner,
    repo: options.repo,
    pull_number: options.pullNumber,
  });

  let ciStatus: PrMetadata["ciStatus"] = "unknown";
  try {
    const { data: checks } = await octokit.checks.listForRef({
      owner: options.owner,
      repo: options.repo,
      ref: pr.head.sha,
    });
    if (checks.check_runs.length === 0) {
      ciStatus = "unknown";
    } else if (checks.check_runs.every((c) => c.status === "completed" && c.conclusion === "success")) {
      ciStatus = "success";
    } else if (checks.check_runs.some((c) => c.conclusion === "failure")) {
      ciStatus = "failure";
    } else {
      ciStatus = "pending";
    }
  } catch {
    ciStatus = "unknown";
  }

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? "",
    author: pr.user?.login,
    labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
    ciStatus,
    url: pr.html_url,
  };
}

export function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}