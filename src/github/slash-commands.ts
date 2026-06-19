import { recordFeedback } from "../memory/feedback.js";
import { loadReviewHistory } from "../memory/history.js";
import { runReview } from "../orchestrator/review.js";
import { draftReleaseNotes, listMergedPrs } from "../release/assistant.js";
import { generateFixDraft } from "../autofix/draft.js";

export type SlashCommand =
  | "explain"
  | "false-positive"
  | "fix"
  | "release-notes"
  | "review";

export interface SlashCommandRequest {
  command: SlashCommand;
  args: string;
  repoRoot: string;
  prNumber?: number;
  base?: string;
  head?: string;
}

export interface SlashCommandResponse {
  command: SlashCommand;
  message: string;
  requiresApproval?: boolean;
}

const COMMAND_RE = /^\/signal-lens\s+(\S+)(?:\s+(.*))?$/i;

export function parseSlashCommand(body: string): { command: SlashCommand; args: string } | null {
  const line = body.trim().split("\n").find((l) => l.startsWith("/signal-lens"));
  if (!line) return null;

  const match = line.match(COMMAND_RE);
  if (!match) return null;

  const command = match[1].toLowerCase() as SlashCommand;
  const valid: SlashCommand[] = ["explain", "false-positive", "fix", "release-notes", "review"];
  if (!valid.includes(command)) return null;

  return { command, args: (match[2] ?? "").trim() };
}

export async function executeSlashCommand(
  req: SlashCommandRequest
): Promise<SlashCommandResponse> {
  switch (req.command) {
    case "review": {
      const base = req.base ?? "main";
      const head = req.head ?? "HEAD";
      const result = await runReview({ base, head, repoRoot: req.repoRoot });
      return {
        command: "review",
        message: `Review complete: ${result.findings.length} finding(s), ${result.findings.filter((f) => f.severity === "blocker").length} blocker(s).`,
      };
    }

    case "explain": {
      const history = loadReviewHistory(req.repoRoot, 1);
      if (history.length === 0) {
        return { command: "explain", message: "No prior review found. Run `/signal-lens review` first." };
      }
      const top = history[0].result.findings.slice(0, 5);
      const lines = top.map(
        (f) => `- **${f.severity}** ${f.title}: ${f.reason}\n  Evidence: ${f.evidence.map((e) => e.file).join(", ")}`
      );
      return {
        command: "explain",
        message: `### Top findings explained\n\n${lines.join("\n\n")}`,
      };
    }

    case "false-positive": {
      const findingId = req.args.split(/\s+/)[0];
      if (!findingId) {
        return { command: "false-positive", message: "Usage: `/signal-lens false-positive <finding-id> [reason]`" };
      }
      const reason = req.args.slice(findingId.length).trim() || undefined;
      recordFeedback(req.repoRoot, {
        findingId,
        type: "false-positive",
        reason,
        recordedBy: "slash-command",
      });
      return {
        command: "false-positive",
        message: `Recorded false-positive for \`${findingId}\`. Future reviews will suppress this finding.`,
      };
    }

    case "fix": {
      const findingId = req.args.split(/\s+/)[0];
      if (!findingId) {
        return { command: "fix", message: "Usage: `/signal-lens fix <finding-id>`" };
      }
      const draft = await generateFixDraft(req.repoRoot, findingId);
      return {
        command: "fix",
        message: draft.message,
        requiresApproval: true,
      };
    }

    case "release-notes": {
      const version = req.args || "unreleased";
      const prs = listMergedPrs(req.repoRoot);
      const draft = draftReleaseNotes(version, prs);
      return {
        command: "release-notes",
        message: draft.changelog,
      };
    }

    default:
      return { command: req.command, message: "Unknown command." };
  }
}