import { readFileSync } from "node:fs";
import { createOctokit } from "./client.js";
import type { Finding, ReviewResult } from "../core/types.js";

export interface InlineCommentOptions {
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  token?: string;
  findings?: Finding[];
  reportFile?: string;
  maxComments?: number;
}

export interface InlineCommentResult {
  posted: number;
  skipped: number;
  errors: string[];
}

export function findingsWithInlineTargets(findings: Finding[]): Finding[] {
  return findings.filter(
    (f) =>
      f.evidence.length > 0 &&
      f.evidence[0].file &&
      typeof f.evidence[0].line === "number" &&
      f.evidence[0].line! > 0
  );
}

export function formatInlineComment(finding: Finding): string {
  const badge = finding.severity.toUpperCase();
  return [
    `**[Signal Lens ${badge}]** ${finding.title}`,
    "",
    finding.reason,
    "",
    `**Suggested:** ${finding.suggestedAction}`,
    "",
    `_ID: \`${finding.id}\` · /signal-lens false-positive ${finding.id}_`,
  ].join("\n");
}

export async function postInlineReviewComments(
  options: InlineCommentOptions
): Promise<InlineCommentResult> {
  const octokit = createOctokit(options.token);
  if (!octokit) {
    return { posted: 0, skipped: 0, errors: ["No GitHub token (GITHUB_TOKEN)"] };
  }

  let findings = options.findings ?? [];
  if (options.reportFile) {
    const result = JSON.parse(readFileSync(options.reportFile, "utf-8")) as ReviewResult;
    findings = result.findings;
  }

  const targets = findingsWithInlineTargets(findings);
  const max = options.maxComments ?? 20;
  const batch = targets.slice(0, max);
  const skipped = targets.length - batch.length;

  const comments = batch.map((f) => ({
    path: f.evidence[0].file,
    line: f.evidence[0].line!,
    side: "RIGHT" as const,
    body: formatInlineComment(f),
  }));

  if (comments.length === 0) {
    return { posted: 0, skipped: findings.length, errors: ["No findings with file+line evidence"] };
  }

  const errors: string[] = [];

  try {
    await octokit.pulls.createReview({
      owner: options.owner,
      repo: options.repo,
      pull_number: options.pullNumber,
      commit_id: options.commitSha,
      event: "COMMENT",
      body: `## Signal Lens inline review\n\n${comments.length} inline comment(s) on specific lines.`,
      comments,
    });
    return { posted: comments.length, skipped, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));

    // Fallback: post individually (some lines may be outside diff)
    let posted = 0;
    for (const c of comments) {
      try {
        await octokit.pulls.createReview({
          owner: options.owner,
          repo: options.repo,
          pull_number: options.pullNumber,
          commit_id: options.commitSha,
          event: "COMMENT",
          comments: [c],
        });
        posted++;
      } catch (e) {
        errors.push(`${c.path}:${c.line} — ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { posted, skipped: skipped + (comments.length - posted), errors };
  }
}