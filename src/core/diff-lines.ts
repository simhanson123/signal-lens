export interface AddedLine {
  file: string;
  lineNumber: number;
  content: string;
}

export function parseAddedLines(diff: string): AddedLine[] {
  const results: AddedLine[] = [];
  let currentFile = "";
  let newLineNumber = 0;

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6);
      continue;
    }
    if (rawLine.startsWith("---") || rawLine === "+++") {
      continue;
    }
    if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/\+(\d+)/);
      newLineNumber = match ? parseInt(match[1], 10) : 0;
      continue;
    }
    if (rawLine.startsWith("\\")) {
      continue;
    }
    if (rawLine.startsWith("-")) {
      continue;
    }
    if (rawLine.startsWith("+")) {
      results.push({
        file: currentFile,
        lineNumber: newLineNumber,
        content: rawLine.slice(1),
      });
    }
    newLineNumber++;
  }

  return results;
}
