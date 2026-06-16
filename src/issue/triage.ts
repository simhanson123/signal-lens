import MiniSearch from "minisearch";
import { createOctokit } from "../github/client.js";

export interface IssueInput {
  number: number;
  title: string;
  body: string;
  labels: string[];
  author: string;
}

export interface TriageResult {
  issueNumber: number;
  priority: "high" | "medium" | "low";
  suggestedLabels: string[];
  duplicateOf?: number;
  missingReproduction: boolean;
  summary: string;
  recommendedAction: string;
}

const REPRO_KEYWORDS = ["steps to reproduce", "reproduction", "expected", "actual", "stack trace", "error message"];

export function triageIssueLocally(issue: IssueInput, existingIssues: IssueInput[] = []): TriageResult {
  const bodyLower = (issue.body ?? "").toLowerCase();
  const missingReproduction = !REPRO_KEYWORDS.some((k) => bodyLower.includes(k));

  const priority: TriageResult["priority"] =
    /crash|security|data loss|blocker/i.test(issue.title + issue.body)
      ? "high"
      : /bug|error|fail/i.test(issue.title)
        ? "medium"
        : "low";

  const suggestedLabels: string[] = [];
  if (missingReproduction) suggestedLabels.push("needs-reproduction");
  if (/security|vulnerability|cve/i.test(issue.title + issue.body)) suggestedLabels.push("security");
  if (/feature|enhancement|request/i.test(issue.title)) suggestedLabels.push("enhancement");
  if (priority === "high") suggestedLabels.push("priority:high");

  let duplicateOf: number | undefined;
  if (existingIssues.length > 0) {
    const mini = new MiniSearch({
      fields: ["title", "body"],
      storeFields: ["number", "title"],
    });
    mini.addAll(
      existingIssues
        .filter((e) => e.number !== issue.number)
        .map((e) => ({ id: e.number, number: e.number, title: e.title, body: e.body }))
    );
    const results = mini.search(issue.title, { fuzzy: 0.3, prefix: true });
    if (results.length > 0 && results[0].score > 1) {
      duplicateOf = results[0].id as number;
      suggestedLabels.push("duplicate");
    }
  }

  const recommendedAction = missingReproduction
    ? "Request reproduction steps from the reporter."
    : duplicateOf
      ? `Close as duplicate of #${duplicateOf}.`
      : priority === "high"
        ? "Assign to maintainer for immediate review."
        : "Add to backlog and label appropriately.";

  return {
    issueNumber: issue.number,
    priority,
    suggestedLabels: [...new Set(suggestedLabels)],
    duplicateOf,
    missingReproduction,
    summary: `${priority.toUpperCase()} priority issue: ${issue.title}`,
    recommendedAction,
  };
}

export async function triageIssuesFromGitHub(options: {
  owner: string;
  repo: string;
  token?: string;
  limit?: number;
}): Promise<TriageResult[]> {
  const octokit = createOctokit(options.token);
  if (!octokit) return [];

  const { data: issues } = await octokit.issues.listForRepo({
    owner: options.owner,
    repo: options.repo,
    state: "open",
    per_page: options.limit ?? 20,
  });

  const inputs: IssueInput[] = issues
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? "",
      labels: i.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
      author: i.user?.login ?? "unknown",
    }));

  return inputs.map((issue) => triageIssueLocally(issue, inputs));
}