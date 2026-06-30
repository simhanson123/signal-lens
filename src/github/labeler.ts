import type { Octokit } from "@octokit/rest";
import { createOctokit } from "./client.js";
import type { ReviewResult } from "../core/types.js";

const LABEL_PREFIX = "signal-lens:";

export const LABELS = {
  blocker: `${LABEL_PREFIX}blocker`,
  security: `${LABEL_PREFIX}security`,
  ci: `${LABEL_PREFIX}ci`,
  testGap: `${LABEL_PREFIX}test-gap`,
  custom: `${LABEL_PREFIX}custom`,
  clean: `${LABEL_PREFIX}clean`,
} as const;

export function computeLabels(result: ReviewResult): string[] {
  const labels = new Set<string>();

  for (const f of result.findings) {
    if (f.severity === "blocker") labels.add(LABELS.blocker);

    if (f.category === "security-boundary" || f.category === "injection" || f.category === "secret-entropy") {
      labels.add(LABELS.security);
    }
    if (f.category === "ci-weakening") {
      labels.add(LABELS.ci);
    }
    if (f.category === "test-coverage") {
      labels.add(LABELS.testGap);
    }
    if (f.category === "custom-rule") {
      labels.add(LABELS.custom);
    }
  }

  if (labels.size === 0) {
    labels.add(LABELS.clean);
  }

  return [...labels];
}

export async function applyLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  labels: string[]
): Promise<void> {
  const { data: existing } = await octokit.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number: prNumber,
  });

  const existingNames = new Set(existing.map((l) => l.name));

  for (const label of existing) {
    if (label.name.startsWith(LABEL_PREFIX) && !labels.includes(label.name)) {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: label.name,
      });
    }
  }

  const toAdd = labels.filter((l) => !existingNames.has(l));
  if (toAdd.length > 0) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: toAdd,
    });
  }
}

export interface LabelOptions {
  owner: string;
  repo: string;
  prNumber: number;
  result?: ReviewResult;
  reportFile?: string;
  token?: string;
}

export async function applyReviewLabels(options: LabelOptions): Promise<string[]> {
  const octokit = createOctokit(options.token);
  if (!octokit) {
    throw new Error("No GitHub token (GITHUB_TOKEN or GH_TOKEN required for labeling)");
  }

  let result = options.result;
  if (!result && options.reportFile) {
    const { readFileSync } = await import("node:fs");
    result = JSON.parse(readFileSync(options.reportFile, "utf-8")) as ReviewResult;
  }
  if (!result) {
    throw new Error("Either result or reportFile must be provided");
  }

  const labels = computeLabels(result);
  await applyLabels(octokit, options.owner, options.repo, options.prNumber, labels);
  return labels;
}
