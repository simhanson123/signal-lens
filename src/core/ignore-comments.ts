import type { Evidence } from "./types.js";

export interface IgnoreCommentResult {
  lineSuppressions: Set<string>;
  disabledFiles: Set<string>;
}

type IgnoreCommand = "ignore-next-line" | "disable-file" | "enable-file" | null;

function classifyIgnoreComment(text: string): IgnoreCommand {
  if (
    text.includes("signal-lens-ignore-next-line") ||
    text.includes("signal-lens-disable-next-line") ||
    text.includes("signal-lens-ignore")
  ) {
    return "ignore-next-line";
  }
  if (text.includes("signal-lens-enable")) {
    return "enable-file";
  }
  if (text.includes("signal-lens-disable")) {
    return "disable-file";
  }
  return null;
}

export function parseIgnoreComments(diff: string): IgnoreCommentResult {
  const lineSuppressions = new Set<string>();
  const disabledFiles = new Set<string>();

  let currentFile = "";
  let newLineNumber = 0;
  let pendingIgnore = false;
  let fileDisabled = false;

  const lines = diff.split("\n");

  for (const rawLine of lines) {
    if (rawLine.startsWith("+++ b/")) {
      if (fileDisabled && currentFile) {
        disabledFiles.add(currentFile);
      }
      currentFile = rawLine.slice(6);
      pendingIgnore = false;
      fileDisabled = false;
      continue;
    }

    if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/\+(\d+)/);
      newLineNumber = match ? parseInt(match[1], 10) : 0;
      pendingIgnore = false;
      continue;
    }

    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      continue;
    }

    const isAdded = rawLine.startsWith("+") && !rawLine.startsWith("+++");
    const content = isAdded ? rawLine.slice(1) : rawLine;
    const thisLineNumber = newLineNumber;
    newLineNumber++;

    if (pendingIgnore && currentFile && !fileDisabled) {
      lineSuppressions.add(`${currentFile}:${thisLineNumber}`);
    }
    pendingIgnore = false;

    if (fileDisabled && currentFile) {
      lineSuppressions.add(`${currentFile}:${thisLineNumber}`);
    }

    if (isAdded) {
      const cmd = classifyIgnoreComment(content);
      if (cmd === "ignore-next-line") {
        pendingIgnore = true;
      } else if (cmd === "disable-file") {
        fileDisabled = true;
      } else if (cmd === "enable-file") {
        fileDisabled = false;
      }
    }
  }

  if (fileDisabled && currentFile) {
    disabledFiles.add(currentFile);
  }

  return { lineSuppressions, disabledFiles };
}

export function filterByIgnoreComments<T extends { evidence: Evidence[] }>(
  findings: T[],
  diff: string
): T[] {
  const { lineSuppressions, disabledFiles } = parseIgnoreComments(diff);

  return findings.filter((f) => {
    const evidence = f.evidence?.[0];
    if (!evidence?.file) return true;

    if (disabledFiles.has(evidence.file)) return false;

    if (evidence.line != null) {
      if (lineSuppressions.has(`${evidence.file}:${evidence.line}`)) return false;
    }

    return true;
  });
}
