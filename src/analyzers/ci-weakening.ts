import type { Analyzer, DiffContext, Finding } from "../core/types.js";
import { stableFindingId } from "../core/finding-id.js";

const WEAKENING_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  reason: string;
  severity: Finding["severity"];
  action: string;
  removedOnly?: boolean;
}> = [
  {
    pattern: /continue-on-error:\s*true/i,
    title: "CI step set to continue on error",
    reason:
      "A workflow step allows failures without blocking the pipeline, which can hide regressions in agent-generated PRs.",
    severity: "high",
    action: "Remove continue-on-error or scope it to non-critical steps with documented justification.",
  },
  {
    pattern: /fail-fast:\s*false/i,
    title: "CI fail-fast disabled",
    reason: "Disabling fail-fast lets subsequent jobs run after an early failure, masking root causes.",
    severity: "medium",
    action: "Re-enable fail-fast unless parallel matrix jobs require independent completion.",
  },
  {
    pattern: /coverageThreshold|coverage.*threshold|minCoverage/i,
    title: "Coverage threshold configuration changed",
    reason: "Coverage threshold changes may weaken quality gates that catch untested agent-generated code.",
    severity: "high",
    action: "Verify threshold changes are intentional and not lowering minimum coverage requirements.",
  },
  {
    pattern: /(threshold|minimum).*(lower|decrease|reduce|0\.\d+)/i,
    title: "Possible coverage or quality threshold reduction",
    reason: "Diff suggests lowering a numeric threshold that may weaken CI enforcement.",
    severity: "medium",
    action: "Confirm the new threshold still meets project quality standards.",
  },
  {
    pattern: /(?:run:\s*)?(npm test|yarn test|pnpm test|pytest|go test|cargo test)/i,
    title: "Test command removed from CI",
    reason: "Removing a test invocation from CI reduces automated verification coverage.",
    severity: "blocker",
    action: "Restore the test step or document why tests moved to another job.",
    removedOnly: true,
  },
  {
    pattern: /(?:run:\s*)?(eslint|prettier|ruff|clippy|golangci-lint)/i,
    title: "Lint step removed from CI",
    reason: "Removing lint checks allows style and static analysis regressions to merge undetected.",
    severity: "high",
    action: "Restore lint step or ensure equivalent checks run elsewhere.",
    removedOnly: true,
  },
  {
    pattern: /if:\s*false/i,
    title: "CI step unconditionally skipped",
    reason: "A workflow step is permanently disabled via if: false, effectively weakening CI.",
    severity: "high",
    action: "Remove the disabled step or replace with a valid conditional.",
  },
  {
    pattern: /allow_failure:\s*true/i,
    title: "GitLab-style allow_failure enabled",
    reason: "Jobs marked allow_failure do not block merges on failure.",
    severity: "high",
    action: "Disable allow_failure for critical verification jobs.",
  },
];

function extractChangedLines(
  diff: string,
  filePath: string,
  type: "added" | "removed"
): string[] {
  const lines: string[] = [];
  const prefix = type === "added" ? "+" : "-";
  const skipPrefix = type === "added" ? "+++" : "---";
  const fileBlocks = diff.split(/^diff --git /m).slice(1);

  for (const block of fileBlocks) {
    if (!block.includes(filePath)) continue;

    for (const line of block.split("\n")) {
      if (line.startsWith(prefix) && !line.startsWith(skipPrefix)) {
        lines.push(line.slice(1));
      }
    }
  }

  return lines;
}

export const ciWeakeningAnalyzer: Analyzer = {
  name: "ci-weakening",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const ciFiles = context.changedFiles.filter((f) => f.category === "ci");

    for (const file of ciFiles) {
      const addedLines = extractChangedLines(context.diff, file.path, "added");
      const removedLines = extractChangedLines(context.diff, file.path, "removed");

      const lineSets: Array<{ lines: string[]; removed: boolean }> = [
        { lines: addedLines, removed: false },
        { lines: removedLines, removed: true },
      ];

      for (const { lines, removed } of lineSets) {
        for (const line of lines) {
          for (const rule of WEAKENING_PATTERNS) {
            if (rule.removedOnly && !removed) continue;
            if (!rule.removedOnly && removed) continue;
            if (!rule.pattern.test(line)) continue;

            findings.push({
            id: stableFindingId("ci", rule.title, file.path, line.trim()),
            severity: rule.severity,
            category: "ci-weakening",
            title: rule.title,
            reason: rule.reason,
            evidence: [
              {
                file: file.path,
                snippet: line.trim(),
                relatedConfig: "CI/workflow configuration",
              },
            ],
            suggestedAction: rule.action,
            confidence: 0.85,
            repro: `git diff ${context.base}...${context.head} -- ${file.path}`,
            });
          }
        }
      }
    }

    return findings;
  },
};