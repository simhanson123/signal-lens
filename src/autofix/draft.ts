import { loadReviewHistory } from "../memory/history.js";
import type { Finding } from "../core/types.js";

export interface FixDraft {
  findingId: string;
  finding: Finding | null;
  patch: string;
  message: string;
  requiresApproval: true;
}

export async function generateFixDraft(
  repoRoot: string,
  findingId: string
): Promise<FixDraft> {
  const history = loadReviewHistory(repoRoot, 5);
  let finding: Finding | null = null;

  for (const entry of history) {
    finding = entry.result.findings.find((f) => f.id === findingId) ?? null;
    if (finding) break;
  }

  if (!finding) {
    return {
      findingId,
      finding: null,
      patch: "",
      message: `Finding \`${findingId}\` not found in recent review history.`,
      requiresApproval: true,
    };
  }

  const patch = buildSuggestedPatch(finding);

  return {
    findingId,
    finding,
    patch,
    message: [
      `### Fix draft for \`${findingId}\` (requires maintainer approval)`,
      "",
      `**${finding.title}**`,
      "",
      finding.suggestedAction,
      "",
      "**Proposed patch:**",
      "```diff",
      patch,
      "```",
      "",
      "> This patch is a draft only. Apply manually after review.",
    ].join("\n"),
    requiresApproval: true,
  };
}

function buildSuggestedPatch(finding: Finding): string {
  const ev = finding.evidence[0];
  if (!ev?.snippet) {
    return `# Manual fix required in ${ev?.file ?? "unknown file"}\n# ${finding.suggestedAction}`;
  }

  const file = ev.file;
  const line = ev.line ?? 1;
  return [
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -${line},1 +${line},1 @@`,
    `-${ev.snippet}`,
    `+// TODO: ${finding.suggestedAction}`,
  ].join("\n");
}